'use client';

import Link from 'next/link';
import DraftCommunicationButton from './DraftCommunicationButton';

interface LeaseOverviewActionsProps {
  leaseId: string;
  documentCount: number;
  tenantName?: string;
}

export default function LeaseOverviewActions({
  leaseId,
  documentCount,
  tenantName,
}: LeaseOverviewActionsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <DraftCommunicationButton leaseId={leaseId} tenantName={tenantName} />
      <Link
        href={`/documents?leaseId=${leaseId}`}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        View All Documents ({documentCount})
      </Link>
    </div>
  );
}
