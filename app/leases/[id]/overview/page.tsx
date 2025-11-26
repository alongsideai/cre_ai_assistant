import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { computeLeaseRisk } from '@/lib/leaseRisk';
import LeaseOverviewActions from '@/components/leases/LeaseOverviewActions';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LeaseOverviewPage({ params }: PageProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
      property: true,
      documents: {
        where: {
          type: { in: ['LEASE', 'AMENDMENT'] },
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

  // Get extracted data from most recent document
  let extractedData: any = null;
  if (lease.documents.length > 0 && lease.documents[0].extractedData) {
    try {
      extractedData = JSON.parse(lease.documents[0].extractedData);
    } catch (error) {
      console.error('Error parsing extractedData:', error);
    }
  }

  // Compute risk score if lease has an end date
  let riskScore: number | undefined;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;

  if (lease.leaseEnd) {
    const allLeases = await prisma.lease.findMany({
      select: { squareFeet: true },
    });

    const totalSquareFeet = allLeases.reduce((sum, l) => sum + (l.squareFeet || 0), 0);
    const leasesWithSquareFeet = allLeases.filter((l) => l.squareFeet).length;
    const portfolioAvgSquareFeet =
      leasesWithSquareFeet > 0 ? totalSquareFeet / leasesWithSquareFeet : 0;

    const risk = computeLeaseRisk({
      leaseEnd: new Date(lease.leaseEnd),
      hasDocument: lease.documents.length > 0,
      squareFeet: lease.squareFeet || 0,
      portfolioAvgSquareFeet,
    });

    riskScore = risk.score;
    riskLevel = risk.level;
  }

  // Get document count
  const documentCount = await prisma.document.count({
    where: { leaseId: lease.id },
  });

  // Helper function to get value from lease or extracted data
  const getValue = (leaseField: any, extractedField?: any) => {
    return leaseField || extractedField || null;
  };

  return (
    <div className="p-6">
      {/* Lease Overview Card */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lease Overview</h2>
            {riskLevel && riskScore !== undefined && (
              <div className="mt-2">
                <RiskBadge level={riskLevel} score={riskScore} />
              </div>
            )}
          </div>
          <LeaseOverviewActions
            leaseId={lease.id}
            documentCount={documentCount}
            tenantName={lease.tenantName}
          />
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <InfoCard
            label="Tenant Name"
            value={getValue(lease.tenantName, extractedData?.tenantName)}
          />
          <InfoCard
            label="Property"
            value={getValue(lease.property.name, extractedData?.propertyName)}
          />
          <InfoCard label="Suite" value={getValue(lease.suite, extractedData?.suite)} />

          <InfoCard
            label="Square Feet"
            value={lease.squareFeet ? lease.squareFeet.toLocaleString() : null}
          />
          <InfoCard
            label="Base Rent"
            value={
              getValue(lease.baseRent, extractedData?.baseRent)
                ? `$${getValue(lease.baseRent, extractedData?.baseRent).toLocaleString()}/month`
                : null
            }
            highlight="text-green-700"
          />
          <InfoCard
            label="Rent Currency"
            value={extractedData?.rentCurrency || 'USD'}
          />
        </div>

        {/* Lease Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <InfoCard
            label="Lease Start"
            value={
              getValue(
                lease.leaseStart?.toISOString().split('T')[0],
                extractedData?.startDate
              )
            }
          />
          <InfoCard
            label="Lease End"
            value={
              getValue(
                lease.leaseEnd?.toISOString().split('T')[0],
                extractedData?.endDate
              )
            }
          />
          <InfoCard
            label="Lease Term"
            value={
              lease.leaseStart && lease.leaseEnd
                ? `${Math.round(
                    (new Date(lease.leaseEnd).getTime() -
                      new Date(lease.leaseStart).getTime()) /
                      (1000 * 60 * 60 * 24 * 365.25)
                  )} years`
                : null
            }
          />
        </div>

        {/* Financial Terms */}
        {extractedData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoCard
                label="Escalation Type"
                value={extractedData?.escalationType}
              />
              <InfoCard
                label="Escalation Rate"
                value={
                  extractedData?.escalationRate
                    ? `${extractedData.escalationRate}%`
                    : null
                }
              />
              <InfoCard label="CAM Type" value={extractedData?.camType} />
            </div>
            {extractedData?.camCap && (
              <div className="mt-4">
                <InfoCard
                  label="CAM Cap"
                  value={`${extractedData.camCap}%`}
                />
              </div>
            )}
          </div>
        )}

        {/* Renewal Options */}
        {extractedData?.renewalOptions &&
          extractedData.renewalOptions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Renewal Options
              </h3>
              <div className="space-y-3">
                {extractedData.renewalOptions.map((option: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Term</p>
                        <p className="font-medium">{option.months} months</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Deadline</p>
                        <p className="font-medium">{option.deadline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Notice Required</p>
                        <p className="font-medium">
                          {option.noticeMonths || 'N/A'} months
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Document Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Document Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Linked Documents</p>
              <p className="font-medium">{documentCount}</p>
            </div>
            {lease.documents.length > 0 && (
              <div>
                <p className="text-xs text-gray-600">Last Extracted</p>
                <p className="font-medium">
                  {new Date(
                    lease.documents[0].uploadedAt
                  ).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | null;
  highlight?: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`font-medium ${highlight || 'text-gray-900'}`}>
        {value || 'N/A'}
      </p>
    </div>
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
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${colorClass}`}
    >
      Risk: {level} ({score}/100)
    </span>
  );
}
