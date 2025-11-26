'use client';

import Link from 'next/link';

type CriticalDatesFeedProps = {
  criticalDates: {
    leaseId: string;
    tenant: string | null;
    property: string | null;
    date: string;
    type: string;
    description: string | null;
  }[];
};

export default function CriticalDatesFeed({ criticalDates }: CriticalDatesFeedProps) {
  if (criticalDates.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Upcoming Critical Dates</h2>
        <p className="text-sm text-gray-500 italic">No upcoming critical dates.</p>
      </div>
    );
  }

  // Sort dates ascending
  const sortedDates = [...criticalDates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate urgency color based on days until date
  const getUrgencyColor = (dateString: string) => {
    const now = new Date();
    const targetDate = new Date(dateString);
    const daysUntil = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 60) {
      return 'border-l-red-500 bg-red-50';
    } else if (daysUntil < 150) {
      return 'border-l-yellow-500 bg-yellow-50';
    } else {
      return 'border-l-green-500 bg-green-50';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      LEASE_EXPIRATION: 'bg-red-100 text-red-800 border-red-200',
      RENEWAL_DEADLINE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      NOTICE_DEADLINE: 'bg-orange-100 text-orange-800 border-orange-200',
      COI_EXPIRATION: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const targetDate = new Date(dateString);
    const daysUntil = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return `${Math.abs(daysUntil)} days ago`;
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `${daysUntil} days`;
  };

  // Show only upcoming dates (limit to 10 for display)
  const upcomingDates = sortedDates.filter(
    (d) => new Date(d.date) >= new Date()
  ).slice(0, 10);

  if (upcomingDates.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Upcoming Critical Dates</h2>
        <p className="text-sm text-gray-500 italic">No upcoming critical dates.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Upcoming Critical Dates</h2>
      <p className="text-sm text-gray-600 mb-4">
        Next {upcomingDates.length} critical dates across your portfolio
      </p>

      <div className="space-y-3">
        {upcomingDates.map((item, idx) => (
          <div
            key={`${item.leaseId}-${item.type}-${idx}`}
            className={`border-l-4 rounded-r-lg p-4 transition-colors hover:shadow-md ${getUrgencyColor(
              item.date
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadgeColor(
                      item.type
                    )}`}
                  >
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatDate(item.date)}
                  </span>
                </div>

                {item.tenant && (
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {item.tenant}
                  </p>
                )}

                {item.property && (
                  <p className="text-xs text-gray-600 mb-1">{item.property}</p>
                )}

                {item.description && (
                  <p className="text-xs text-gray-600 mt-2">{item.description}</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {getDaysUntil(item.date)}
                </span>
                <Link
                  href={`/leases/${item.leaseId}`}
                  className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  View Lease →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedDates.filter((d) => new Date(d.date) >= new Date()).length > 10 && (
        <p className="text-sm text-gray-500 mt-4 text-center italic">
          Showing next 10 critical dates
        </p>
      )}
    </div>
  );
}
