import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DocumentActions from '@/components/documents/DocumentActions';
import InvoiceSummary from '@/components/documents/InvoiceSummary';
import WorkOrderSummary from '@/components/documents/WorkOrderSummary';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      lease: {
        select: {
          id: true,
          tenantName: true,
        },
      },
      property: {
        select: {
          id: true,
          name: true,
        },
      },
      chunks: {
        select: {
          id: true,
          chunkIndex: true,
          content: true,
        },
        orderBy: {
          chunkIndex: 'asc',
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  // Parse extractedData if it exists
  let extractedData: string | null = null;
  let invoiceData: any = null;
  let workOrderData: any = null;
  if (document.extractedData) {
    try {
      const parsed = JSON.parse(document.extractedData);
      extractedData = JSON.stringify(parsed, null, 2);
      // Extract invoice data if present
      invoiceData = parsed.invoice;
      // Extract work order data if present
      workOrderData = parsed.workOrder;
    } catch (error) {
      console.error('Error parsing extractedData:', error);
      extractedData = document.extractedData;
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      UPLOADED: 'bg-blue-100 text-blue-800 border-blue-200',
      PROCESSING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      EXTRACTED: 'bg-green-100 text-green-800 border-green-200',
      FAILED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
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
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Details</h1>
          <div className="space-x-2">
            <Link
              href="/documents"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Back to Documents
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Document Actions */}
        <DocumentActions documentId={document.id} type={document.type} />

        {/* Document Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">{document.fileName}</h2>
              <p className="text-sm text-gray-600">{document.filePath}</p>
            </div>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(
                  document.type
                )}`}
              >
                {document.type}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                  document.status
                )}`}
              >
                {document.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Uploaded At</p>
              <p className="font-medium">{formatDate(document.uploadedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">MIME Type</p>
              <p className="font-medium">{document.mimeType || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lease</p>
              {document.lease ? (
                <Link
                  href={`/leases/${document.lease.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {document.lease.tenantName}
                </Link>
              ) : (
                <p className="font-medium text-gray-400">Not linked</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Property</p>
              {document.property ? (
                <Link
                  href={`/properties/${document.property.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {document.property.name}
                </Link>
              ) : (
                <p className="font-medium text-gray-400">Not linked</p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Summary - Human-Readable View */}
        {document.type === 'INVOICE' && invoiceData && (
          <InvoiceSummary invoice={invoiceData} />
        )}

        {/* Work Order Summary - Human-Readable View */}
        {document.type === 'WORK_ORDER' && workOrderData && (
          <WorkOrderSummary workOrder={workOrderData} />
        )}

        {/* Extracted Data */}
        {extractedData && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Extracted Data</h2>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto">
              {extractedData}
            </pre>
          </div>
        )}

        {/* Chunks */}
        {document.chunks.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Document Chunks ({document.chunks.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              This document has been analyzed and split into chunks for semantic search.
            </p>
            <div className="space-y-4">
              {document.chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Chunk {chunk.chunkIndex}
                    </span>
                    <span className="text-xs text-gray-500">
                      ID: {chunk.id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {chunk.content.substring(0, 200)}
                    {chunk.content.length > 200 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {document.chunks.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              This document has not been analyzed yet. No chunks are available for semantic search.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
