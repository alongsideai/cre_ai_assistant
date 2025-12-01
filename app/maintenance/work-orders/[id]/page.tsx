import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import WorkOrderDetailClient from './WorkOrderDetailClient';

// Priority color mapping
function getPriorityColor(priority: string) {
  switch (priority) {
    case 'EMERGENCY':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LOW':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Status color mapping
function getStatusColor(status: string) {
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Impact color mapping
function getImpactColor(impact: string | null) {
  switch (impact) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MAJOR':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'MINOR':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Action status color
function getActionStatusColor(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'EXECUTED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Get recipient display from message meta
function getRecipientDisplay(msg: { recipientType: string; meta: string | null }, workOrder: {
  occupier: { brandName: string | null; legalName: string; primaryContactName: string | null; primaryContactEmail: string | null } | null;
  vendor: { name: string; email: string | null } | null;
}): string {
  // Try to parse meta for explicit recipient info
  if (msg.meta) {
    try {
      const meta = JSON.parse(msg.meta);
      if (meta.recipientName && meta.recipientEmail) {
        return `${meta.recipientName} <${meta.recipientEmail}>`;
      }
      if (meta.recipientName) {
        return meta.recipientName;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Fall back to entity data
  switch (msg.recipientType) {
    case 'OCCUPIER':
      if (workOrder.occupier) {
        const name = workOrder.occupier.primaryContactName ||
          workOrder.occupier.brandName ||
          workOrder.occupier.legalName;
        const email = workOrder.occupier.primaryContactEmail;
        return email ? `${name} <${email}>` : name;
      }
      return 'Occupier';
    case 'VENDOR':
      if (workOrder.vendor) {
        const email = workOrder.vendor.email;
        return email ? `${workOrder.vendor.name} <${email}>` : workOrder.vendor.name;
      }
      return 'Vendor';
    case 'INTERNAL':
      return 'Property Management Team';
    default:
      return msg.recipientType;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      property: true,
      space: true,
      occupier: true,
      vendor: true,
      messages: {
        orderBy: { createdAt: 'desc' },
      },
      scheduledActions: {
        orderBy: { scheduledFor: 'asc' },
      },
    },
  });

  if (!workOrder) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Work Order #{workOrder.id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-gray-600 mt-1">{workOrder.summary}</p>
            </div>
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                  workOrder.status
                )}`}
              >
                {workOrder.status}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                  workOrder.priority
                )}`}
              >
                {workOrder.priority}
              </span>
            </div>
          </div>

          {/* Property / Space / Occupier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase mb-1">Property</p>
              <p className="font-medium">{workOrder.property.name}</p>
              <p className="text-sm text-gray-600">{workOrder.property.address}</p>
            </div>
            {workOrder.space && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Space</p>
                <p className="font-medium">{workOrder.space.spaceLabel}</p>
                {workOrder.space.floor && (
                  <p className="text-sm text-gray-600">Floor: {workOrder.space.floor}</p>
                )}
              </div>
            )}
            {workOrder.occupier && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-1">Occupier</p>
                <p className="font-medium">
                  {workOrder.occupier.brandName || workOrder.occupier.legalName}
                </p>
                {workOrder.occupier.primaryContactName && (
                  <p className="text-sm text-gray-600">
                    {workOrder.occupier.primaryContactName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-gray-100 text-gray-800 border-gray-200">
              {workOrder.issueCategory}
            </span>
            {workOrder.businessImpact && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getImpactColor(
                  workOrder.businessImpact
                )}`}
              >
                Impact: {workOrder.businessImpact}
              </span>
            )}
            {workOrder.requiresOwnerApproval && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-orange-100 text-orange-800 border-orange-200">
                Owner Approval Required
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Description Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </div>

          {/* Assignment & Cost Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Assignment & Cost</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned Vendor:</span>
                <span className="font-medium">
                  {workOrder.vendor?.name || 'Unassigned'}
                </span>
              </div>
              {workOrder.vendor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor Trade:</span>
                  <span className="font-medium">{workOrder.vendor.trade}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-medium">
                  ${workOrder.estimatedCost?.toLocaleString() || 'TBD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Max Approved:</span>
                <span className="font-medium">
                  ${workOrder.maxApprovedCost?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">
                  {workOrder.dueAt
                    ? new Date(workOrder.dueAt).toLocaleString()
                    : 'Not set'}
                </span>
              </div>
            </div>

            {/* Vendor Confirmation Simulation */}
            <WorkOrderDetailClient
              workOrderId={workOrder.id}
              currentStatus={workOrder.status}
              vendorConfirmedAt={workOrder.vendorConfirmedAt?.toISOString()}
            />
          </div>
        </div>

        {/* Messages Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Communications ({workOrder.messages.length})
          </h2>
          {workOrder.messages.length === 0 ? (
            <p className="text-gray-500">No messages yet.</p>
          ) : (
            <div className="space-y-4">
              {workOrder.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {msg.recipientType}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {msg.channel}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          msg.status === 'SENT'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {/* Recipient info */}
                  <p className="text-sm text-gray-600 mb-2">
                    To: {getRecipientDisplay(msg, workOrder)}
                  </p>
                  <p className="font-medium text-gray-900 mb-1">{msg.subject}</p>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {msg.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Actions Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Scheduled Actions ({workOrder.scheduledActions.length})
          </h2>
          {workOrder.scheduledActions.length === 0 ? (
            <p className="text-gray-500">No scheduled actions.</p>
          ) : (
            <div className="space-y-3">
              {workOrder.scheduledActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {action.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      Scheduled: {new Date(action.scheduledFor).toLocaleString()}
                    </p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                      {action.actionType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionStatusColor(
                      action.status
                    )}`}
                  >
                    {action.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Email Card */}
        {workOrder.sourceEmailText && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Source Email</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto">
              {workOrder.sourceEmailText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
