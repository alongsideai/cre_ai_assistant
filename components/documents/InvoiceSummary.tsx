type InvoiceSummaryProps = {
  invoice: {
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    totalAmount?: number;
    currency?: string;
    lineItems?: {
      description?: string;
      amount?: number;
      category?: string;
    }[];
    propertyName?: string;
    leaseIdHint?: string;
    notes?: string;
  };
};

export default function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
  // Check if we have any meaningful data
  const hasData =
    invoice.vendorName ||
    invoice.invoiceNumber ||
    invoice.totalAmount ||
    (invoice.lineItems && invoice.lineItems.length > 0);

  if (!hasData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Invoice Summary</h2>
        <p className="text-sm text-gray-500 italic">
          No structured invoice data extracted yet.
        </p>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (amount === undefined || amount === null) return 'N/A';
    const currencySymbol = currency === 'CAD' ? 'CAD $' : '$';
    return `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Invoice Summary</h2>

      {/* Main Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-600">Vendor</label>
          <p className="text-base text-gray-900">{invoice.vendorName || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Invoice Number</label>
          <p className="text-base text-gray-900">{invoice.invoiceNumber || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Invoice Date</label>
          <p className="text-base text-gray-900">{formatDate(invoice.invoiceDate)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Due Date</label>
          <p className="text-base text-gray-900">{formatDate(invoice.dueDate)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Total Amount</label>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </p>
        </div>
        {invoice.currency && (
          <div>
            <label className="text-sm font-medium text-gray-600">Currency</label>
            <p className="text-base text-gray-900">{invoice.currency}</p>
          </div>
        )}
      </div>

      {/* Property/Lease Hints */}
      {(invoice.propertyName || invoice.leaseIdHint) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Property & Lease Information
          </h3>
          {invoice.propertyName && (
            <p className="text-sm text-blue-800">
              <span className="font-medium">Property:</span> {invoice.propertyName}
            </p>
          )}
          {invoice.leaseIdHint && (
            <p className="text-sm text-blue-800">
              <span className="font-medium">Lease/Suite:</span> {invoice.leaseIdHint}
            </p>
          )}
        </div>
      )}

      {/* Line Items */}
      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {item.description || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {item.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {item.category}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-1">Notes</h3>
          <p className="text-sm text-yellow-800">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
