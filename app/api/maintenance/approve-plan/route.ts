import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovePlanRequest, ApprovePlanResponse } from '@/lib/maintenance/types';
import { computeDueDate } from '@/lib/maintenance/decisions';
import { generateWorkOrderSummary } from '@/lib/maintenance/llm';

/**
 * POST /api/maintenance/approve-plan
 *
 * Execute an approved maintenance plan:
 * - Create/link Property, Space, Occupier records
 * - Create WorkOrder
 * - Create Message records for drafts
 * - Create ScheduledAction records for follow-ups
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApprovePlanRequest = await request.json();
    const {
      rawEmailText,
      extracted,
      decisions,
      drafts,
      scheduledActions,
      overrides = {},
    } = body;

    // Validate required fields
    if (!extracted || !decisions || !drafts) {
      return NextResponse.json(
        { error: 'Missing required fields: extracted, decisions, drafts' },
        { status: 400 }
      );
    }

    // Apply overrides
    const finalDecisions = {
      ...decisions,
      assignedVendorId: overrides.vendorId ?? decisions.assignedVendorId,
      estimatedCost: overrides.estimatedCost ?? decisions.estimatedCost,
      maxApprovedCost: overrides.maxApprovedCost ?? decisions.maxApprovedCost,
      proposedVisitWindow: overrides.visitWindowStart && overrides.visitWindowEnd
        ? { start: overrides.visitWindowStart, end: overrides.visitWindowEnd }
        : decisions.proposedVisitWindow,
    };

    // Determine which scheduled actions to create
    const enabledActionTypes = overrides.enabledActionTypes ?? scheduledActions.map(a => a.actionType);
    const actionsToCreate = scheduledActions.filter(a =>
      enabledActionTypes.includes(a.actionType)
    );

    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Resolve or create Property
      let propertyId: string;
      let property = null;

      if (extracted.propertyName) {
        property = await tx.property.findFirst({
          where: {
            name: { contains: extracted.propertyName },
          },
        });
      }

      if (!property) {
        // Create new property with minimal data
        property = await tx.property.create({
          data: {
            name: extracted.propertyName || 'Unknown Property',
            address: 'Address pending',
            type: 'OTHER',
            timeZone: 'America/New_York',
            notes: 'Auto-created from maintenance email intake',
          },
        });
      }
      propertyId = property.id;

      // Step 2: Resolve or create Space
      let spaceId: string | null = null;

      if (extracted.spaceLabel) {
        let space = await tx.space.findFirst({
          where: {
            propertyId,
            spaceLabel: { contains: extracted.spaceLabel },
          },
        });

        if (!space) {
          space = await tx.space.create({
            data: {
              propertyId,
              spaceLabel: extracted.spaceLabel,
              notes: 'Auto-created from maintenance email intake',
            },
          });
        }
        spaceId = space.id;
      }

      // Step 3: Resolve or create Occupier
      let occupierId: string | null = null;

      if (extracted.occupierName && spaceId) {
        let occupier = await tx.occupier.findFirst({
          where: {
            spaceId,
            OR: [
              { brandName: { contains: extracted.occupierName } },
              { legalName: { contains: extracted.occupierName } },
            ],
          },
        });

        if (!occupier) {
          occupier = await tx.occupier.create({
            data: {
              spaceId,
              legalName: extracted.occupierName,
              brandName: extracted.occupierName,
              primaryContactEmail: extracted.occupierEmail,
              notes: 'Auto-created from maintenance email intake',
            },
          });
        }
        occupierId = occupier.id;
      }

      // Step 4: Generate summary
      const summary = await generateWorkOrderSummary(extracted);

      // Step 5: Compute due date
      const dueAt = computeDueDate(finalDecisions.slaHours);

      // Step 6: Create WorkOrder
      const workOrder = await tx.workOrder.create({
        data: {
          propertyId,
          spaceId,
          occupierId,
          assignedVendorId: finalDecisions.assignedVendorId,
          status: finalDecisions.assignedVendorId ? 'ASSIGNED' : 'NEW',
          priority: finalDecisions.priority,
          issueCategory: extracted.issueCategory,
          businessImpact: finalDecisions.businessImpact,
          summary,
          description: extracted.description,
          requiresOwnerApproval: finalDecisions.needsOwnerApproval,
          estimatedCost: finalDecisions.estimatedCost,
          maxApprovedCost: finalDecisions.maxApprovedCost,
          sourceEmailText: rawEmailText,
          dueAt,
        },
      });

      // Step 7: Create Message records for drafts
      const messagesToCreate = [
        {
          workOrderId: workOrder.id,
          recipientType: 'OCCUPIER',
          channel: 'EMAIL',
          subject: drafts.occupierAcknowledgement.subject,
          body: drafts.occupierAcknowledgement.body,
          status: 'SENT',
          sentAt: new Date(),
        },
        {
          workOrderId: workOrder.id,
          recipientType: 'VENDOR',
          channel: 'EMAIL',
          subject: drafts.vendorDispatch.subject,
          body: drafts.vendorDispatch.body,
          status: 'SENT',
          sentAt: new Date(),
        },
        {
          workOrderId: workOrder.id,
          recipientType: 'INTERNAL',
          channel: 'NOTE',
          subject: drafts.internalNote.subject,
          body: drafts.internalNote.body,
          status: 'SENT',
          sentAt: new Date(),
        },
      ];

      await tx.message.createMany({
        data: messagesToCreate,
      });

      // Step 8: Create ScheduledAction records
      const scheduledActionsToCreate = actionsToCreate.map((action) => ({
        workOrderId: workOrder.id,
        actionType: action.actionType,
        status: 'PENDING',
        scheduledFor: new Date(action.scheduledFor),
        payload: JSON.stringify(action.payload),
        description: action.description,
      }));

      if (scheduledActionsToCreate.length > 0) {
        await tx.scheduledAction.createMany({
          data: scheduledActionsToCreate,
        });
      }

      return {
        workOrderId: workOrder.id,
        propertyId,
        spaceId,
        occupierId,
        messagesCreated: messagesToCreate.length,
        scheduledActionsCreated: scheduledActionsToCreate.length,
      };
    });

    const response: ApprovePlanResponse = {
      success: true,
      ...result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error approving plan:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve plan',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
