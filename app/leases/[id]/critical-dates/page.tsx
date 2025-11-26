import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    id: string;
  };
}

interface CriticalDate {
  type: string;
  date: string;
  description?: string;
}

export default async function LeaseCriticalDatesPage({ params }: PageProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        where: {
          type: 'LEASE',
          status: 'EXTRACTED',
        },
        orderBy: {
          uploadedAt: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!lease) {
    notFound();
  }

  // Extract critical dates from document extractedData
  let criticalDates: CriticalDate[] = [];
  if (lease.documents.length > 0 && lease.documents[0].extractedData) {
    try {
      const extractedData = JSON.parse(lease.documents[0].extractedData);
      if (extractedData.criticalDates && Array.isArray(extractedData.criticalDates)) {
        criticalDates = extractedData.criticalDates;
      }
    } catch (error) {
      console.error('Error parsing extractedData:', error);
    }
  }

  // Also add lease expiration if available
  if (lease.leaseEnd) {
    const hasExpiration = criticalDates.some(
      (d) => d.type === 'LEASE_EXPIRATION'
    );
    if (!hasExpiration) {
      criticalDates.push({
        type: 'LEASE_EXPIRATION',
        date: lease.leaseEnd.toISOString().split('T')[0],
        description: 'Lease expiration date',
      });
    }
  }

  // Sort by date
  criticalDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return 'text-gray-400';
    if (daysUntil < 90) return 'text-red-600 font-semibold';
    if (daysUntil < 180) return 'text-yellow-600 font-semibold';
    return 'text-gray-900';
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      LEASE_EXPIRATION: 'bg-red-100 text-red-800 border-red-200',
      RENEWAL_DEADLINE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      NOTICE_DEADLINE: 'bg-orange-100 text-orange-800 border-orange-200',
      COI_EXPIRATION: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return (
      colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LEASE_EXPIRATION: 'Lease Expiration',
      RENEWAL_DEADLINE: 'Renewal Deadline',
      NOTICE_DEADLINE: 'Notice Deadline',
      COI_EXPIRATION: 'COI Expiration',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Critical Dates</h2>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm cursor-not-allowed"
          title="Calendar export coming soon"
        >
          Export to Calendar (.ics)
        </button>
      </div>

      {criticalDates.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            No critical dates have been extracted for this lease yet.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Extract lease data from a document to populate critical dates automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {criticalDates.map((date, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getTypeBadgeColor(
                        date.type
                      )}`}
                    >
                      {getTypeLabel(date.type)}
                    </span>
                    <span className={`text-lg font-semibold ${getDateColor(date.date)}`}>
                      {formatDate(date.date)}
                    </span>
                  </div>
                  {date.description && (
                    <p className="text-sm text-gray-600 ml-1">
                      {date.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {(() => {
                    const now = new Date();
                    const targetDate = new Date(date.date);
                    const daysUntil = Math.floor(
                      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysUntil < 0) {
                      return (
                        <span className="text-xs text-gray-400">
                          {Math.abs(daysUntil)} days ago
                        </span>
                      );
                    } else if (daysUntil === 0) {
                      return (
                        <span className="text-xs font-bold text-red-600">
                          Today!
                        </span>
                      );
                    } else if (daysUntil < 90) {
                      return (
                        <span className="text-xs font-bold text-red-600">
                          {daysUntil} days
                        </span>
                      );
                    } else if (daysUntil < 180) {
                      return (
                        <span className="text-xs font-semibold text-yellow-600">
                          {daysUntil} days
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-xs text-gray-600">
                          {daysUntil} days
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {criticalDates.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Color Guide
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded"></span>
              <span className="text-gray-700">Within 90 days (urgent)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-600 rounded"></span>
              <span className="text-gray-700">90-180 days (attention needed)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-900 rounded"></span>
              <span className="text-gray-700">180+ days</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
