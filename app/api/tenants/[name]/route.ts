import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const tenantName = decodeURIComponent(params.name);
    const now = new Date();
    const twelveMonthsFromNow = new Date(now);
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);

    // Find all leases for this tenant name
    // Note: SQLite doesn't support case-insensitive mode, using exact match
    const leases = await prisma.lease.findMany({
      where: {
        tenantName: tenantName,
      },
      include: {
        property: true,
      },
      orderBy: [
        { status: 'asc' },
        { leaseEnd: 'desc' },
      ],
    });

    if (leases.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Calculate metrics
    const activeLeases = leases.filter(
      (l) => l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN'
    );
    const activeLeasesCount = activeLeases.length;
    const monthlyRentTotal = activeLeases.reduce(
      (sum, l) => sum + (l.baseRent ?? 0),
      0
    );

    // Average remaining term (in years) for active leases
    let avgRemainingTermYears: number | null = null;
    const activeLeasesWithEnd = activeLeases.filter((l) => l.leaseEnd && l.leaseEnd > now);
    if (activeLeasesWithEnd.length > 0) {
      const totalRemainingMs = activeLeasesWithEnd.reduce((sum, l) => {
        return sum + (l.leaseEnd!.getTime() - now.getTime());
      }, 0);
      avgRemainingTermYears = (totalRemainingMs / activeLeasesWithEnd.length) / (1000 * 60 * 60 * 24 * 365.25);
    }

    // Format leases
    const formattedLeases = leases.map((lease) => ({
      id: lease.id,
      suite: lease.suite,
      squareFeet: lease.squareFeet,
      baseRent: lease.baseRent,
      status: lease.status,
      leaseStart: lease.leaseStart?.toISOString().split('T')[0] || null,
      leaseEnd: lease.leaseEnd?.toISOString().split('T')[0] || null,
      property: {
        id: lease.property.id,
        name: lease.property.name,
        address: lease.property.address,
      },
    }));

    // Get unique properties
    const uniqueProperties = Array.from(
      new Map(leases.map((l) => [l.property.id, l.property])).values()
    );

    return NextResponse.json({
      tenant: {
        name: leases[0].tenantName, // Use the canonical name from first lease
      },
      metrics: {
        activeLeasesCount,
        monthlyRentTotal,
        avgRemainingTermYears,
        totalLeasesCount: leases.length,
        propertiesCount: uniqueProperties.length,
      },
      leases: formattedLeases,
      properties: uniqueProperties.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
      })),
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant', details: (error as Error).message },
      { status: 500 }
    );
  }
}
