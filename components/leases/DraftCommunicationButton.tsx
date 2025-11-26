'use client';

import { useState } from 'react';

interface DraftCommunicationButtonProps {
  leaseId: string;
  tenantName?: string;
}

export default function DraftCommunicationButton({
  leaseId,
  tenantName,
}: DraftCommunicationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [intent, setIntent] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIntent('');
    setAdditionalContext('');
    setDraft(null);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDraft(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!intent) {
      setError('Please select a communication type');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDraft(null);

    try {
      const response = await fetch('/api/communications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          leaseId,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDraft({
          subject: data.subject,
          body: data.body,
        });
      } else {
        setError(data.error || 'Failed to generate draft');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Draft Tenant Email
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Draft Tenant Email
                {tenantName && (
                  <span className="text-base font-normal text-gray-600 ml-2">
                    for {tenantName}
                  </span>
                )}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!draft ? (
                <>
                  {/* Intent Selection */}
                  <div className="mb-4">
                    <label
                      htmlFor="intent"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Communication Type *
                    </label>
                    <select
                      id="intent"
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isGenerating}
                    >
                      <option value="">Select type...</option>
                      <option value="RENEWAL_NOTICE">Renewal Notice</option>
                      <option value="RENEWAL_REMINDER">Renewal Reminder</option>
                      <option value="RENT_ADJUSTMENT">Rent Adjustment</option>
                      <option value="GENERAL_NOTICE">General Notice</option>
                    </select>
                  </div>

                  {/* Additional Context */}
                  <div className="mb-6">
                    <label
                      htmlFor="context"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Additional Context (Optional)
                    </label>
                    <textarea
                      id="context"
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      placeholder="E.g., We'd like to offer a 3-year renewal at a 3% annual increase..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={isGenerating}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={!intent || isGenerating}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Draft'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Draft Result */}
                  <div className="space-y-4">
                    {/* Subject */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Subject
                        </label>
                        <button
                          onClick={() => handleCopyToClipboard(draft.subject)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Copy
                        </button>
                      </div>
                      <textarea
                        value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                        rows={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-medium"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Body
                        </label>
                        <button
                          onClick={() => handleCopyToClipboard(draft.body)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Copy
                        </button>
                      </div>
                      <textarea
                        value={draft.body}
                        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none whitespace-pre-wrap font-mono text-sm"
                      />
                    </div>

                    {/* Success Message */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                      Draft generated successfully! You can edit the text above and copy it to
                      your email client.
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setDraft(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Generate Another
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
