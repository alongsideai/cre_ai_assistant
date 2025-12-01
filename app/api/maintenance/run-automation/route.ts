import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/maintenance/run-automation
 *
 * Processes all due ScheduledActions:
 * - Finds PENDING actions where scheduledFor <= now
 * - Creates appropriate Messages for each action
 * - Marks actions as EXECUTED
 */
export async function POST() {
  try {
    const now = new Date();

    // Find all pending actions that are due
    const dueActions = await prisma.scheduledAction.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        workOrder: {
          include: {
            property: true,
            space: true,
            occupier: true,
            vendor: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    if (dueActions.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending actions due at this time',
        results: [],
      });
    }

    const results: Array<{
      actionId: string;
      actionType: string;
      workOrderId: string;
      property: string;
      messageCreated: boolean;
      error?: string;
    }> = [];

    // Process each action
    for (const action of dueActions) {
      try {
        const payload = JSON.parse(action.payload || '{}');
        const wo = action.workOrder;

        // Generate appropriate message based on action type
        let messageData: {
          recipientType: string;
          channel: string;
          subject: string;
          body: string;
          meta: string;
        } | null = null;

        switch (action.actionType) {
          case 'VENDOR_FOLLOWUP':
            if (wo.vendor) {
              messageData = {
                recipientType: 'VENDOR',
                channel: 'EMAIL',
                subject: `Follow-up: Work Order #${wo.id.slice(-8).toUpperCase()} Status`,
                body: `Hello ${wo.vendor.name},

This is an automated follow-up regarding Work Order #${wo.id.slice(-8).toUpperCase()}.

Property: ${wo.property.name}
${wo.space ? `Location: ${wo.space.spaceLabel}` : ''}
Issue: ${wo.summary}
Priority: ${wo.priority}

Please provide a status update on this work order at your earliest convenience. If the work has been completed, kindly confirm so we can close out this ticket.

If you have any questions or need additional information, please reply to this email.

Thank you,
Property Management`,
                meta: JSON.stringify({
                  automatedAction: true,
                  actionId: action.id,
                  recipientName: wo.vendor.name,
                  recipientEmail: wo.vendor.email,
                }),
              };
            }
            break;

          case 'OCCUPIER_CHECKIN':
            if (wo.occupier) {
              const occupierName =
                wo.occupier.primaryContactName ||
                wo.occupier.brandName ||
                wo.occupier.legalName;
              messageData = {
                recipientType: 'OCCUPIER',
                channel: 'EMAIL',
                subject: `Update: Your Maintenance Request #${wo.id.slice(-8).toUpperCase()}`,
                body: `Hello ${occupierName},

We wanted to follow up on your maintenance request regarding: ${wo.summary}

Current Status: ${wo.status.replace(/_/g, ' ')}
${wo.vendor ? `Assigned Vendor: ${wo.vendor.name}` : ''}

${
  wo.status === 'IN_PROGRESS'
    ? 'Work is currently in progress. We expect the issue to be resolved soon.'
    : wo.status === 'ASSIGNED'
      ? 'A technician has been assigned and will be in contact shortly.'
      : 'We are actively working on your request.'
}

If you have any questions or concerns, please don't hesitate to reach out.

Thank you for your patience,
Property Management Team`,
                meta: JSON.stringify({
                  automatedAction: true,
                  actionId: action.id,
                  recipientName: occupierName,
                  recipientEmail: wo.occupier.primaryContactEmail,
                }),
              };
            }
            break;

          case 'ESCALATION_INTERNAL':
            messageData = {
              recipientType: 'INTERNAL',
              channel: 'NOTE',
              subject: `Escalation Alert: Work Order #${wo.id.slice(-8).toUpperCase()}`,
              body: `⚠️ ESCALATION NOTICE

Work Order #${wo.id.slice(-8).toUpperCase()} requires attention.

Property: ${wo.property.name}
${wo.space ? `Location: ${wo.space.spaceLabel}` : ''}
Issue: ${wo.summary}
Priority: ${wo.priority}
Current Status: ${wo.status}
${wo.vendor ? `Assigned Vendor: ${wo.vendor.name}` : 'Vendor: Not assigned'}

Reason for Escalation: ${payload.reason || action.description}

This work order has been flagged for internal review. Please assess the situation and take appropriate action.

Automated escalation triggered at: ${now.toLocaleString()}`,
              meta: JSON.stringify({
                automatedAction: true,
                actionId: action.id,
                escalationLevel: payload.escalationLevel || 1,
              }),
            };
            break;

          default:
            // Generic internal note for unknown action types
            messageData = {
              recipientType: 'INTERNAL',
              channel: 'NOTE',
              subject: `Automated Action: ${action.actionType.replace(/_/g, ' ')}`,
              body: `Automated action executed for Work Order #${wo.id.slice(-8).toUpperCase()}.

Action Type: ${action.actionType}
Description: ${action.description}
Executed At: ${now.toLocaleString()}`,
              meta: JSON.stringify({
                automatedAction: true,
                actionId: action.id,
              }),
            };
        }

        // Execute in transaction
        await prisma.$transaction(async (tx) => {
          // Create message if we have data
          if (messageData) {
            await tx.message.create({
              data: {
                workOrderId: wo.id,
                recipientType: messageData.recipientType,
                channel: messageData.channel,
                subject: messageData.subject,
                body: messageData.body,
                status: 'SENT',
                sentAt: now,
                meta: messageData.meta,
              },
            });
          }

          // Mark action as executed
          await tx.scheduledAction.update({
            where: { id: action.id },
            data: {
              status: 'EXECUTED',
              executedAt: now,
            },
          });
        });

        results.push({
          actionId: action.id,
          actionType: action.actionType,
          workOrderId: wo.id,
          property: wo.property.name,
          messageCreated: !!messageData,
        });
      } catch (err) {
        results.push({
          actionId: action.id,
          actionType: action.actionType,
          workOrderId: action.workOrderId,
          property: action.workOrder.property.name,
          messageCreated: false,
          error: (err as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => !r.error).length;
    const errorCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: errorCount === 0,
      processed: results.length,
      successful: successCount,
      failed: errorCount,
      message: `Processed ${successCount} action(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error running automation:', error);
    return NextResponse.json(
      {
        error: 'Failed to run automation',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/maintenance/run-automation
 *
 * Returns count and list of pending actions due now
 */
export async function GET() {
  try {
    const now = new Date();

    // Find all pending actions that are due
    const dueActions = await prisma.scheduledAction.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        workOrder: {
          include: {
            property: true,
            space: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    // Also get upcoming actions (next 24 hours)
    const upcomingActions = await prisma.scheduledAction.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          gt: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        workOrder: {
          include: {
            property: true,
            space: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    return NextResponse.json({
      dueNow: {
        count: dueActions.length,
        actions: dueActions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          description: a.description,
          scheduledFor: a.scheduledFor,
          workOrderId: a.workOrderId,
          property: a.workOrder.property.name,
          space: a.workOrder.space?.spaceLabel || null,
        })),
      },
      upcoming: {
        count: upcomingActions.length,
        actions: upcomingActions.map((a) => ({
          id: a.id,
          actionType: a.actionType,
          description: a.description,
          scheduledFor: a.scheduledFor,
          workOrderId: a.workOrderId,
          property: a.workOrder.property.name,
          space: a.workOrder.space?.spaceLabel || null,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching automation status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch automation status',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
