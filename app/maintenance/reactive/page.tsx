'use client';

import { useState } from 'react';
import PlanReview from '@/components/maintenance/PlanReview';
import { HandleEmailResponse } from '@/lib/maintenance/types';
import { SAMPLE_EMAILS_LIST, SampleEmail } from '@/lib/maintenance/fixtures';

// Priority color for demo inbox
function getPriorityBadgeClass(priority: string) {
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

export default function ReactiveMaintenancePage() {
  const [rawEmailText, setRawEmailText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planData, setPlanData] = useState<HandleEmailResponse | null>(null);
  const [showDemoInbox, setShowDemoInbox] = useState(false);

  const handleIngestEmail = async () => {
    if (!rawEmailText.trim()) {
      setError('Please paste an email to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPlanData(null);

    try {
      const response = await fetch('/api/maintenance/from-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEmailText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process email');
      }

      setPlanData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectSampleEmail = (sample: SampleEmail) => {
    setRawEmailText(sample.body);
    setError(null);
    setPlanData(null);
    setShowDemoInbox(false);
  };

  const handleReset = () => {
    setRawEmailText('');
    setPlanData(null);
    setError(null);
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Reactive Maintenance
          </h1>
          <p className="text-gray-600 mt-1">
            Process occupier maintenance requests and generate work orders
          </p>
        </div>

        {/* Demo Inbox Panel */}
        {showDemoInbox && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Demo Inbox</h2>
              <button
                type="button"
                onClick={() => setShowDemoInbox(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Select a sample email to load and process. These represent common CRE maintenance scenarios.
            </p>
            <div className="space-y-3">
              {SAMPLE_EMAILS_LIST.map((sample) => (
                <button
                  key={sample.metadata.id}
                  type="button"
                  onClick={() => handleSelectSampleEmail(sample)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">{sample.metadata.subject}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeClass(
                        sample.metadata.priority
                      )}`}
                    >
                      {sample.metadata.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{sample.metadata.property}</span>
                    <span className="text-gray-400">|</span>
                    <span>{sample.metadata.category}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">{sample.metadata.from}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Intake Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Email Intake</h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDemoInbox(true)}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Demo Inbox ({SAMPLE_EMAILS_LIST.length} samples)
              </button>
              {planData && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="emailText"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Paste occupier email here
              </label>
              <textarea
                id="emailText"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                rows={12}
                value={rawEmailText}
                onChange={(e) => setRawEmailText(e.target.value)}
                placeholder="Paste the raw email text from an occupier reporting a maintenance issue, or click 'Demo Inbox' to select a sample..."
                disabled={isProcessing}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleIngestEmail}
                disabled={isProcessing || !rawEmailText.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Ingest Email'}
              </button>
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-blue-800">
                Analyzing email and generating work order plan...
              </p>
            </div>
          </div>
        )}

        {/* Plan Review */}
        {planData && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-4">Plan Review</h2>
            <PlanReview data={planData} rawEmailText={rawEmailText} />
          </div>
        )}

        {/* Help Section */}
        {!planData && !isProcessing && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
              <li>
                Paste an email from an occupier (tenant) reporting a maintenance
                issue, or select from the Demo Inbox
              </li>
              <li>
                Click &quot;Ingest Email&quot; to analyze and extract work order details
              </li>
              <li>
                Review the AI-generated plan including priority, vendor assignment,
                and communications
              </li>
              <li>
                Make any adjustments needed and click &quot;Approve &amp; Execute Plan&quot;
              </li>
              <li>
                The system will create the work order and schedule follow-up
                actions
              </li>
            </ol>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Demo:</strong> Click &quot;Demo Inbox&quot; to browse sample emails
                representing different CRE maintenance scenarios (roof leaks, HVAC issues, emergencies, etc.)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
