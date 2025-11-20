import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: {
      leases: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Properties & Leases</h1>
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No properties found. Please upload a rent roll to get started.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800 underline"
            >
              Go to Upload Page
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h2 className="text-2xl font-semibold mb-2">{property.name}</h2>
                <p className="text-gray-600 mb-4">{property.address}</p>

                {property.leases.length === 0 ? (
                  <p className="text-gray-500 italic">No leases for this property</p>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Leases:</h3>
                    <div className="grid gap-3">
                      {property.leases.map((lease) => (
                        <Link
                          key={lease.id}
                          href={`/leases/${lease.id}`}
                          className="block bg-gray-50 border border-gray-200 rounded p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {lease.tenantName}
                              </h4>
                              {lease.suite && (
                                <p className="text-sm text-gray-600">
                                  Suite: {lease.suite}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {lease.baseRent && (
                                <p className="font-semibold text-green-700">
                                  ${lease.baseRent.toLocaleString()}/mo
                                </p>
                              )}
                              {lease.squareFeet && (
                                <p className="text-sm text-gray-600">
                                  {lease.squareFeet.toLocaleString()} sq ft
                                </p>
                              )}
                            </div>
                          </div>
                          {(lease.leaseStart || lease.leaseEnd) && (
                            <div className="mt-2 text-sm text-gray-600">
                              {lease.leaseStart && (
                                <span>
                                  Start: {lease.leaseStart.toISOString().split('T')[0]}
                                </span>
                              )}
                              {lease.leaseStart && lease.leaseEnd && ' | '}
                              {lease.leaseEnd && (
                                <span>
                                  End: {lease.leaseEnd.toISOString().split('T')[0]}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
