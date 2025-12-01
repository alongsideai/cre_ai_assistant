import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/maintenance/work-orders/[id]/simulate-vendor-confirmation
 *
 * Demo endpoint: Simulates vendor confirming dispatch
 * - Updates status to IN_PROGRESS
 * - Sets vendorConfirmedAt timestamp
 * - Creates an internal note about the confirmation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    if (workOrder.vendorConfirmedAt) {
      return NextResponse.json(
        { error: 'Vendor already confirmed' },
        { status: 400 }
      );
    }

    // Check if status allows confirmation
    if (workOrder.status !== 'NEW' && workOrder.status !== 'ASSIGNED') {
      return NextResponse.json(
        { error: 'Work order is not in a confirmable state' },
        { status: 400 }
      );
    }

    const now = new Date();
    const vendorName = workOrder.vendor?.name || 'Vendor';

    // Update work order and create internal message in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update work order status
      const updated = await tx.workOrder.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          vendorConfirmedAt: now,
        },
      });

      // Create internal note about confirmation
      await tx.message.create({
        data: {
          workOrderId: id,
          recipientType: 'INTERNAL',
          channel: 'NOTE',
          subject: 'Vendor Dispatch Confirmed',
          body: `${vendorName} has confirmed receipt of the dispatch and is en route to the property.

Confirmation Time: ${now.toLocaleString()}
Status Updated: IN_PROGRESS

This is a simulated confirmation for demo purposes.`,
          status: 'SENT',
          sentAt: now,
          meta: JSON.stringify({
            simulatedAction: true,
            vendorId: workOrder.assignedVendorId,
            vendorName,
          }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      workOrderId: result.id,
      status: result.status,
      vendorConfirmedAt: result.vendorConfirmedAt,
    });
  } catch (error) {
    console.error('Error simulating vendor confirmation:', error);
    return NextResponse.json(
      {
        error: 'Failed to simulate vendor confirmation',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
