type WorkOrderSummaryProps = {
  workOrder: {
    issueType?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    summary?: string;
    fullDescription?: string;
    affectedArea?: string;
    recommendedVendor?: string;
    tenantName?: string;
    propertyName?: string;
    detectedRisk?: string[];
    suggestedNextSteps?: string[];
  };
};

export default function WorkOrderSummary({ workOrder }: WorkOrderSummaryProps) {
  // Check if we have any meaningful data
  const hasData =
    workOrder.issueType ||
    workOrder.summary ||
    workOrder.fullDescription ||
    workOrder.affectedArea;

  if (!hasData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Work Order Summary</h2>
        <p className="text-sm text-gray-500 italic">
          No structured work order data extracted yet.
        </p>
      </div>
    );
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Work Order Summary</h2>

      {/* Main Work Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {workOrder.issueType && (
          <div>
            <label className="text-sm font-medium text-gray-600">Issue Type</label>
            <p className="text-base text-gray-900">{workOrder.issueType}</p>
          </div>
        )}
        {workOrder.priority && (
          <div>
            <label className="text-sm font-medium text-gray-600">Priority</label>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                  workOrder.priority
                )}`}
              >
                {workOrder.priority}
              </span>
            </div>
          </div>
        )}
        {workOrder.affectedArea && (
          <div>
            <label className="text-sm font-medium text-gray-600">Affected Area</label>
            <p className="text-base text-gray-900">{workOrder.affectedArea}</p>
          </div>
        )}
        {workOrder.recommendedVendor && (
          <div>
            <label className="text-sm font-medium text-gray-600">Recommended Vendor</label>
            <p className="text-base text-gray-900">{workOrder.recommendedVendor}</p>
          </div>
        )}
      </div>

      {/* Tenant & Property Information */}
      {(workOrder.tenantName || workOrder.propertyName) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Tenant & Property Information
          </h3>
          {workOrder.tenantName && (
            <p className="text-sm text-blue-800">
              <span className="font-medium">Tenant:</span> {workOrder.tenantName}
            </p>
          )}
          {workOrder.propertyName && (
            <p className="text-sm text-blue-800">
              <span className="font-medium">Property:</span> {workOrder.propertyName}
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      {workOrder.summary && (
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700">Summary</label>
          <p className="text-base text-gray-900 mt-1">{workOrder.summary}</p>
        </div>
      )}

      {/* Full Description */}
      {workOrder.fullDescription && (
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700">Full Description</label>
          <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">
            {workOrder.fullDescription}
          </p>
        </div>
      )}

      {/* Detected Risks */}
      {workOrder.detectedRisk && workOrder.detectedRisk.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-900 mb-2">Detected Risks</h3>
          <ul className="list-disc list-inside space-y-1">
            {workOrder.detectedRisk.map((risk, idx) => (
              <li key={idx} className="text-sm text-red-800">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Next Steps */}
      {workOrder.suggestedNextSteps && workOrder.suggestedNextSteps.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Suggested Next Steps</h3>
          <ul className="list-disc list-inside space-y-1">
            {workOrder.suggestedNextSteps.map((step, idx) => (
              <li key={idx} className="text-sm text-green-800">
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
