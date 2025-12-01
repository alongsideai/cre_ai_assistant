'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Types for dashboard data
interface KPIs {
  openWorkOrders: number;
  highPriorityOpen: number;
  criticalImpactOpen: number;
  dueTodayActions: number;
}

interface TopProperty {
  id: string;
  name: string;
  openCount: number;
  highPriorityCount: number;
}

interface RecentWorkOrder {
  id: string;
  summary: string;
  status: string;
  priority: string;
  businessImpact: string | null;
  issueCategory: string;
  createdAt: string;
  property: { id: string; name: string };
  space: { id: string; spaceLabel: string } | null;
  occupier: { id: string; name: string } | null;
}

interface RecentAction {
  id: string;
  actionType: string;
  description: string;
  scheduledFor: string;
  executedAt: string | null;
  workOrder: {
    id: string;
    summary: string;
    property: { id: string; name: string };
  };
}

interface DashboardData {
  kpis: KPIs;
  topProperties: TopProperty[];
  recentHighPriorityWorkOrders: RecentWorkOrder[];
  recentAutomationActions: RecentAction[];
}

// Badge color utilities
function getPriorityBadgeClass(priority: string) {
  switch (priority) {
    case 'EMERGENCY':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LOW':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getImpactBadgeClass(impact: string | null) {
  switch (impact) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MAJOR':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'MINOR':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getActionTypeBadgeClass(actionType: string) {
  switch (actionType) {
    case 'VENDOR_FOLLOWUP':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'OCCUPIER_CHECKIN':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'ESCALATION_INTERNAL':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatActionType(actionType: string) {
  return actionType.replace(/_/g, ' ');
}

interface MaintenanceDashboardProps {
  title: string;
  subtitle: string;
}

export default function MaintenanceDashboard({ title, subtitle }: MaintenanceDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/owner-dashboard');
      const result = await response.json();

      if (response.ok && result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm mt-1">{error || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { kpis, topProperties, recentHighPriorityWorkOrders, recentAutomationActions } = data;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="OPEN WORK ORDERS"
            value={kpis.openWorkOrders}
            subtext="Active maintenance requests"
            colorClass="bg-blue-50 border-blue-200"
            valueColor="text-blue-900"
          />
          <KPICard
            label="HIGH / EMERGENCY"
            value={kpis.highPriorityOpen}
            subtext="Urgent issues requiring attention"
            colorClass="bg-orange-50 border-orange-200"
            valueColor="text-orange-900"
            highlight={kpis.highPriorityOpen > 0}
          />
          <KPICard
            label="CRITICAL IMPACT"
            value={kpis.criticalImpactOpen}
            subtext="Major business impact issues"
            colorClass="bg-red-50 border-red-200"
            valueColor="text-red-900"
            highlight={kpis.criticalImpactOpen > 0}
          />
          <KPICard
            label="ACTIONS DUE TODAY"
            value={kpis.dueTodayActions}
            subtext="Scheduled follow-ups pending"
            colorClass="bg-purple-50 border-purple-200"
            valueColor="text-purple-900"
          />
        </div>

        {/* Module Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ModuleCard
            title="Reactive Maintenance"
            description="Turn occupier emails into AI-generated response plans and work orders."
            href="/maintenance/reactive"
            buttonText="Open"
            iconColor="bg-orange-100 text-orange-600"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <ModuleCard
            title="Automation Runner"
            description="Run portfolio-wide vendor follow-ups, tenant check-ins, and escalations in one sweep."
            href="/maintenance/automation"
            buttonText="Open"
            iconColor="bg-purple-100 text-purple-600"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>

        {/* Portfolio Hotspots */}
        {topProperties.length > 0 && (
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Portfolio Hotspots
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Properties with the most open maintenance issues
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Property
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Open WOs
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        High/Emergency
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProperties.map((prop) => (
                      <tr
                        key={prop.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {prop.name}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            {prop.openCount}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {prop.highPriorityCount > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800 font-semibold">
                              {prop.highPriorityCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Recent High-Priority Issues */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent High-Priority Issues
            </h2>
            {recentHighPriorityWorkOrders.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No high-priority issues at this time.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Property
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Space
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Occupier
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Priority
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Impact
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHighPriorityWorkOrders.map((wo) => (
                      <tr
                        key={wo.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={`/maintenance/work-orders/${wo.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {wo.property.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {wo.space?.spaceLabel || '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {wo.occupier?.name || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeClass(
                              wo.priority
                            )}`}
                          >
                            {wo.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {wo.businessImpact ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getImpactBadgeClass(
                                wo.businessImpact
                              )}`}
                            >
                              {wo.businessImpact}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-xs">
                          {formatDateTime(wo.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Recent Automation Activity */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Automation Activity
            </h2>
            {recentAutomationActions.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No automation activity yet. Actions will appear here after running the Automation Runner.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Action Type
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Property
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Work Order
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Executed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAutomationActions.map((action) => (
                      <tr
                        key={action.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionTypeBadgeClass(
                              action.actionType
                            )}`}
                          >
                            {formatActionType(action.actionType)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-900">
                          {action.workOrder.property.name}
                        </td>
                        <td className="py-3 px-3">
                          <Link
                            href={`/maintenance/work-orders/${action.workOrder.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            {action.workOrder.summary.length > 40
                              ? `${action.workOrder.summary.slice(0, 40)}...`
                              : action.workOrder.summary}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-xs">
                          {action.executedAt
                            ? formatDateTime(action.executedAt)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({
  label,
  value,
  subtext,
  colorClass,
  valueColor,
  highlight = false,
}: {
  label: string;
  value: number;
  subtext: string;
  colorClass: string;
  valueColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border rounded-2xl p-5 ${colorClass} ${
        highlight ? 'ring-2 ring-offset-2 ring-orange-400' : ''
      }`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={`text-4xl font-bold ${valueColor} mb-1`}>{value}</p>
      <p className="text-xs text-gray-600">{subtext}</p>
    </div>
  );
}

// Module Card Component
function ModuleCard({
  title,
  description,
  href,
  buttonText,
  icon,
  iconColor,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-xl ${iconColor}`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <div className="mt-auto">
        <Link
          href={href}
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          {buttonText}
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
