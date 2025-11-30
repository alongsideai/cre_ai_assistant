'use client';

import React, { useState } from 'react';

type DraftWorkOrderUpdateButtonProps = {
  documentId: string;
  tenantName?: string;
};

export function DraftWorkOrderUpdateButton({
  documentId,
  tenantName,
}: DraftWorkOrderUpdateButtonProps) {
  const [open, setOpen] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/communications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'WORK_ORDER_UPDATE',
          documentId,
          additionalContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate communication');
      }

      const data = await res.json();

      if (!data.success || !data.subject || !data.body) {
        throw new Error('Unexpected response from AI');
      }

      setSubject(data.subject);
      setBody(data.body);
    } catch (err: unknown) {
      console.error('Failed to draft work order update', err);
      setError(err instanceof Error ? err.message : 'Failed to draft work order update');
    } finally {
      setLoading(false);
    }
  }

  function resetDraft() {
    setSubject('');
    setBody('');
    setError(null);
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${label} copied!`);
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset state when closing
    setSubject('');
    setBody('');
    setError(null);
    setAdditionalContext('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
      >
        Draft Tenant Update
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Draft Tenant Update</h2>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Use AI to draft a professional update email back to the tenant for this work order.
              {tenantName ? ` This will be addressed to ${tenantName}.` : null}
            </p>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Additional context (optional)
            </label>
            <textarea
              className="mb-4 h-24 w-full rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g., Plumber is scheduled for 2pm today, we will also inspect the unit above for leaks."
            />

            {error && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {copyMessage && (
              <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {copyMessage}
              </div>
            )}

            {!subject && !body && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Update'}
              </button>
            )}

            {(subject || body) && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(subject, 'Subject')}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
                  <div className="flex gap-2">
                    <textarea
                      className="h-48 flex-1 rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(body, 'Body')}
                      className="h-10 self-start rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Generate another
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
