'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardSummary, Alert, PortfolioQuestionResponse, PortfolioSourceChunk } from '@/lib/types';
import { getSeverityColor } from '@/lib/alerts';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard-summary');
      const result = await response.json();

      if (response.ok && result.success) {
        setSummary(result.data);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-200 text-red-800 rounded-lg p-6">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm mt-1">{error || 'Unknown error'}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Overview of your commercial real estate portfolio
            </p>
          </div>
          <div className="space-x-2">
            <Link
              href="/properties"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              View Properties
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* What Needs Attention - Alerts Section */}
        {summary.alerts && summary.alerts.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-red-300 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-red-900 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              What Needs Attention
            </h2>
            <div className="space-y-3">
              {summary.alerts.slice(0, 5).map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
            {summary.alerts.length > 5 && (
              <p className="text-sm text-gray-600 mt-4 italic">
                Showing top 5 alerts. Total: {summary.alerts.length}
              </p>
            )}
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Monthly Rent"
            value={formatCurrency(summary.totalMonthlyRent)}
            subtitle="Across all leases"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-900"
          />
          <MetricCard
            title="Total Annual Rent"
            value={formatCurrency(summary.totalAnnualRent)}
            subtitle="Annualized revenue"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-900"
          />
          <MetricCard
            title="Total Square Feet"
            value={formatNumber(summary.totalSquareFeet)}
            subtitle="Leased space"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-900"
          />
          <MetricCard
            title="Lease Count"
            value={summary.leaseCount.toString()}
            subtitle="Active leases"
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
            textColor="text-orange-900"
          />
        </div>

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {summary.highRiskLeasesCount !== undefined && (
            <MetricCard
              title="High-Risk Leases"
              value={summary.highRiskLeasesCount.toString()}
              subtitle="Require immediate attention"
              bgColor="bg-red-50"
              borderColor="border-red-200"
              textColor="text-red-900"
            />
          )}
          {summary.mediumRiskLeasesCount !== undefined && (
            <MetricCard
              title="Medium-Risk Leases"
              value={summary.mediumRiskLeasesCount.toString()}
              subtitle="Monitor closely"
              bgColor="bg-yellow-50"
              borderColor="border-yellow-200"
              textColor="text-yellow-900"
            />
          )}
          <MetricCard
            title="WALT"
            value={`${summary.waltYears.toFixed(1)} years`}
            subtitle="Weighted Average Lease Term"
            bgColor="bg-indigo-50"
            borderColor="border-indigo-200"
            textColor="text-indigo-900"
          />
        </div>

        {/* Exposure (Next 12 Months) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Exposure (Next 12 Months)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Revenue at Risk</h3>
              <p className="text-3xl font-bold text-orange-900 mb-1">
                {formatCurrency(summary.revenueAtRisk)}
              </p>
              <p className="text-sm text-gray-700">
                {(summary.revenueAtRiskPct * 100).toFixed(1)}% of annual rent
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">SF at Risk</h3>
              <p className="text-3xl font-bold text-orange-900 mb-1">
                {formatNumber(summary.squareFeetAtRisk)} sq ft
              </p>
              <p className="text-sm text-gray-700">
                {(summary.squareFeetAtRiskPct * 100).toFixed(1)}% of portfolio SF
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Lease Expirations */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Upcoming Lease Expirations (Next 90 Days)
          </h2>

          {summary.leasesExpiringSoon.length === 0 ? (
            <p className="text-gray-600 italic">No leases expiring in the next 90 days</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suite
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lease End
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Rent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sq Ft
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    {summary.leasesExpiringSoon.some(l => l.riskLevel) && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summary.leasesExpiringSoon.map((lease) => (
                    <tr key={lease.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lease.tenantName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {lease.propertyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {lease.suite || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(lease.leaseEnd)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {lease.baseRent ? formatCurrency(lease.baseRent) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {lease.squareFeet ? formatNumber(lease.squareFeet) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {lease.hasDocument ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      {summary.leasesExpiringSoon.some(l => l.riskLevel) && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {lease.riskLevel && (
                            <RiskBadge level={lease.riskLevel} score={lease.riskScore} />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link
                          href={`/leases/${lease.id}`}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ask the Portfolio */}
        <PortfolioQA />
      </div>
    </main>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  bgColor,
  borderColor,
  textColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${textColor} mb-1`}>{value}</p>
      <p className="text-xs text-gray-600">{subtitle}</p>
    </div>
  );
}

// Risk Badge Component
function RiskBadge({ level, score }: { level: string; score?: number }) {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };

  const colorClass = colors[level as keyof typeof colors] || colors.MEDIUM;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {level}
      {score !== undefined && ` (${score})`}
    </span>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: Alert }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getSeverityColor(alert.severity)}`}>
          {alert.severity}
        </span>
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
        {alert.dueDate && (
          <p className="text-xs text-gray-600 mt-1">
            Due: {formatDate(alert.dueDate)}
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">
          <span className="font-semibold">Recommended Action:</span> {alert.recommendedAction}
        </p>
      </div>
      {alert.leaseId && (
        <div className="flex-shrink-0">
          <Link
            href={`/leases/${alert.leaseId}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
          >
            View Lease →
          </Link>
        </div>
      )}
    </div>
  );
}

// Portfolio Q&A Component
function PortfolioQA() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{
    question: string;
    response: PortfolioQuestionResponse;
  }>>([]);
  const [showContext, setShowContext] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/portfolio/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data: PortfolioQuestionResponse = await response.json();
      setHistory(prev => [{ question: question.trim(), response: data }, ...prev]);
      setQuestion('');
    } catch (error) {
      console.error('Error asking portfolio question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Ask the Portfolio
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Ask questions across all analyzed lease documents in your portfolio.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., Which tenants have renewal options in 2026?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Q: {item.question}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  item.response.mode === 'rag'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.response.mode === 'rag' ? 'Lease Documents' : 'No Documents'}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {item.response.answer}
              </p>

              {item.response.sourceChunks.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowContext(showContext === idx ? null : idx)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showContext === idx ? 'Hide context' : `Show context (${item.response.sourceChunks.length} sources)`}
                  </button>

                  {showContext === idx && (
                    <div className="mt-2 space-y-2">
                      {item.response.sourceChunks.map((chunk, cIdx) => (
                        <div key={cIdx} className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
                          <p className="font-medium text-gray-900">
                            {chunk.tenantName} - {chunk.propertyName || 'N/A'}
                          </p>
                          <p className="text-gray-600 mt-1">
                            {chunk.snippet}...
                          </p>
                          <p className="text-gray-400 mt-1">
                            Similarity: {(chunk.similarity * 100).toFixed(0)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
