import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function LeaseDocumentsPage({ params }: PageProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      tenantName: true,
    },
  });

  if (!lease) {
    notFound();
  }

  // Get all documents for this lease
  const documents = await prisma.document.findMany({
    where: { leaseId: lease.id },
    orderBy: {
      uploadedAt: 'desc',
    },
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      UPLOADED: 'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      EXTRACTED: 'bg-green-100 text-green-800 border-green-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      colors[status as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const getTypeColor = (type: string) => {
    const colors = {
      LEASE: 'bg-purple-100 text-purple-800 border-purple-200',
      AMENDMENT: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      COI: 'bg-orange-100 text-orange-800 border-orange-200',
      INVOICE: 'bg-pink-100 text-pink-800 border-pink-200',
      EMAIL: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      WORK_ORDER: 'bg-teal-100 text-teal-800 border-teal-200',
      ABSTRACT: 'bg-violet-100 text-violet-800 border-violet-200',
      RENT_ROLL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      OTHER: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      colors[type as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Documents for {lease.tenantName}
        </h2>
        <div className="text-sm text-gray-600">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            No documents have been uploaded for this lease yet.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Upload documents via the{' '}
            <Link href="/documents" className="underline">
              Document Inbox
            </Link>{' '}
            or link existing documents to this lease.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {doc.fileName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(
                        doc.type
                      )}`}
                    >
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
