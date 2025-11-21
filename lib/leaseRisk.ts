/**
 * Lease Risk Scoring Helper
 *
 * Computes risk scores for individual leases based on multiple factors:
 * - Lease expiration proximity
 * - Document availability
 * - Lease size relative to portfolio
 *
 * Risk levels:
 * - HIGH: >= 70 (requires immediate attention)
 * - MEDIUM: 40-69 (monitor closely)
 * - LOW: < 40 (standard monitoring)
 */

export interface LeaseRiskInput {
  leaseEnd: Date;
  hasDocument: boolean;
  squareFeet: number;
  portfolioAvgSquareFeet: number;
}

export interface LeaseRiskOutput {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Compute risk score and level for a single lease
 */
export function computeLeaseRisk(args: LeaseRiskInput): LeaseRiskOutput {
  let score = 0;
  const today = new Date();
  const daysUntilExpiry = Math.floor(
    (args.leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Factor 1: Lease expiration proximity
  // Assumption: Leases expiring soon create renewal/vacancy risk
  if (daysUntilExpiry <= 90) {
    score += 40; // Expires within 3 months - high urgency
  } else if (daysUntilExpiry <= 180) {
    score += 25; // Expires within 6 months - moderate urgency
  }

  // Factor 2: Missing lease document
  // Assumption: Missing documents create legal/operational risk
  if (!args.hasDocument) {
    score += 20;
  }

  // Factor 3: Large lease relative to portfolio
  // Assumption: Larger leases create concentration risk
  if (args.squareFeet > 1.5 * args.portfolioAvgSquareFeet) {
    score += 15;
  }

  // Cap the score at 100
  score = Math.min(score, 100);

  // Determine risk level
  let level: 'LOW' | 'MEDIUM' | 'HIGH';
  if (score >= 70) {
    level = 'HIGH';
  } else if (score >= 40) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return { score, level };
}
