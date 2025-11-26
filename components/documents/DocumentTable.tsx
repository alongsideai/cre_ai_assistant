import Link from 'next/link';

interface Document {
  id: string;
  fileName: string;
  type: string;
  status: string;
  leaseId: string | null;
  propertyId: string | null;
  uploadedAt: string;
}

interface DocumentTableProps {
  documents: Document[];
}

export default function DocumentTable({ documents }: DocumentTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  if (documents.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          No documents found. Upload documents to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
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
              Lease
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Property
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded At
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.leaseId ? (
                  <Link
                    href={`/leases/${doc.leaseId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View Lease
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.propertyId ? (
                  <Link
                    href={`/properties/${doc.propertyId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View Property
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(doc.uploadedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
