'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WorkOrderDetailClientProps {
  workOrderId: string;
  currentStatus: string;
  vendorConfirmedAt?: string | null;
}

export default function WorkOrderDetailClient({
  workOrderId,
  currentStatus,
  vendorConfirmedAt,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSimulate = currentStatus === 'NEW' || currentStatus === 'ASSIGNED';

  const handleSimulateConfirmation = async () => {
    if (!canSimulate) return;

    setIsSimulating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/maintenance/work-orders/${workOrderId}/simulate-vendor-confirmation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to simulate confirmation');
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (vendorConfirmedAt) {
    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Vendor Confirmed:</strong>{' '}
          {new Date(vendorConfirmedAt).toLocaleString()}
        </p>
      </div>
    );
  }

  if (!canSimulate) {
    return null;
  }

  return (
    <div className="mt-4">
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <button
        onClick={handleSimulateConfirmation}
        disabled={isSimulating}
        className="text-sm px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
        title="For demo purposes: Simulates vendor confirming the dispatch"
      >
        {isSimulating ? 'Simulating...' : 'Simulate Vendor Confirmation'}
      </button>
      <p className="text-xs text-gray-500 mt-1">
        Demo: Simulates vendor confirming dispatch
      </p>
    </div>
  );
}
