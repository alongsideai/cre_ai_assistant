import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/owner-dashboard-v2
 *
 * Returns owner-level portfolio KPIs focused on leasing, NOI, and property performance
 */
export async function GET() {
  try {
    const now = new Date();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const twelveMonthsFromNow = new Date(now);
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Run all queries in parallel for efficiency
    const [
      activeLeases,
      leasesExpiring6Months,
      leasesExpiring12Months,
      latestNOISnapshot,
      upcomingExpiries,
      noiTrend,
      // Portfolio health queries
      totalSpaces,
      allActiveLeases,
      leasesExpiring12MonthsList,
      // Property performance queries
      allProperties,
      propertiesWithLeases,
    ] = await Promise.all([
      // KPI 1: Active leases count
      prisma.lease.count({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
        },
      }),

      // KPI 2: Leases expiring within 6 months
      prisma.lease.count({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN', 'FUTURE'] },
          leaseEnd: {
            gte: now,
            lte: sixMonthsFromNow,
          },
        },
      }),

      // KPI 3: Leases expiring within 12 months
      prisma.lease.count({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN', 'FUTURE'] },
          leaseEnd: {
            gte: now,
            lte: twelveMonthsFromNow,
          },
        },
      }),

      // KPI 4: Latest NOI snapshot
      prisma.monthlyNOISnapshot.findFirst({
        where: { portfolio: 'DEFAULT' },
        orderBy: { month: 'desc' },
      }),

      // Upcoming expiries table (top 5 by soonest end date)
      prisma.lease.findMany({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
          leaseEnd: {
            gte: now,
            lte: twelveMonthsFromNow,
          },
        },
        include: {
          property: true,
        },
        orderBy: { leaseEnd: 'asc' },
        take: 5,
      }),

      // NOI trend (last 6 months)
      prisma.monthlyNOISnapshot.findMany({
        where: { portfolio: 'DEFAULT' },
        orderBy: { month: 'asc' },
        take: 6,
      }),

      // Total spaces count for occupancy
      prisma.space.count(),

      // All active leases with their data for WALT calculation
      prisma.lease.findMany({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
          leaseEnd: { gte: now },
        },
        select: {
          id: true,
          propertyId: true,
          suite: true,
          baseRent: true,
          leaseEnd: true,
        },
      }),

      // Leases expiring in 12 months for rollover calculation
      prisma.lease.findMany({
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
          leaseEnd: {
            gte: now,
            lte: twelveMonthsFromNow,
          },
        },
        select: {
          baseRent: true,
        },
      }),

      // All properties for property performance
      prisma.property.findMany({
        include: {
          spaces: true,
          leases: {
            where: {
              status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
            },
          },
        },
      }),

      // Grouped leases by property with expiring counts
      prisma.lease.groupBy({
        by: ['propertyId'],
        where: {
          status: { in: ['ACTIVE', 'NOTICE_GIVEN'] },
        },
        _count: { id: true },
        _sum: { baseRent: true },
      }),
    ]);

    // Calculate months to expiry for each lease
    const formattedExpiries = upcomingExpiries.map((lease) => {
      const endDate = lease.leaseEnd ? new Date(lease.leaseEnd) : null;
      const monthsToExpiry = endDate
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : null;

      return {
        id: lease.id,
        tenantName: lease.tenantName,
        suite: lease.suite,
        squareFeet: lease.squareFeet,
        baseRent: lease.baseRent,
        leaseEnd: lease.leaseEnd?.toISOString() || null,
        status: lease.status,
        monthsToExpiry,
        property: {
          id: lease.property.id,
          name: lease.property.name,
        },
      };
    });

    // Format NOI trend with month-over-month change
    const formattedNOITrend = noiTrend.map((snapshot, index) => {
      const prevNOI = index > 0 ? noiTrend[index - 1].noi : null;
      const change = prevNOI !== null ? snapshot.noi - prevNOI : null;
      const changePercent = prevNOI !== null && prevNOI > 0
        ? ((snapshot.noi - prevNOI) / prevNOI) * 100
        : null;

      return {
        id: snapshot.id,
        month: snapshot.month.toISOString(),
        noi: snapshot.noi,
        revenue: snapshot.revenue,
        expenses: snapshot.expenses,
        change,
        changePercent,
      };
    });

    // ==========================================
    // Portfolio Health Calculations
    // ==========================================

    // 1. Occupancy calculation
    // Use active lease count as proxy for occupied spaces (each lease = 1 occupied unit)
    // For more accurate calculation, Lease should have FK to Space
    const leasedSpaces = allActiveLeases.length;
    const rawOccupancyPct = totalSpaces > 0
      ? (leasedSpaces / totalSpaces) * 100
      : null;
    // Cap at 100% for display (data may have more leases than spaces in demo)
    const occupancyPct = rawOccupancyPct !== null
      ? Math.min(rawOccupancyPct, 100)
      : null;

    // 2. WALT (Weighted Average Lease Term) calculation
    let waltYears: number | null = null;
    if (allActiveLeases.length > 0) {
      let weightedSum = 0;
      let totalWeight = 0;

      for (const lease of allActiveLeases) {
        if (lease.leaseEnd) {
          const remainingMs = new Date(lease.leaseEnd).getTime() - now.getTime();
          const remainingYears = remainingMs / (1000 * 60 * 60 * 24 * 365.25);

          if (remainingYears > 0) {
            const weight = lease.baseRent ?? 1; // Use baseRent as weight, or 1 if null
            weightedSum += remainingYears * weight;
            totalWeight += weight;
          }
        }
      }

      waltYears = totalWeight > 0 ? weightedSum / totalWeight : null;
    }

    // 3. Rollover exposure (12 months)
    const rolloverCount12Mo = leasesExpiring12MonthsList.length;
    const rolloverRent12Mo = leasesExpiring12MonthsList.reduce(
      (sum, l) => sum + (l.baseRent ?? 0),
      0
    );

    // 4. 3-month NOI trend
    let noiChange3MoAbs: number | null = null;
    let noiChange3MoPct: number | null = null;

    if (noiTrend.length >= 4) {
      const latestNOI = noiTrend[noiTrend.length - 1]?.noi;
      const threeMonthsAgoNOI = noiTrend[noiTrend.length - 4]?.noi;

      if (latestNOI !== undefined && threeMonthsAgoNOI !== undefined) {
        noiChange3MoAbs = latestNOI - threeMonthsAgoNOI;
        if (threeMonthsAgoNOI > 0) {
          noiChange3MoPct = (noiChange3MoAbs / threeMonthsAgoNOI) * 100;
        }
      }
    }

    const portfolioHealth = {
      occupancyPct,
      totalSpaces,
      leasedSpaces,
      waltYears,
      rolloverCount12Mo,
      rolloverRent12Mo,
      noiChange3MoAbs,
      noiChange3MoPct,
    };

    // ==========================================
    // Property Performance Calculations
    // ==========================================

    // Build property performance data
    const propertyPerformanceMap = new Map<string, {
      id: string;
      name: string;
      spacesCount: number;
      activeLeasesCount: number;
      leasedSpacesCount: number;
      monthlyRentTotal: number;
      expiring12MoCount: number;
    }>();

    for (const property of allProperties) {
      const activePropertyLeases = property.leases.filter(
        l => l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN'
      );

      // Use lease count as proxy for occupied spaces
      const leasedSpacesForProperty = activePropertyLeases.length;

      // Count leases expiring in 12 months for this property
      const expiring12Mo = activePropertyLeases.filter(l => {
        if (!l.leaseEnd) return false;
        const endDate = new Date(l.leaseEnd);
        return endDate >= now && endDate <= twelveMonthsFromNow;
      });

      // Sum monthly rent
      const monthlyRentTotal = activePropertyLeases.reduce(
        (sum, l) => sum + (l.baseRent ?? 0),
        0
      );

      propertyPerformanceMap.set(property.id, {
        id: property.id,
        name: property.name,
        spacesCount: property.spaces.length,
        activeLeasesCount: activePropertyLeases.length,
        leasedSpacesCount: leasedSpacesForProperty,
        monthlyRentTotal,
        expiring12MoCount: expiring12Mo.length,
      });
    }

    // Convert to array and sort by monthly rent (top 3)
    const topProperties = Array.from(propertyPerformanceMap.values())
      .sort((a, b) => b.monthlyRentTotal - a.monthlyRentTotal)
      .slice(0, 3)
      .map(prop => {
        const rawPct = prop.spacesCount > 0
          ? (prop.leasedSpacesCount / prop.spacesCount) * 100
          : null;
        return {
          id: prop.id,
          name: prop.name,
          // Cap at 100% for display
          occupancyPct: rawPct !== null ? Math.min(rawPct, 100) : null,
          activeLeasesCount: prop.activeLeasesCount,
          monthlyRentTotal: prop.monthlyRentTotal,
          expiring12MoCount: prop.expiring12MoCount,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          activeLeases,
          leasesExpiring6Months,
          leasesExpiring12Months,
          latestNOI: latestNOISnapshot?.noi || null,
        },
        portfolioHealth,
        topProperties,
        upcomingExpiries: formattedExpiries,
        noiTrend: formattedNOITrend,
      },
    });
  } catch (error) {
    console.error('Error fetching owner dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch owner dashboard data',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
