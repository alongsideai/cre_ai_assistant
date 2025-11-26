'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DocumentActionsProps {
  documentId: string;
  type: string;
}

export default function DocumentActions({ documentId, type }: DocumentActionsProps) {
  const router = useRouter();
  const [classifyLoading, setClassifyLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [forceType, setForceType] = useState('');

  const handleClassify = async (manual = false) => {
    setClassifyLoading(true);
    setMessage(null);

    try {
      const body = manual && forceType ? { forceType } : {};

      const response = await fetch(`/api/documents/${documentId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Document classified as ${data.type}${
            data.previousType !== data.type ? ` (was ${data.previousType})` : ''
          }${data.confidence ? ` (confidence: ${Math.round(data.confidence * 100)}%)` : ''}`,
        });
        // Refresh page to show updated type
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to classify document',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error occurred',
      });
    } finally {
      setClassifyLoading(false);
    }
  };

  const handleExtract = async () => {
    setExtractLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/extract-lease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Lease data extracted successfully${
            data.leaseUpdated ? ' and lease record updated' : ''
          }!`,
        });
        // Refresh page to show extracted data
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to extract lease data',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error occurred',
      });
    } finally {
      setExtractLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Document Actions</h2>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Classification Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Auto-Classification</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use AI to automatically classify this document or manually select a type.
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <button
              onClick={() => handleClassify(false)}
              disabled={classifyLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {classifyLoading ? 'Classifying...' : 'Auto-Classify with AI'}
            </button>
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label htmlFor="forceType" className="block text-xs text-gray-600 mb-1">
                Or manually select:
              </label>
              <select
                id="forceType"
                value={forceType}
                onChange={(e) => setForceType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={classifyLoading}
              >
                <option value="">Select type...</option>
                <option value="LEASE">Lease</option>
                <option value="AMENDMENT">Amendment</option>
                <option value="COI">COI</option>
                <option value="INVOICE">Invoice</option>
                <option value="EMAIL">Email</option>
                <option value="WORK_ORDER">Work Order</option>
                <option value="ABSTRACT">Abstract</option>
                <option value="RENT_ROLL">Rent Roll</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <button
              onClick={() => handleClassify(true)}
              disabled={!forceType || classifyLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Set Type
            </button>
          </div>
        </div>
      </div>

      {/* Extraction Section (only for LEASE type) */}
      {type === 'LEASE' && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Lease Data Extraction</h3>
          <p className="text-sm text-gray-600 mb-3">
            Extract structured data from this lease document (tenant name, dates, rent, etc.)
          </p>
          <button
            onClick={handleExtract}
            disabled={extractLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {extractLoading ? 'Extracting...' : 'Extract Lease Data'}
          </button>
        </div>
      )}

      {type !== 'LEASE' && (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
          Lease data extraction is only available for documents classified as LEASE.
          {type === 'OTHER' && ' Try auto-classifying this document first.'}
        </div>
      )}
    </div>
  );
}
