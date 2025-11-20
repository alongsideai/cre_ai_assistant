'use client';

import { useState, useEffect } from 'react';

interface Lease {
  id: string;
  tenantName: string;
  property: {
    name: string;
  };
}

export default function LeasePdfUpload() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      const response = await fetch('/api/leases');
      const data = await response.json();
      if (data.success) {
        setLeases(data.leases);
      }
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !selectedLeaseId) {
      setMessage({ type: 'error', text: 'Please select a lease and file' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('leaseId', selectedLeaseId);
      formData.append('file', file);

      const response = await fetch('/api/upload-lease-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setFile(null);
        setSelectedLeaseId('');
        // Reset file input
        const fileInput = document.getElementById('leasePdfFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading leases...</div>;
  }

  if (leases.length === 0) {
    return (
      <div className="text-gray-600">
        No leases available. Please upload a rent roll first.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="leaseSelect" className="block text-sm font-medium text-gray-700 mb-2">
          Select Lease
        </label>
        <select
          id="leaseSelect"
          value={selectedLeaseId}
          onChange={(e) => setSelectedLeaseId(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={uploading}
        >
          <option value="">-- Choose a lease --</option>
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.property.name} - {lease.tenantName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="leasePdfFile" className="block text-sm font-medium text-gray-700 mb-2">
          PDF File
        </label>
        <input
          id="leasePdfFile"
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          disabled={uploading}
        />
      </div>

      <button
        type="submit"
        disabled={uploading || !file || !selectedLeaseId}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Uploading...' : 'Upload Lease PDF'}
      </button>

      {message && (
        <div
          className={`p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}
