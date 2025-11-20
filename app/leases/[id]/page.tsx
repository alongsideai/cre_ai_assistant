import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LeaseQA from '@/components/LeaseQA';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LeasePage({ params }: PageProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      documents: true,
    },
  });

  if (!lease) {
    notFound();
  }

  const hasDocument = lease.documents.length > 0;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Lease Details</h1>
          <div className="space-x-2">
            <Link
              href="/properties"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Back to Properties
            </Link>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Lease Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">{lease.tenantName}</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Property</p>
              <p className="font-medium">{lease.property.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{lease.property.address}</p>
            </div>
            {lease.suite && (
              <div>
                <p className="text-sm text-gray-600">Suite</p>
                <p className="font-medium">{lease.suite}</p>
              </div>
            )}
            {lease.squareFeet && (
              <div>
                <p className="text-sm text-gray-600">Square Feet</p>
                <p className="font-medium">{lease.squareFeet.toLocaleString()}</p>
              </div>
            )}
            {lease.baseRent && (
              <div>
                <p className="text-sm text-gray-600">Base Rent</p>
                <p className="font-medium text-green-700">
                  ${lease.baseRent.toLocaleString()}/month
                </p>
              </div>
            )}
            {lease.leaseStart && (
              <div>
                <p className="text-sm text-gray-600">Lease Start</p>
                <p className="font-medium">
                  {lease.leaseStart.toISOString().split('T')[0]}
                </p>
              </div>
            )}
            {lease.leaseEnd && (
              <div>
                <p className="text-sm text-gray-600">Lease End</p>
                <p className="font-medium">
                  {lease.leaseEnd.toISOString().split('T')[0]}
                </p>
              </div>
            )}
          </div>

          {/* Document Status */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">Document Status</p>
            {hasDocument ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <p className="font-medium text-green-700">Lease document available</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                <p className="font-medium text-yellow-700">No document uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Q&A Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Ask Questions About This Lease</h2>
          {hasDocument ? (
            <p className="text-sm text-gray-600 mb-4">
              Ask questions about this lease and get answers based on the lease metadata and
              uploaded document.
            </p>
          ) : (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              Note: No document has been uploaded for this lease. Questions will be answered
              based on the lease metadata only.
            </p>
          )}
          <LeaseQA leaseId={lease.id} />
        </div>
      </div>
    </main>
  );
}
