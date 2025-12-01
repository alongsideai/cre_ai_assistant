import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractWorkOrderFromEmail, draftMaintenanceEmails, generateWorkOrderSummary } from '@/lib/maintenance/llm';
import {
  computeWorkOrderDecisions,
  generateScheduledActions,
  computeDueDate,
} from '@/lib/maintenance/decisions';
import { HandleEmailResponse } from '@/lib/maintenance/types';

/**
 * POST /api/maintenance/from-email
 *
 * Process a raw occupier email to extract work order details,
 * compute business decisions, generate drafts, and propose follow-ups.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rawEmailText } = body;

    // Validate input
    if (!rawEmailText || typeof rawEmailText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid rawEmailText' },
        { status: 400 }
      );
    }

    if (rawEmailText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Email text is too short' },
        { status: 400 }
      );
    }

    // Step 1: Extract work order details from email using LLM
    const extracted = await extractWorkOrderFromEmail(rawEmailText);

    // Step 2: Try to resolve entities from database
    let resolvedPropertyId: string | null = null;
    let resolvedSpaceId: string | null = null;
    let resolvedOccupierId: string | null = null;

    // Try to find property by name (case-insensitive)
    if (extracted.propertyName) {
      const property = await prisma.property.findFirst({
        where: {
          name: {
            contains: extracted.propertyName,
          },
        },
        select: { id: true, name: true, address: true, type: true, timeZone: true },
      });
      if (property) {
        resolvedPropertyId = property.id;
      }
    }

    // Try to find space by label within property
    if (extracted.spaceLabel) {
      const spaceQuery: { spaceLabel: { contains: string }; propertyId?: string } = {
        spaceLabel: {
          contains: extracted.spaceLabel,
        },
      };
      if (resolvedPropertyId) {
        spaceQuery.propertyId = resolvedPropertyId;
      }

      const space = await prisma.space.findFirst({
        where: spaceQuery,
        select: { id: true, propertyId: true, spaceLabel: true },
      });
      if (space) {
        resolvedSpaceId = space.id;
        // If we found a space but not property, use the space's property
        if (!resolvedPropertyId) {
          resolvedPropertyId = space.propertyId;
        }
      }
    }

    // Try to find occupier by name within space
    if (extracted.occupierName) {
      const occupierQuery: {
        OR: Array<{ brandName?: { contains: string }; legalName?: { contains: string } }>;
        spaceId?: string;
      } = {
        OR: [
          { brandName: { contains: extracted.occupierName } },
          { legalName: { contains: extracted.occupierName } },
        ],
      };
      if (resolvedSpaceId) {
        occupierQuery.spaceId = resolvedSpaceId;
      }

      const occupier = await prisma.occupier.findFirst({
        where: occupierQuery,
        include: {
          space: {
            select: { id: true, propertyId: true },
          },
        },
      });
      if (occupier) {
        resolvedOccupierId = occupier.id;
        // Resolve space and property from occupier if not already resolved
        if (!resolvedSpaceId) {
          resolvedSpaceId = occupier.spaceId;
        }
        if (!resolvedPropertyId) {
          resolvedPropertyId = occupier.space.propertyId;
        }
      }
    }

    // Get property timezone for calculations
    let timeZone = 'America/New_York';
    let propertyData = null;
    if (resolvedPropertyId) {
      propertyData = await prisma.property.findUnique({
        where: { id: resolvedPropertyId },
        select: { id: true, name: true, address: true, type: true, timeZone: true },
      });
      if (propertyData) {
        timeZone = propertyData.timeZone;
      }
    }

    // Step 3: Compute business decisions
    const decisions = await computeWorkOrderDecisions(extracted, timeZone);

    // Step 4: Get resolved entity details for drafts
    let spaceData = null;
    let occupierData = null;
    let vendorData = null;

    if (resolvedSpaceId) {
      spaceData = await prisma.space.findUnique({
        where: { id: resolvedSpaceId },
        select: { id: true, spaceLabel: true, floor: true, areaSqft: true, useType: true },
      });
    }

    if (resolvedOccupierId) {
      occupierData = await prisma.occupier.findUnique({
        where: { id: resolvedOccupierId },
        select: {
          id: true,
          legalName: true,
          brandName: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
        },
      });
    }

    if (decisions.assignedVendorId) {
      vendorData = await prisma.vendor.findUnique({
        where: { id: decisions.assignedVendorId },
        select: { id: true, name: true, trade: true, email: true, phone: true },
      });
    }

    // Step 5: Generate email drafts using LLM
    const drafts = await draftMaintenanceEmails({
      extracted,
      decisions,
      property: propertyData || undefined,
      space: spaceData || undefined,
      occupier: occupierData || undefined,
      vendor: vendorData,
    });

    // Step 6: Compute scheduled actions
    const dueAt = computeDueDate(decisions.slaHours);
    const scheduledActions = generateScheduledActions(
      decisions.priority,
      decisions.slaHours,
      dueAt,
      timeZone
    );

    // Build response with resolved entity data for display
    const response: HandleEmailResponse = {
      extracted,
      decisions,
      drafts,
      scheduledActions,
      resolvedEntities: {
        propertyId: resolvedPropertyId,
        spaceId: resolvedSpaceId,
        occupierId: resolvedOccupierId,
        vendorId: decisions.assignedVendorId,
      },
      // Include full entity data for Plan Review display
      resolvedEntityData: {
        property: propertyData ? {
          id: propertyData.id,
          name: propertyData.name,
          address: propertyData.address,
          type: propertyData.type,
          timeZone: propertyData.timeZone,
        } : null,
        space: spaceData ? {
          id: spaceData.id,
          propertyId: resolvedPropertyId!,
          spaceLabel: spaceData.spaceLabel,
          floor: spaceData.floor,
          areaSqft: spaceData.areaSqft,
          useType: spaceData.useType,
        } : null,
        occupier: occupierData ? {
          id: occupierData.id,
          spaceId: resolvedSpaceId!,
          legalName: occupierData.legalName,
          brandName: occupierData.brandName,
          primaryContactName: occupierData.primaryContactName,
          primaryContactEmail: occupierData.primaryContactEmail,
          primaryContactPhone: occupierData.primaryContactPhone,
        } : null,
        vendor: vendorData ? {
          id: vendorData.id,
          name: vendorData.name,
          trade: vendorData.trade,
          email: vendorData.email,
          phone: vendorData.phone,
        } : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing email:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
