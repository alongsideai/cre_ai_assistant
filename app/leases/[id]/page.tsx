import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LeaseQA from '@/components/LeaseQA';
import { computeLeaseRisk } from '@/lib/leaseRisk';

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
      chunks: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!lease) {
    notFound();
  }

  const hasDocument = lease.documents.length > 0;
  const hasChunks = lease.chunks.length > 0;

  // Compute risk score if lease has an end date
  let riskScore: number | undefined;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;

  if (lease.leaseEnd) {
    // Get all leases to calculate portfolio average
    const allLeases = await prisma.lease.findMany({
      select: { squareFeet: true },
    });

    const totalSquareFeet = allLeases.reduce(
      (sum, l) => sum + (l.squareFeet || 0),
      0
    );
    const leasesWithSquareFeet = allLeases.filter((l) => l.squareFeet).length;
    const portfolioAvgSquareFeet = leasesWithSquareFeet > 0
      ? totalSquareFeet / leasesWithSquareFeet
      : 0;

    const risk = computeLeaseRisk({
      leaseEnd: new Date(lease.leaseEnd),
      hasDocument,
      squareFeet: lease.squareFeet || 0,
      portfolioAvgSquareFeet,
    });

    riskScore = risk.score;
    riskLevel = risk.level;
  }

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
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">{lease.tenantName}</h2>
            {riskLevel && riskScore !== undefined && (
              <RiskBadge level={riskLevel} score={riskScore} />
            )}
          </div>

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
            <p className="text-sm text-gray-600 mb-2">Document Status</p>
            {hasDocument ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <p className="font-medium text-green-700">Lease document uploaded</p>
                </div>
                {hasChunks ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <p className="text-sm text-green-700">
                      ✓ Document analyzed and indexed for Q&A
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <p className="text-sm text-yellow-700">
                      Document uploaded but not yet analyzed
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                <p className="font-medium text-yellow-700">No document uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Q&A Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Ask Questions About This Lease</h2>
          {hasChunks ? (
            <p className="text-sm text-gray-600 mb-4">
              Ask questions about this lease and get AI-powered answers based on the lease
              document and metadata. The system uses semantic search to find relevant information.
            </p>
          ) : hasDocument ? (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              Document is being processed. Questions will be answered using basic metadata for now.
            </p>
          ) : (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              No document has been uploaded for this lease. Questions will be answered based on
              the lease metadata only.
            </p>
          )}
          <LeaseQA leaseId={lease.id} hasDocument={hasChunks} />
        </div>
      </div>
    </main>
  );
}

// Risk Badge Component
function RiskBadge({ level, score }: { level: string; score: number }) {
  const colors = {
    HIGH: 'bg-red-100 text-red-800 border-red-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };

  const colorClass = colors[level as keyof typeof colors] || colors.MEDIUM;

  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border-2 ${colorClass}`}>
      Risk: {level} ({score}/100)
    </div>
  );
}
