'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one file' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();

      // Add all files to form data
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Successfully uploaded ${data.documents.length} file(s)`,
        });
        setFiles(null);

        // Reset file input
        const fileInput = document.getElementById('documentFiles') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        // Refresh the page to show new documents
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setUploading(false);
    }
  };

  const fileCount = files ? files.length : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
      <p className="text-sm text-gray-600 mb-4">
        Upload one or more documents to your inbox. Documents will be automatically
        processed and classified.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="documentFiles" className="block text-sm font-medium text-gray-700 mb-2">
            Select Files
          </label>
          <input
            id="documentFiles"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={uploading}
          />
          {fileCount > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {fileCount} file{fileCount > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || !files || fileCount === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : `Upload ${fileCount > 0 ? fileCount : ''} File${fileCount !== 1 ? 's' : ''}`}
        </button>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
