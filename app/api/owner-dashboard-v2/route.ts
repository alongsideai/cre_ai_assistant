import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/owner-dashboard-v2
 *
 * Returns owner-level portfolio KPIs focused on leasing and NOI
 */
export async function GET() {
  try {
    const now = new Date();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const twelveMonthsFromNow = new Date(now);
    twelveMonthsFromNow.setMonth(twelveMonthsFromNow.getMonth() + 12);

    // Run all queries in parallel for efficiency
    const [
      activeLeases,
      leasesExpiring6Months,
      leasesExpiring12Months,
      latestNOISnapshot,
      upcomingExpiries,
      noiTrend,
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

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          activeLeases,
          leasesExpiring6Months,
          leasesExpiring12Months,
          latestNOI: latestNOISnapshot?.noi || null,
        },
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
