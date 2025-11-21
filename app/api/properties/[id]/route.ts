import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: propertyId } = params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: {
        chunks: {
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { tenantName: 'asc' },
    });

    const formattedLeases = leases.map((lease) => ({
      id: lease.id,
      tenantName: lease.tenantName,
      suite: lease.suite,
      squareFeet: lease.squareFeet,
      baseRent: lease.baseRent,
      leaseStart: lease.leaseStart?.toISOString().split('T')[0] || null,
      leaseEnd: lease.leaseEnd?.toISOString().split('T')[0] || null,
      hasChunks: lease.chunks.length > 0,
    }));

    return NextResponse.json({
      property,
      leases: formattedLeases,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property', details: (error as Error).message },
      { status: 500 }
    );
  }
}
