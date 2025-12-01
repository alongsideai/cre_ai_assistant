import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/maintenance/vendors
 *
 * Fetch all available vendors for selection in the UI
 */
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        trade: true,
        email: true,
        phone: true,
      },
      orderBy: [
        { trade: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors', details: (error as Error).message },
      { status: 500 }
    );
  }
}
