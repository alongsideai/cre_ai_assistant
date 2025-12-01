'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HandleEmailResponse,
  VendorEntity,
  ScheduledActionType,
  EmailDraft,
} from '@/lib/maintenance/types';
import StatusBadge from './StatusBadge';

interface PlanReviewProps {
  data: HandleEmailResponse;
  rawEmailText: string;
}

export default function PlanReview({ data, rawEmailText }: PlanReviewProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorEntity[]>([]);

  // Editable state
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    data.decisions.assignedVendorId
  );
  const [visitWindowStart, setVisitWindowStart] = useState(
    data.decisions.proposedVisitWindow?.start
      ? new Date(data.decisions.proposedVisitWindow.start).toISOString().slice(0, 16)
      : ''
  );
  const [visitWindowEnd, setVisitWindowEnd] = useState(
    data.decisions.proposedVisitWindow?.end
      ? new Date(data.decisions.proposedVisitWindow.end).toISOString().slice(0, 16)
      : ''
  );
  const [estimatedCost, setEstimatedCost] = useState(
    data.decisions.estimatedCost?.toString() || ''
  );
  const [maxApprovedCost, setMaxApprovedCost] = useState(
    data.decisions.maxApprovedCost?.toString() || ''
  );

  // Editable drafts
  const [occupierDraft, setOccupierDraft] = useState<EmailDraft>(
    data.drafts.occupierAcknowledgement
  );
  const [vendorDraft, setVendorDraft] = useState<EmailDraft>(
    data.drafts.vendorDispatch
  );
  const [internalDraft, setInternalDraft] = useState<EmailDraft>(
    data.drafts.internalNote
  );

  // Enabled actions
  const [enabledActions, setEnabledActions] = useState<Set<ScheduledActionType>>(
    new Set(data.scheduledActions.map((a) => a.actionType))
  );

  // Fetch vendors on mount
  useEffect(() => {
    async function fetchVendors() {
      try {
        const res = await fetch('/api/maintenance/vendors');
        const json = await res.json();
        if (json.vendors) {
          setVendors(json.vendors);
        }
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    }
    fetchVendors();
  }, []);

  const toggleAction = (actionType: ScheduledActionType) => {
    setEnabledActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionType)) {
        next.delete(actionType);
      } else {
        next.add(actionType);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/maintenance/approve-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawEmailText,
          extracted: data.extracted,
          decisions: data.decisions,
          drafts: {
            occupierAcknowledgement: occupierDraft,
            vendorDispatch: vendorDraft,
            internalNote: internalDraft,
          },
          scheduledActions: data.scheduledActions,
          overrides: {
            vendorId: selectedVendorId,
            visitWindowStart: visitWindowStart ? new Date(visitWindowStart).toISOString() : undefined,
            visitWindowEnd: visitWindowEnd ? new Date(visitWindowEnd).toISOString() : undefined,
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
            maxApprovedCost: maxApprovedCost ? parseFloat(maxApprovedCost) : undefined,
            enabledActionTypes: Array.from(enabledActions),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve plan');
      }

      // Redirect to work order detail page
      router.push(`/maintenance/work-orders/${result.workOrderId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (confirm('Are you sure you want to discard this plan?')) {
      router.push('/maintenance');
    }
  };

  const { extracted, decisions, scheduledActions, resolvedEntityData } = data;

  // Get resolved entity data for display
  const propertyName = resolvedEntityData?.property?.name || extracted.propertyName;
  const propertyAddress = resolvedEntityData?.property?.address;
  const spaceLabel = resolvedEntityData?.space?.spaceLabel || extracted.spaceLabel;
  const occupierName = resolvedEntityData?.occupier?.brandName ||
    resolvedEntityData?.occupier?.legalName ||
    extracted.occupierName;

  // Build location string
  const location = [propertyName, spaceLabel].filter(Boolean).join(' – ');
  const occupierDisplay = occupierName ? `(${occupierName})` : '';

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* AI-Generated Plan Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">AI-Generated Response Plan</h3>
            <p className="text-sm text-blue-800 mt-1">
              Review, edit, and approve this plan. All routing decisions, communications, and follow-ups
              are suggestions created from the occupier&apos;s email.
            </p>
          </div>
        </div>
      </div>

      {/* Card 1: Issue Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Issue Summary</h2>

        <div className="mb-4">
          <p className="text-lg font-medium text-gray-900">
            {location || 'Property Not Specified'} {occupierDisplay}
          </p>
          {propertyAddress && (
            <p className="text-sm text-gray-600 mt-1">{propertyAddress}</p>
          )}
          <p className="text-gray-700 mt-3">{extracted.description}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <StatusBadge variant="priority" value={decisions.priority} showLabel />
          <StatusBadge variant="sla" value={`Vendor on-site within ${decisions.slaHours}h`} />
          <StatusBadge variant="impact" value={decisions.businessImpact} showLabel />
          <StatusBadge variant="category" value={extracted.issueCategory} showLabel />
        </div>

        {extracted.accessConstraints && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Access Constraints:</strong> {extracted.accessConstraints}
            </p>
          </div>
        )}
      </div>

      {/* Card 2: Routing & Decisions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Routing & Decisions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Vendor
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedVendorId || ''}
              onChange={(e) => setSelectedVendorId(e.target.value || null)}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.trade})
                </option>
              ))}
            </select>
          </div>

          {/* Visit Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposed Visit Window
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={visitWindowStart}
                onChange={(e) => setVisitWindowStart(e.target.value)}
              />
              <span className="self-center text-gray-500">to</span>
              <input
                type="datetime-local"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={visitWindowEnd}
                onChange={(e) => setVisitWindowEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Cost ($)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          {/* Max Approved Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Approved Cost ($)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={maxApprovedCost}
              onChange={(e) => setMaxApprovedCost(e.target.value)}
            />
          </div>
        </div>

        {/* Owner Approval Notice */}
        {decisions.needsOwnerApproval && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Owner Approval Required:</strong> Estimated cost exceeds
              auto-approval threshold. Owner authorization needed for full repair.
              Temporary mitigation up to ${decisions.maxApprovedCost} is pre-approved.
            </p>
          </div>
        )}
      </div>

      {/* Card 3: Communications */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Communications</h2>

        {/* Tabs for different drafts */}
        <div className="space-y-6">
          {/* Occupier Acknowledgement */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">
                Occupier Acknowledgement
              </h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${occupierDraft.subject}\n\n${occupierDraft.body}`
                  )
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy to Clipboard
              </button>
            </div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={occupierDraft.subject}
              onChange={(e) =>
                setOccupierDraft({ ...occupierDraft, subject: e.target.value })
              }
              placeholder="Subject"
            />
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={6}
              value={occupierDraft.body}
              onChange={(e) =>
                setOccupierDraft({ ...occupierDraft, body: e.target.value })
              }
            />
          </div>

          {/* Vendor Dispatch */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">Vendor Dispatch</h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${vendorDraft.subject}\n\n${vendorDraft.body}`
                  )
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy to Clipboard
              </button>
            </div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={vendorDraft.subject}
              onChange={(e) =>
                setVendorDraft({ ...vendorDraft, subject: e.target.value })
              }
              placeholder="Subject"
            />
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={8}
              value={vendorDraft.body}
              onChange={(e) =>
                setVendorDraft({ ...vendorDraft, body: e.target.value })
              }
            />
          </div>

          {/* Internal Note */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">Internal Note</h3>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `Subject: ${internalDraft.subject}\n\n${internalDraft.body}`
                  )
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy to Clipboard
              </button>
            </div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={internalDraft.subject}
              onChange={(e) =>
                setInternalDraft({ ...internalDraft, subject: e.target.value })
              }
              placeholder="Subject"
            />
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={8}
              value={internalDraft.body}
              onChange={(e) =>
                setInternalDraft({ ...internalDraft, body: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Card 4: Automation Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Automation Timeline</h2>

        <div className="space-y-3">
          {scheduledActions.map((action, idx) => {
            const scheduledTime = new Date(action.scheduledFor);
            const isEnabled = enabledActions.has(action.actionType);

            return (
              <label
                key={idx}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                  isEnabled
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleAction(action.actionType)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{action.description}</p>
                  <p className="text-sm text-gray-600">
                    Scheduled: {scheduledTime.toLocaleString()}
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                    {action.actionType.replace(/_/g, ' ')}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isSubmitting ? 'Processing...' : 'Approve & Execute Plan'}
        </button>
      </div>
    </div>
  );
}
