'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScheduledActionInfo {
  id: string;
  actionType: string;
  description: string;
  scheduledFor: string;
  workOrderId: string;
  property: string;
  space: string | null;
}

interface AutomationStatus {
  dueNow: {
    count: number;
    actions: ScheduledActionInfo[];
  };
  upcoming: {
    count: number;
    actions: ScheduledActionInfo[];
  };
}

interface RunResult {
  actionId: string;
  actionType: string;
  workOrderId: string;
  property: string;
  messageCreated: boolean;
  error?: string;
}

interface RunResponse {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  message: string;
  results: RunResult[];
}

function getActionTypeColor(actionType: string) {
  switch (actionType) {
    case 'VENDOR_FOLLOWUP':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'OCCUPIER_CHECKIN':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'ESCALATION_INTERNAL':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function formatActionType(actionType: string) {
  return actionType.replace(/_/g, ' ');
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);

  if (diffMs < 0) {
    const absMins = Math.abs(diffMins);
    const absHours = Math.abs(diffHours);
    if (absMins < 60) return `${absMins} min ago`;
    if (absHours < 24) return `${absHours} hr ago`;
    return date.toLocaleDateString();
  } else {
    if (diffMins < 60) return `in ${diffMins} min`;
    if (diffHours < 24) return `in ${diffHours} hr`;
    return date.toLocaleDateString();
  }
}

export default function AutomationPage() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunResult, setLastRunResult] = useState<RunResponse | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/maintenance/run-automation');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAutomation = async () => {
    setIsRunning(true);
    setLastRunResult(null);

    try {
      const response = await fetch('/api/maintenance/run-automation', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to run automation');
      }

      setLastRunResult(result);
      // Refresh status after running
      await fetchStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Automation Runner
            </h1>
            <p className="text-gray-600 mt-1">
              Process scheduled follow-ups, check-ins, and escalations
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunAutomation}
            disabled={isRunning || (status?.dueNow.count === 0)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Running...
              </span>
            ) : (
              'Run Automation Sweep'
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Last Run Result */}
        {lastRunResult && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              lastRunResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <h3 className="font-semibold mb-2">
              {lastRunResult.success ? '✓ Automation Complete' : '⚠ Automation Complete with Issues'}
            </h3>
            <p className="text-sm mb-3">{lastRunResult.message}</p>
            {lastRunResult.results.length > 0 && (
              <div className="space-y-2">
                {lastRunResult.results.map((result) => (
                  <div
                    key={result.actionId}
                    className={`text-sm p-2 rounded ${
                      result.error ? 'bg-red-100' : 'bg-white'
                    }`}
                  >
                    <span className="font-medium">
                      {formatActionType(result.actionType)}
                    </span>
                    <span className="text-gray-600"> at {result.property}</span>
                    {result.error && (
                      <span className="text-red-600 ml-2">- {result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading automation status...</p>
          </div>
        ) : (
          <>
            {/* Due Now Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Due Now
                  <span
                    className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      status?.dueNow.count
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {status?.dueNow.count || 0}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Refresh
                </button>
              </div>

              {status?.dueNow.count === 0 ? (
                <p className="text-gray-500">No actions due at this time.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Action Type
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Property
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Space
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Scheduled
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Work Order
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {status?.dueNow.actions.map((action) => (
                        <tr
                          key={action.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionTypeColor(
                                action.actionType
                              )}`}
                            >
                              {formatActionType(action.actionType)}
                            </span>
                          </td>
                          <td className="py-3 px-3">{action.property}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {action.space || '-'}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {formatRelativeTime(action.scheduledFor)}
                          </td>
                          <td className="py-3 px-3">
                            <Link
                              href={`/maintenance/work-orders/${action.workOrderId}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              #{action.workOrderId.slice(-8).toUpperCase()}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Upcoming Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Upcoming (Next 24 Hours)
                <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                  {status?.upcoming.count || 0}
                </span>
              </h2>

              {status?.upcoming.count === 0 ? (
                <p className="text-gray-500">No actions scheduled in the next 24 hours.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Action Type
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Property
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Space
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Scheduled For
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-gray-600">
                          Work Order
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {status?.upcoming.actions.map((action) => (
                        <tr
                          key={action.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionTypeColor(
                                action.actionType
                              )}`}
                            >
                              {formatActionType(action.actionType)}
                            </span>
                          </td>
                          <td className="py-3 px-3">{action.property}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {action.space || '-'}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {formatRelativeTime(action.scheduledFor)}
                            <span className="text-xs text-gray-400 ml-2">
                              ({new Date(action.scheduledFor).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })})
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <Link
                              href={`/maintenance/work-orders/${action.workOrderId}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              #{action.workOrderId.slice(-8).toUpperCase()}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">
                About Automation
              </h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>
                  <strong>Vendor Follow-up:</strong> Sends email to vendor requesting status update
                </li>
                <li>
                  <strong>Occupier Check-in:</strong> Sends courtesy update to the tenant
                </li>
                <li>
                  <strong>Escalation Internal:</strong> Creates internal note flagging attention needed
                </li>
              </ul>
              <p className="text-sm text-purple-700 mt-3">
                In production, this would run on a cron schedule. For demo purposes, click
                &quot;Run Automation Sweep&quot; to manually process due actions.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
