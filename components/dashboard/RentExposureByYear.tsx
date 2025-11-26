'use client';

type RentExposureByYearProps = {
  rentsByYear: {
    year: number;
    totalRent: number;
  }[];
};

export default function RentExposureByYear({ rentsByYear }: RentExposureByYearProps) {
  if (rentsByYear.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Rent Exposure by Year</h2>
        <p className="text-sm text-gray-500 italic">No rent exposure data available</p>
      </div>
    );
  }

  // Sort by year ascending
  const sortedData = [...rentsByYear].sort((a, b) => a.year - b.year);

  // Calculate max rent for normalization
  const maxRent = Math.max(...sortedData.map((d) => d.totalRent));

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Rent Exposure by Year</h2>
      <p className="text-sm text-gray-600 mb-4">Annual rent at risk by lease expiration year</p>

      <div className="space-y-3">
        {sortedData.map(({ year, totalRent }) => {
          const barWidth = maxRent > 0 ? (totalRent / maxRent) * 100 : 0;
          const formattedRent = formatCurrency(totalRent);

          return (
            <div key={year} className="flex items-center gap-3">
              <div className="w-16 text-sm text-gray-700 font-medium">{year}</div>
              <div className="flex-1 relative">
                <div
                  className="bg-green-500 h-8 rounded flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${barWidth}%`, minWidth: totalRent > 0 ? '60px' : '0' }}
                >
                  <span className="text-xs font-semibold text-white">{formattedRent}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        Total exposure: <span className="font-semibold">{formatCurrency(sortedData.reduce((sum, d) => sum + d.totalRent, 0))}</span>
      </div>
    </div>
  );
}
