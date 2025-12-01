'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Tenant {
  name: string;
}

interface Metrics {
  activeLeasesCount: number;
  monthlyRentTotal: number;
  avgRemainingTermYears: number | null;
  totalLeasesCount: number;
  propertiesCount: number;
}

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Lease {
  id: string;
  suite: string | null;
  squareFeet: number | null;
  baseRent: number | null;
  status: string;
  leaseStart: string | null;
  leaseEnd: string | null;
  property: Property;
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

export default function TenantDetailPage() {
  const params = useParams();
  const tenantName = decodeURIComponent(params.name as string);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenantData();
  }, [tenantName]);

  const fetchTenantData = async () => {
    try {
      const response = await fetch(`/api/tenants/${encodeURIComponent(tenantName)}`);
      if (!response.ok) {
        throw new Error('Tenant not found');
      }
      const data = await response.json();
      setTenant(data.tenant);
      setMetrics(data.metrics);
      setLeases(data.leases);
      setProperties(data.properties || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tenant...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !tenant) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6">
            <p className="font-semibold">Error loading tenant</p>
            <p className="text-sm mt-1">{error || 'Unknown error'}</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block mt-4 text-blue-600 hover:text-blue-800 underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Separate active and historical leases
  const activeLeases = leases.filter(
    (l) => l.status === 'ACTIVE' || l.status === 'NOTICE_GIVEN' || l.status === 'FUTURE'
  );
  const historicalLeases = leases.filter((l) => l.status === 'EXPIRED');

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-gray-600 mt-1">
              Commercial Tenant • {metrics?.propertiesCount || 0} {metrics?.propertiesCount === 1 ? 'property' : 'properties'}
            </p>
          </div>
          <div className="space-x-2">
            <Link
              href="/dashboard"
              className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Summary KPIs */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Active Leases
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.activeLeasesCount}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Monthly Rent
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(metrics.monthlyRentTotal)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Avg Remaining Term
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.avgRemainingTermYears !== null
                  ? `${metrics.avgRemainingTermYears.toFixed(1)} years`
                  : '—'}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Total Leases
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalLeasesCount}
              </p>
            </div>
          </div>
        )}

        {/* Active Leases Table */}
        <section className="mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Active Leases
            </h2>
            {activeLeases.length === 0 ? (
              <p className="text-gray-500 italic">No active leases</p>
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
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Start
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        End
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        Monthly Rent
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLeases.map((lease) => (
                      <tr
                        key={lease.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={`/properties/${lease.property.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {lease.property.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-gray-900">
                          {lease.suite || '—'}
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
                          {formatDate(lease.leaseStart)}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDate(lease.leaseEnd)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-900">
                          {formatCurrency(lease.baseRent)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/leases/${lease.id}`}
                            className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
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
        </section>

        {/* Historical Leases Table */}
        {historicalLeases.length > 0 && (
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Lease History
              </h2>
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
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Start
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        End
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">
                        Monthly Rent
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalLeases.map((lease) => (
                      <tr
                        key={lease.id}
                        className="border-b border-gray-100 hover:bg-gray-50 opacity-75"
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={`/properties/${lease.property.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {lease.property.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-gray-900">
                          {lease.suite || '—'}
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
                          {formatDate(lease.leaseStart)}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDate(lease.leaseEnd)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-900">
                          {formatCurrency(lease.baseRent)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/leases/${lease.id}`}
                            className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Properties List */}
        {properties.length > 1 && (
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Properties with this Tenant
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {properties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <p className="font-semibold text-gray-900">{property.name}</p>
                    <p className="text-sm text-gray-600">{property.address}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
