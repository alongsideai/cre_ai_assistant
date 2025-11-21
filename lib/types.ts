/**
 * Shared TypeScript types for the CRE Lease Assistant
 */

export interface LeaseWithRisk {
  id: string;
  tenantName: string;
  propertyName: string;
  suite: string | null;
  baseRent: number | null;
  squareFeet: number | null;
  leaseEnd: Date | null;
  hasDocument: boolean;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DashboardSummary {
  totalMonthlyRent: number;
  totalAnnualRent: number;
  totalSquareFeet: number;
  leaseCount: number;
  leasesExpiringSoon: LeaseWithRisk[];
  leasesExpiringNextYear: LeaseWithRisk[];
  highRiskLeasesCount?: number;
  mediumRiskLeasesCount?: number;
  lowRiskLeasesCount?: number;
  waltYears: number;
  revenueAtRisk: number;
  revenueAtRiskPct: number;
  squareFeetAtRisk: number;
  squareFeetAtRiskPct: number;
  alerts?: Alert[];
}

export type AlertType = 'LEASE_EXPIRING' | 'NO_DOCUMENT' | 'HIGH_RISK';
export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  recommendedAction: string;
  leaseId?: string;
  propertyId?: string;
  dueDate?: string; // ISO string
}

export interface LeaseQuestionResponse {
  answer: string;
  mode: 'rag' | 'metadata_only';
  sourceChunks?: {
    chunkIndex: number;
    snippet: string;
    similarity?: number;
  }[];
  metadata?: {
    tenantName: string;
    propertyName: string;
    suite?: string;
    squareFeet?: number;
    baseRent?: number;
    leaseStart?: string;
    leaseEnd?: string;
  };
}

export interface PortfolioSourceChunk {
  leaseId: string;
  tenantName: string;
  propertyId: string | null;
  propertyName: string | null;
  chunkIndex: number;
  snippet: string;
  similarity: number;
}

export interface PortfolioQuestionResponse {
  answer: string;
  mode: 'rag' | 'no_documents';
  scope: 'portfolio' | 'property';
  sourceChunks: PortfolioSourceChunk[];
}
