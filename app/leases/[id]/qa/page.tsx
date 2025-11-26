import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LeaseQA from '@/components/LeaseQA';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LeaseQAPage({ params }: PageProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        where: {
          type: { in: ['LEASE', 'AMENDMENT'] },
        },
        include: {
          chunks: {
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!lease) {
    notFound();
  }

  const hasDocument = lease.documents.length > 0;
  const hasChunks = lease.documents.some((doc) => doc.chunks.length > 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Ask Questions About This Lease
      </h2>

      {hasChunks ? (
        <p className="text-sm text-gray-600 mb-4">
          Ask questions about this lease and get AI-powered answers based on the lease
          document and metadata. The system uses semantic search to find relevant
          information.
        </p>
      ) : hasDocument ? (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          Document is being processed. Questions will be answered using basic metadata
          for now.
        </p>
      ) : (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          No document has been uploaded for this lease. Questions will be answered based
          on the lease metadata only.
        </p>
      )}

      <LeaseQA leaseId={lease.id} hasDocument={hasChunks} />
    </div>
  );
}
