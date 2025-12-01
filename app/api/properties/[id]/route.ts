import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: propertyId } = params;
    const now = new Date();
    const twelveMonthsFromNow = new Date(now);
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        spaces: {
          include: {
            occupiers: true,
          },
          orderBy: { spaceLabel: 'asc' },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const leases = await prisma.lease.findMany({
      where: { propertyId },
      include: {
        documents: {
          include: {
            chunks: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { tenantName: 'asc' },
    });

    // Calculate metrics
    const activeLeases = leases.filter(
      (l) => l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN'
    );
    const activeLeasesCount = activeLeases.length;
    const monthlyRentTotal = activeLeases.reduce(
      (sum, l) => sum + (l.baseRent ?? 0),
      0
    );
    const expiring12MoCount = activeLeases.filter((l) => {
      if (!l.leaseEnd) return false;
      return l.leaseEnd >= now && l.leaseEnd <= twelveMonthsFromNow;
    }).length;

    // Occupancy: count of active leases vs total spaces
    const totalSpaces = property.spaces.length;
    const rawOccupancy = totalSpaces > 0
      ? (activeLeasesCount / totalSpaces) * 100
      : null;
    const occupancyPct = rawOccupancy !== null
      ? Math.min(rawOccupancy, 100)
      : null;

    const formattedLeases = leases.map((lease) => ({
      id: lease.id,
      tenantName: lease.tenantName,
      suite: lease.suite,
      squareFeet: lease.squareFeet,
      baseRent: lease.baseRent,
      status: lease.status,
      leaseStart: lease.leaseStart?.toISOString().split('T')[0] || null,
      leaseEnd: lease.leaseEnd?.toISOString().split('T')[0] || null,
      hasChunks: lease.documents.some((doc) => doc.chunks.length > 0),
    }));

    // Format spaces with current tenant info (if any)
    const formattedSpaces = property.spaces.map((space) => {
      // Find active lease for this space by matching suite label
      const activeLease = activeLeases.find(
        (l) => l.suite && l.suite.toLowerCase() === space.spaceLabel.toLowerCase()
      );
      return {
        id: space.id,
        spaceLabel: space.spaceLabel,
        floor: space.floor,
        areaSqft: space.areaSqft,
        useType: space.useType,
        currentTenant: activeLease ? activeLease.tenantName : null,
        currentLeaseId: activeLease ? activeLease.id : null,
        currentLeaseStatus: activeLease ? activeLease.status : null,
        occupiers: space.occupiers.map((o) => ({
          id: o.id,
          legalName: o.legalName,
          brandName: o.brandName,
        })),
      };
    });

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
        type: property.type,
        timeZone: property.timeZone,
        ownerEntity: property.ownerEntity,
        assetManager: property.assetManager,
        notes: property.notes,
      },
      metrics: {
        totalSpaces,
        activeLeasesCount,
        occupancyPct,
        monthlyRentTotal,
        expiring12MoCount,
      },
      spaces: formattedSpaces,
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
