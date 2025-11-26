import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import DocumentTable from '@/components/documents/DocumentTable';
import DocumentFilters from '@/components/documents/DocumentFilters';

interface SearchParams {
  type?: string;
  status?: string;
  query?: string;
  page?: string;
  pageSize?: string;
}

interface PageProps {
  searchParams: SearchParams;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const type = searchParams.type;
  const status = searchParams.status;
  const query = searchParams.query;
  const page = parseInt(searchParams.page || '1');
  const pageSize = Math.min(parseInt(searchParams.pageSize || '20'), 100);

  // Build where clause
  const where: any = {};

  if (type) {
    const types = type.split(',').map((t) => t.trim());
    where.type = { in: types };
  }

  if (status) {
    where.status = status;
  }

  if (query) {
    where.fileName = {
      contains: query,
    };
  }

  // Get total count for pagination
  const total = await prisma.document.count({ where });

  // Calculate pagination
  const totalPages = Math.ceil(total / pageSize);
  const skip = (page - 1) * pageSize;

  // Fetch documents
  const documents = await prisma.document.findMany({
    where,
    select: {
      id: true,
      type: true,
      status: true,
      fileName: true,
      uploadedAt: true,
      leaseId: true,
      propertyId: true,
    },
    orderBy: {
      uploadedAt: 'desc',
    },
    skip,
    take: pageSize,
  });

  // Format for component
  const formattedDocuments = documents.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    type: doc.type,
    status: doc.status,
    leaseId: doc.leaseId,
    propertyId: doc.propertyId,
    uploadedAt: doc.uploadedAt.toISOString(),
  }));

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Inbox</h1>
            <p className="text-gray-600 mt-1">
              Manage and view all uploaded documents
            </p>
          </div>
          <div className="space-x-2">
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/properties"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Properties
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Filters */}
        <DocumentFilters />

        {/* Pagination Info */}
        {total > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {skip + 1} to {Math.min(skip + pageSize, total)} of {total} documents
          </div>
        )}

        {/* Documents Table */}
        <DocumentTable documents={formattedDocuments} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/documents?${new URLSearchParams({
                  ...searchParams,
                  page: (page - 1).toString(),
                }).toString()}`}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}

            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Page {page} of {totalPages}
            </div>

            {page < totalPages && (
              <Link
                href={`/documents?${new URLSearchParams({
                  ...searchParams,
                  page: (page + 1).toString(),
                }).toString()}`}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
