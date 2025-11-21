/**
 * Alert Engine for CRE Portfolio Management
 *
 * Generates actionable alerts based on lease data, risk scores, and expiration dates.
 * Alerts are prioritized by severity to help executives focus on what needs attention.
 */

import { Alert, AlertType, AlertSeverity } from './types';

export interface LeaseForAlerts {
  id: string;
  tenantName: string;
  propertyName: string;
  leaseEnd: Date;
  hasDocument: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GenerateAlertsParams {
  today: Date;
  leases: LeaseForAlerts[];
}

/**
 * Get recommended action based on alert type and severity
 */
function getRecommendedAction(type: AlertType, severity: AlertSeverity): string {
  if (type === 'LEASE_EXPIRING') {
    if (severity === 'HIGH') {
      return 'Initiate renewal strategy and market rent comparison immediately.';
    } else if (severity === 'MEDIUM') {
      return 'Review tenant performance and begin renewal discussions.';
    } else {
      return 'Monitor and plan renewal or backfill strategy.';
    }
  }

  if (type === 'NO_DOCUMENT') {
    if (severity === 'HIGH') {
      return 'Locate and upload the executed lease document as soon as possible.';
    } else if (severity === 'MEDIUM') {
      return 'Request the executed lease from legal or property management.';
    } else {
      return 'Confirm whether a signed lease exists and digitize it.';
    }
  }

  if (type === 'HIGH_RISK') {
    if (severity === 'HIGH') {
      return 'Schedule a portfolio review for this tenant and evaluate revenue impact if they vacate.';
    } else if (severity === 'MEDIUM') {
      return 'Review key clauses (renewal options, co-tenancy, termination) for this lease.';
    } else {
      return 'Monitor this tenant and review risk factors quarterly.';
    }
  }

  return 'Review this item and take appropriate action.';
}

/**
 * Generate alerts for the portfolio based on lease data
 */
export function generateAlerts(params: GenerateAlertsParams): Alert[] {
  const { today, leases } = params;
  const alerts: Alert[] = [];

  for (const lease of leases) {
    const daysUntilExpiry = Math.floor(
      (lease.leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Alert 1: Lease expiring soon
    if (daysUntilExpiry <= 90 && daysUntilExpiry >= 0) {
      const severity = 'HIGH';
      alerts.push({
        id: `LEASE_EXPIRING-${lease.id}`,
        type: 'LEASE_EXPIRING',
        severity,
        message: `${lease.tenantName} at ${lease.propertyName} expires in ${daysUntilExpiry} days`,
        recommendedAction: getRecommendedAction('LEASE_EXPIRING', severity),
        leaseId: lease.id,
        dueDate: lease.leaseEnd.toISOString(),
      });
    } else if (daysUntilExpiry <= 180 && daysUntilExpiry > 90) {
      const severity = 'MEDIUM';
      alerts.push({
        id: `LEASE_EXPIRING-${lease.id}`,
        type: 'LEASE_EXPIRING',
        severity,
        message: `${lease.tenantName} at ${lease.propertyName} expires in ${daysUntilExpiry} days`,
        recommendedAction: getRecommendedAction('LEASE_EXPIRING', severity),
        leaseId: lease.id,
        dueDate: lease.leaseEnd.toISOString(),
      });
    }

    // Alert 2: Missing lease document
    if (!lease.hasDocument) {
      const severity = 'MEDIUM';
      alerts.push({
        id: `NO_DOCUMENT-${lease.id}`,
        type: 'NO_DOCUMENT',
        severity,
        message: `Missing lease document for ${lease.tenantName} at ${lease.propertyName}`,
        recommendedAction: getRecommendedAction('NO_DOCUMENT', severity),
        leaseId: lease.id,
      });
    }

    // Alert 3: High-risk lease
    if (lease.riskLevel === 'HIGH') {
      const severity = 'HIGH';
      alerts.push({
        id: `HIGH_RISK-${lease.id}`,
        type: 'HIGH_RISK',
        severity,
        message: `High-risk lease: ${lease.tenantName} at ${lease.propertyName} (Risk Score: ${lease.riskScore})`,
        recommendedAction: getRecommendedAction('HIGH_RISK', severity),
        leaseId: lease.id,
      });
    }
  }

  // Sort alerts by severity (HIGH > MEDIUM > LOW) and then by dueDate
  alerts.sort((a, b) => {
    // First, sort by severity
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];

    if (severityDiff !== 0) {
      return severityDiff;
    }

    // If severity is the same, sort by due date (earlier first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    // If only one has a due date, prioritize it
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return 0;
  });

  return alerts;
}

/**
 * Get severity badge color classes
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-blue-100 text-blue-800 border-blue-300',
  };
  return colors[severity];
}
