import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DashboardSummary, LeaseWithRisk } from '@/lib/types';
import { computeLeaseRisk } from '@/lib/leaseRisk';
import { generateAlerts, LeaseForAlerts } from '@/lib/alerts';

export async function GET() {
  try {
    // Fetch all leases with related property and documents
    const leases = await prisma.lease.findMany({
      include: {
        property: true,
        documents: true,
      },
    });

    const today = new Date();
    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const oneYearFromNow = new Date(today);
    oneYearFromNow.setDate(today.getDate() + 365);

    // Compute summary metrics and portfolio averages
    let totalMonthlyRent = 0;
    let totalSquareFeet = 0;
    let leasesWithSquareFeet = 0;

    // First pass: calculate totals for portfolio averages
    for (const lease of leases) {
      if (lease.baseRent) {
        totalMonthlyRent += lease.baseRent;
      }
      if (lease.squareFeet) {
        totalSquareFeet += lease.squareFeet;
        leasesWithSquareFeet++;
      }
    }

    // Calculate portfolio average square feet (used for risk scoring)
    const portfolioAvgSquareFeet = leasesWithSquareFeet > 0
      ? totalSquareFeet / leasesWithSquareFeet
      : 0;

    // Second pass: compute risk scores, categorize leases, and calculate WALT + exposure
    const leasesExpiringSoon: LeaseWithRisk[] = [];
    const leasesExpiringNextYear: LeaseWithRisk[] = [];
    const leasesForAlerts: LeaseForAlerts[] = [];
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    // WALT calculation accumulators
    let waltNumerator = 0; // sum(remainingTermMonths * squareFeet)
    let waltDenominator = 0; // sum(squareFeet) for leases with SF > 0

    // 12-month exposure accumulators
    let revenueAtRisk = 0;
    let squareFeetAtRisk = 0;

    for (const lease of leases) {
      // Check if lease is expiring soon and compute risk
      if (lease.leaseEnd) {
        const leaseEndDate = new Date(lease.leaseEnd);
        const hasDocument = lease.documents.length > 0;

        // Compute risk score for this lease
        const risk = computeLeaseRisk({
          leaseEnd: leaseEndDate,
          hasDocument,
          squareFeet: lease.squareFeet || 0,
          portfolioAvgSquareFeet,
        });

        // Track risk level counts
        if (risk.level === 'HIGH') highRiskCount++;
        else if (risk.level === 'MEDIUM') mediumRiskCount++;
        else lowRiskCount++;

        // WALT calculation: compute remaining term in months
        const remainingMonths = Math.max(0,
          (leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44) // avg days per month
        );
        const weight = lease.squareFeet || 0;
        if (weight > 0) {
          waltNumerator += remainingMonths * weight;
          waltDenominator += weight;
        }

        // 12-month exposure: check if lease expires within 365 days
        if (leaseEndDate <= oneYearFromNow) {
          // Add to revenue at risk (annualized)
          if (lease.baseRent) {
            revenueAtRisk += lease.baseRent * 12;
          }
          // Add to square feet at risk
          if (lease.squareFeet) {
            squareFeetAtRisk += lease.squareFeet;
          }
        }

        const leaseData: LeaseWithRisk = {
          id: lease.id,
          tenantName: lease.tenantName,
          propertyName: lease.property.name,
          suite: lease.suite,
          baseRent: lease.baseRent,
          squareFeet: lease.squareFeet,
          leaseEnd: lease.leaseEnd,
          hasDocument,
          riskScore: risk.score,
          riskLevel: risk.level,
        };

        // Collect lease data for alert generation
        leasesForAlerts.push({
          id: lease.id,
          tenantName: lease.tenantName,
          propertyName: lease.property.name,
          leaseEnd: leaseEndDate,
          hasDocument,
          riskScore: risk.score,
          riskLevel: risk.level,
        });

        if (leaseEndDate <= ninetyDaysFromNow) {
          leasesExpiringSoon.push(leaseData);
        }

        if (leaseEndDate <= oneYearFromNow) {
          leasesExpiringNextYear.push(leaseData);
        }
      }
    }

    // Sort by lease end date (soonest first)
    leasesExpiringSoon.sort((a, b) => {
      if (!a.leaseEnd || !b.leaseEnd) return 0;
      return new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime();
    });

    leasesExpiringNextYear.sort((a, b) => {
      if (!a.leaseEnd || !b.leaseEnd) return 0;
      return new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime();
    });

    // Generate alerts based on lease data
    const alerts = generateAlerts({
      today,
      leases: leasesForAlerts,
    });

    // Calculate final WALT (Weighted Average Lease Term)
    const waltMonths = waltDenominator > 0 ? waltNumerator / waltDenominator : 0;
    const waltYears = waltMonths / 12;

    // Calculate exposure percentages
    const totalAnnualRent = totalMonthlyRent * 12;
    const revenueAtRiskPct = totalAnnualRent > 0 ? revenueAtRisk / totalAnnualRent : 0;
    const squareFeetAtRiskPct = totalSquareFeet > 0 ? squareFeetAtRisk / totalSquareFeet : 0;

    const summary: DashboardSummary = {
      totalMonthlyRent,
      totalAnnualRent,
      totalSquareFeet,
      leaseCount: leases.length,
      leasesExpiringSoon,
      leasesExpiringNextYear,
      highRiskLeasesCount: highRiskCount,
      mediumRiskLeasesCount: mediumRiskCount,
      lowRiskLeasesCount: lowRiskCount,
      waltYears: Math.round(waltYears * 100) / 100, // Round to 2 decimal places
      revenueAtRisk,
      revenueAtRiskPct,
      squareFeetAtRisk,
      squareFeetAtRiskPct,
      alerts,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary', details: (error as Error).message },
      { status: 500 }
    );
  }
}
