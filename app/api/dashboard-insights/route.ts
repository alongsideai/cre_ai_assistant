import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDashboardInsights } from '@/lib/generateDashboardInsights';

export async function GET() {
  try {
    // Fetch dashboard data (reusing same logic as dashboard-summary)
    const [leases, properties] = await Promise.all([
      prisma.lease.findMany({
        select: {
          id: true,
          tenantName: true,
          baseRent: true,
          squareFeet: true,
          leaseEnd: true,
          property: {
            select: {
              id: true,
              name: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              status: true,
              extractedData: true,
            },
          },
        },
      }),
      prisma.property.count(),
    ]);

    // Calculate totals
    let totalRent = 0;
    let totalSqft = 0;

    for (const lease of leases) {
      if (lease.baseRent) totalRent += lease.baseRent;
      if (lease.squareFeet) totalSqft += lease.squareFeet;
    }

    const totals = {
      totalRent,
      totalSqft,
      leases: leases.length,
      properties,
    };

    // Build expirations array
    const expirations = leases
      .filter((lease) => lease.leaseEnd)
      .map((lease) => ({
        leaseId: lease.id,
        tenant: lease.tenantName,
        property: lease.property?.name || null,
        endDate: lease.leaseEnd!.toISOString(),
      }))
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    // Extract critical dates from document extractedData
    const criticalDates: Array<{
      leaseId: string;
      tenant: string | null;
      property: string | null;
      date: string;
      type: string;
      description: string | null;
    }> = [];

    for (const lease of leases) {
      // Add lease expiration as a critical date if available
      if (lease.leaseEnd) {
        criticalDates.push({
          leaseId: lease.id,
          tenant: lease.tenantName,
          property: lease.property?.name || null,
          date: lease.leaseEnd.toISOString(),
          type: 'LEASE_EXPIRATION',
          description: 'Lease expiration date',
        });
      }

      // Extract critical dates from document extractedData
      for (const doc of lease.documents) {
        if (doc.extractedData && doc.status === 'EXTRACTED') {
          try {
            const extracted = JSON.parse(doc.extractedData);
            if (extracted.criticalDates && Array.isArray(extracted.criticalDates)) {
              for (const cd of extracted.criticalDates) {
                criticalDates.push({
                  leaseId: lease.id,
                  tenant: lease.tenantName,
                  property: lease.property?.name || null,
                  date: cd.date,
                  type: cd.type || 'UNKNOWN',
                  description: cd.description || null,
                });
              }
            }
          } catch (err) {
            console.error(`Error parsing extractedData for document ${doc.id}:`, err);
          }
        }
      }
    }

    // Calculate document health for each lease
    const documentHealth = leases.map((lease) => {
      const hasLease = lease.documents.some(
        (doc) => doc.type === 'LEASE' && doc.status === 'EXTRACTED'
      );
      const hasCOI = lease.documents.some((doc) => doc.type === 'COI');
      const hasAmendment = lease.documents.some((doc) => doc.type === 'AMENDMENT');

      const missingAmendments = hasLease && !hasAmendment;

      let status: 'HEALTHY' | 'NEEDS_REVIEW' | 'AT_RISK';
      if (!hasLease) {
        status = 'AT_RISK';
      } else if (!hasCOI || missingAmendments) {
        status = 'NEEDS_REVIEW';
      } else {
        status = 'HEALTHY';
      }

      return {
        leaseId: lease.id,
        tenant: lease.tenantName,
        hasLease,
        hasCOI,
        missingAmendments,
        status,
      };
    });

    // Generate insights using LLM
    const insights = await generateDashboardInsights({
      totals,
      expirations,
      criticalDates,
      documentHealth,
    });

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error',
        insights: [], // Return empty array on error
      },
      { status: 500 }
    );
  }
}
