'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Types for owner dashboard data
interface KPIs {
  activeLeases: number;
  leasesExpiring6Months: number;
  leasesExpiring12Months: number;
  latestNOI: number | null;
}

interface UpcomingExpiry {
  id: string;
  tenantName: string;
  suite: string | null;
  squareFeet: number | null;
  baseRent: number | null;
  leaseEnd: string | null;
  status: string;
  monthsToExpiry: number | null;
  property: { id: string; name: string };
}

interface NOISnapshot {
  id: string;
  month: string;
  noi: number;
  revenue: number | null;
  expenses: number | null;
  change: number | null;
  changePercent: number | null;
}

interface OwnerDashboardData {
  kpis: KPIs;
  upcomingExpiries: UpcomingExpiry[];
  noiTrend: NOISnapshot[];
}

// Format currency
function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format month from ISO date
function formatMonth(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Get status badge class
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'NOTICE_GIVEN':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'EXPIRED':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'FUTURE':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

export default function OwnerDashboard() {
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/owner-dashboard-v2');
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

  const { kpis, upcomingExpiries, noiTrend } = data;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">MagnetAI Owner Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Portfolio-level leasing and income visibility for CRE owners and asset managers
          </p>
        </div>

        {/* Owner KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="ACTIVE LEASES"
            value={kpis.activeLeases}
            subtext="Currently occupied spaces"
            colorClass="bg-green-50 border-green-200"
            valueColor="text-green-900"
          />
          <KPICard
            label="EXPIRING IN 6 MO"
            value={kpis.leasesExpiring6Months}
            subtext="Leases needing renewal focus"
            colorClass="bg-orange-50 border-orange-200"
            valueColor="text-orange-900"
            highlight={kpis.leasesExpiring6Months > 0}
          />
          <KPICard
            label="EXPIRING IN 12 MO"
            value={kpis.leasesExpiring12Months}
            subtext="Near-term rollover exposure"
            colorClass="bg-yellow-50 border-yellow-200"
            valueColor="text-yellow-900"
          />
          <KPICard
            label="LATEST MONTHLY NOI"
            value={kpis.latestNOI !== null ? formatCurrency(kpis.latestNOI) : '—'}
            subtext="Net operating income"
            colorClass="bg-blue-50 border-blue-200"
            valueColor="text-blue-900"
            isText
          />
        </div>

        {/* Module Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ModuleCard
            title="Maintenance & Operations"
            description="View portfolio maintenance risk, work orders, and automation activity."
            href="/maintenance"
            buttonText="Open Dashboard"
            iconColor="bg-blue-100 text-blue-600"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            }
          />
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
            description="Run portfolio-wide vendor follow-ups, tenant check-ins, and escalations."
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

        {/* Upcoming Lease Expiries */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upcoming Lease Expiries
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Leases expiring within the next 12 months requiring renewal attention
            </p>
            {upcomingExpiries.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No lease expirations in the next 12 months.
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
                        Tenant
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        Monthly Rent
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExpiries.map((lease) => (
                      <tr
                        key={lease.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {lease.property.name}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {lease.suite || '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-900">
                          {lease.tenantName}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-900">
                          {formatCurrency(lease.baseRent)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                              lease.status
                            )}`}
                          >
                            {lease.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          <div className="flex flex-col">
                            <span>{formatDate(lease.leaseEnd)}</span>
                            {lease.monthsToExpiry !== null && (
                              <span className={`text-xs ${lease.monthsToExpiry <= 3 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                {lease.monthsToExpiry <= 1
                                  ? 'This month'
                                  : `${lease.monthsToExpiry} months`}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* NOI Trend */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent NOI Trend
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Monthly net operating income performance
            </p>
            {noiTrend.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No NOI data available yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Month
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        NOI
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        Revenue
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        Expenses
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        vs Prior Month
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {noiTrend.map((snapshot) => (
                      <tr
                        key={snapshot.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {formatMonth(snapshot.month)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-900 font-semibold">
                          {formatCurrency(snapshot.noi)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600">
                          {formatCurrency(snapshot.revenue)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600">
                          {formatCurrency(snapshot.expenses)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {snapshot.change !== null ? (
                            <span
                              className={`inline-flex items-center ${
                                snapshot.change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {snapshot.change >= 0 ? (
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              )}
                              {formatCurrency(Math.abs(snapshot.change))}
                              {snapshot.changePercent !== null && (
                                <span className="ml-1 text-xs">
                                  ({snapshot.changePercent >= 0 ? '+' : ''}{snapshot.changePercent.toFixed(1)}%)
                                </span>
                              )}
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
  isText = false,
}: {
  label: string;
  value: number | string;
  subtext: string;
  colorClass: string;
  valueColor: string;
  highlight?: boolean;
  isText?: boolean;
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
      <p className={`${isText ? 'text-2xl' : 'text-4xl'} font-bold ${valueColor} mb-1`}>
        {value}
      </p>
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
