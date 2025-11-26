'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortfolioQuestionResponse } from '@/lib/types';
import ExpirationTimeline from '@/components/dashboard/ExpirationTimeline';
import RentExposureByYear from '@/components/dashboard/RentExposureByYear';
import CriticalDatesFeed from '@/components/dashboard/CriticalDatesFeed';
import DashboardInsightsLoader from '@/components/dashboard/DashboardInsightsLoader';

// New dashboard data structure
interface DashboardData {
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
  rentsByYear: Array<{
    year: number;
    totalRent: number;
  }>;
  documentHealth: Array<{
    leaseId: string;
    tenant: string | null;
    hasLease: boolean;
    hasCOI: boolean;
    missingAmendments: boolean;
    status: 'HEALTHY' | 'NEEDS_REVIEW' | 'AT_RISK';
  }>;
  insights: Array<any>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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

  if (error || !data) {
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

  const { totals, expirations, rentsByYear, documentHealth, criticalDates } = data;

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
              Properties
            </Link>
            <Link
              href="/documents"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Documents
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Monthly Rent"
            value={formatCurrency(totals.totalRent)}
            subtitle="Across all leases"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-900"
          />
          <MetricCard
            title="Total Square Feet"
            value={formatNumber(totals.totalSqft)}
            subtitle="Leased space"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-900"
          />
          <MetricCard
            title="Lease Count"
            value={totals.leases.toString()}
            subtitle="Active leases"
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
            textColor="text-orange-900"
          />
          <MetricCard
            title="Properties"
            value={totals.properties.toString()}
            subtitle="Portfolio properties"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-900"
          />
        </div>

        {/* Document Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Healthy Leases"
            value={documentHealth.filter(d => d.status === 'HEALTHY').length.toString()}
            subtitle="All documents in order"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            textColor="text-green-900"
          />
          <MetricCard
            title="Needs Review"
            value={documentHealth.filter(d => d.status === 'NEEDS_REVIEW').length.toString()}
            subtitle="Missing documents"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            textColor="text-yellow-900"
          />
          <MetricCard
            title="At Risk"
            value={documentHealth.filter(d => d.status === 'AT_RISK').length.toString()}
            subtitle="No lease document"
            bgColor="bg-red-50"
            borderColor="border-red-200"
            textColor="text-red-900"
          />
        </div>

        {/* Charts Section */}
        <section className="grid gap-6 md:grid-cols-2 mb-8">
          <ExpirationTimeline expirations={expirations} />
          <RentExposureByYear rentsByYear={rentsByYear} />
        </section>

        {/* Critical Dates Feed */}
        <section className="mb-8">
          <CriticalDatesFeed criticalDates={criticalDates} />
        </section>

        {/* AI Insights Panel */}
        <section className="mb-8">
          <DashboardInsightsLoader />
        </section>

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
