import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  draftTenantCommunication,
  DraftCommunicationInput,
  CommunicationIntent,
} from '@/lib/tenantCommunications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intent, leaseId, documentId, additionalContext } = body;

    // Validate intent
    const validIntents: CommunicationIntent[] = [
      'RENEWAL_NOTICE',
      'RENEWAL_REMINDER',
      'RENT_ADJUSTMENT',
      'WORK_ORDER_UPDATE',
      'GENERAL_NOTICE',
    ];

    if (!intent || !validIntents.includes(intent)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing intent' },
        { status: 400 }
      );
    }

    // Build input for communication draft
    const input: DraftCommunicationInput = {
      intent,
      additionalContext,
    };

    // Load lease data if leaseId provided
    if (leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          property: {
            select: {
              name: true,
            },
          },
          documents: {
            where: {
              type: 'LEASE',
              status: 'EXTRACTED',
            },
            orderBy: {
              uploadedAt: 'desc',
            },
            take: 1,
            select: {
              extractedData: true,
            },
          },
        },
      });

      if (lease) {
        input.tenantName = lease.tenantName;
        input.propertyName = lease.property.name;
        input.suite = lease.suite || undefined;

        // Format lease end date
        if (lease.leaseEnd) {
          input.leaseEndDate = new Date(lease.leaseEnd).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }

        // Build lease summary
        const summaryParts: string[] = [];
        if (lease.baseRent) {
          summaryParts.push(`Monthly Rent: $${lease.baseRent.toLocaleString()}`);
        }
        if (lease.squareFeet) {
          summaryParts.push(`Square Feet: ${lease.squareFeet.toLocaleString()}`);
        }
        if (lease.leaseStart) {
          summaryParts.push(
            `Lease Start: ${new Date(lease.leaseStart).toLocaleDateString('en-US')}`
          );
        }

        // Add extracted data if available
        if (lease.documents.length > 0 && lease.documents[0].extractedData) {
          try {
            const extractedData = JSON.parse(lease.documents[0].extractedData);
            if (extractedData.renewalOptions) {
              summaryParts.push(`Renewal Options: ${extractedData.renewalOptions}`);
            }
            if (extractedData.rentEscalation) {
              summaryParts.push(`Rent Escalation: ${extractedData.rentEscalation}`);
            }
          } catch (e) {
            console.error('Error parsing extracted lease data:', e);
          }
        }

        if (summaryParts.length > 0) {
          input.leaseSummary = summaryParts.join('; ');
        }
      }
    }

    // Load document data if documentId provided
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          lease: {
            select: {
              tenantName: true,
            },
          },
          property: {
            select: {
              name: true,
            },
          },
        },
      });

      if (document) {
        // Override or set tenant/property from document if not already set
        if (!input.tenantName && document.lease) {
          input.tenantName = document.lease.tenantName;
        }
        if (!input.propertyName && document.property) {
          input.propertyName = document.property.name;
        }

        // Extract work order or invoice summary
        if (document.extractedData) {
          try {
            const extractedData = JSON.parse(document.extractedData);

            if (document.type === 'WORK_ORDER' && extractedData.workOrder) {
              const wo = extractedData.workOrder;
              const parts: string[] = [];
              if (wo.issueType) parts.push(`Issue: ${wo.issueType}`);
              if (wo.priority) parts.push(`Priority: ${wo.priority}`);
              if (wo.summary) parts.push(wo.summary);
              if (wo.affectedArea) parts.push(`Location: ${wo.affectedArea}`);

              input.workOrderSummary = parts.join(' | ');
            }

            if (document.type === 'INVOICE' && extractedData.invoice) {
              const inv = extractedData.invoice;
              const parts: string[] = [];
              if (inv.vendorName) parts.push(`Vendor: ${inv.vendorName}`);
              if (inv.invoiceNumber) parts.push(`Invoice #${inv.invoiceNumber}`);
              if (inv.totalAmount && inv.currency) {
                parts.push(`Amount: ${inv.currency} $${inv.totalAmount.toLocaleString()}`);
              }
              if (inv.dueDate) parts.push(`Due: ${inv.dueDate}`);

              input.invoiceSummary = parts.join(' | ');
            }
          } catch (e) {
            console.error('Error parsing extracted document data:', e);
          }
        }
      }
    }

    // Draft the communication
    const result = await draftTenantCommunication(input);

    return NextResponse.json({
      success: true,
      subject: result.subject,
      body: result.body,
    });
  } catch (error) {
    console.error('Error in draft communication route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
