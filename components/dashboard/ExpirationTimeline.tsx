'use client';

type ExpirationTimelineProps = {
  expirations: {
    leaseId: string;
    tenant: string | null;
    property: string | null;
    endDate: string; // ISO
  }[];
};

export default function ExpirationTimeline({ expirations }: ExpirationTimelineProps) {
  if (expirations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Expiration Timeline</h2>
        <p className="text-sm text-gray-500 italic">No expirations found</p>
      </div>
    );
  }

  // Group expirations by month (YYYY-MM)
  const monthMap = new Map<string, number>();

  for (const exp of expirations) {
    const date = new Date(exp.endDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
  }

  // Convert to array and sort by month
  const monthData = Array.from(monthMap.entries())
    .map(([monthKey, count]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      return { monthKey, monthLabel, count };
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Calculate max count for normalization
  const maxCount = Math.max(...monthData.map((d) => d.count));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Expiration Timeline</h2>
      <p className="text-sm text-gray-600 mb-4">Lease expirations grouped by month</p>

      <div className="space-y-3">
        {monthData.map(({ monthKey, monthLabel, count }) => {
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={monthKey} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-700 font-medium">{monthLabel}</div>
              <div className="flex-1 relative">
                <div
                  className="bg-blue-500 h-8 rounded flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${barWidth}%`, minWidth: count > 0 ? '40px' : '0' }}
                >
                  <span className="text-xs font-semibold text-white">{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        Total expirations: <span className="font-semibold">{expirations.length}</span>
      </div>
    </div>
  );
}
