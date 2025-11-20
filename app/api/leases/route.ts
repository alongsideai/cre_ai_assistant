import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        property: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      leases,
    });
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leases', details: (error as Error).message },
      { status: 500 }
    );
  }
}
