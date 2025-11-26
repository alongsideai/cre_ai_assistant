import { callLLM } from './llm';

export async function generateDashboardInsights(data: {
  totals: {
    totalRent: number;
    totalSqft: number;
    leases: number;
    properties: number;
  };
  expirations: Array<{
    leaseId: string;
    tenant: string | null;
    property: string | null;
    endDate: string;
  }>;
  criticalDates: Array<{
    leaseId: string;
    tenant: string | null;
    property: string | null;
    date: string;
    type: string;
    description: string | null;
  }>;
  documentHealth: Array<{
    leaseId: string;
    tenant: string | null;
    hasLease: boolean;
    hasCOI: boolean;
    missingAmendments: boolean;
    status: 'HEALTHY' | 'NEEDS_REVIEW' | 'AT_RISK';
  }>;
}): Promise<string[]> {
  try {
    // Calculate summary statistics
    const now = new Date();
    const expirationsNext90Days = data.expirations.filter((exp) => {
      const expDate = new Date(exp.endDate);
      const daysUntil = Math.floor(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 90;
    });

    const expirationsNext12Months = data.expirations.filter((exp) => {
      const expDate = new Date(exp.endDate);
      const daysUntil = Math.floor(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 365;
    });

    const criticalDatesNext60Days = data.criticalDates.filter((cd) => {
      const cdDate = new Date(cd.date);
      const daysUntil = Math.floor(
        (cdDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 60;
    });

    const healthyCounts = {
      healthy: data.documentHealth.filter((d) => d.status === 'HEALTHY').length,
      needsReview: data.documentHealth.filter((d) => d.status === 'NEEDS_REVIEW').length,
      atRisk: data.documentHealth.filter((d) => d.status === 'AT_RISK').length,
    };

    // Build concise summary for LLM
    const summary = {
      portfolio: {
        totalLeases: data.totals.leases,
        totalProperties: data.totals.properties,
        totalMonthlyRent: data.totals.totalRent,
        totalSquareFeet: data.totals.totalSqft,
      },
      expirations: {
        next90Days: expirationsNext90Days.length,
        next12Months: expirationsNext12Months.length,
      },
      criticalDates: {
        upcomingNext60Days: criticalDatesNext60Days.length,
        types: [...new Set(data.criticalDates.map((cd) => cd.type))],
      },
      documentHealth: healthyCounts,
    };

    // Construct prompt for LLM
    const prompt = `You are a commercial real estate portfolio analyst. Analyze the following portfolio data and provide 3-5 concise, actionable insights as a JSON array of strings.

Portfolio Summary:
${JSON.stringify(summary, null, 2)}

Focus on:
1. Lease expiration risk and renewal opportunities
2. Document compliance issues
3. Critical dates requiring attention
4. Portfolio health and recommendations

Return ONLY a valid JSON array of strings (no other text). Each insight should be 1-2 sentences max.

Example format:
["Insight 1 about expirations", "Insight 2 about documents", "Insight 3 about critical dates"]`;

    // Call LLM
    const response = await callLLM(prompt);

    // Parse JSON response
    let insights: string[];
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing entire response
        insights = JSON.parse(response);
      }

      // Validate it's an array of strings
      if (!Array.isArray(insights) || !insights.every((i) => typeof i === 'string')) {
        console.error('Invalid insights format:', insights);
        return [];
      }

      // Limit to 5 insights
      return insights.slice(0, 5);
    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
      console.error('Response was:', response);
      return [];
    }
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    return [];
  }
}
