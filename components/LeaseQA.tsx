'use client';

import { useState } from 'react';

interface LeaseQAProps {
  leaseId: string;
}

interface QAHistoryItem {
  question: string;
  answer: string;
}

export default function LeaseQA({ leaseId }: LeaseQAProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QAHistoryItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ask-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaseId,
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setHistory([
          ...history,
          {
            question: question.trim(),
            answer: data.answer,
          },
        ]);
        setQuestion('');
      } else {
        setError(data.error || 'Failed to get answer');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Question Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the annual rent escalation percentage?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Ask Question'}
        </button>

        {error && (
          <div className="bg-red-100 text-red-800 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
      </form>

      {/* Q&A History */}
      {history.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Q&A History</h3>
          <div className="space-y-4">
            {history.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Question:</p>
                  <p className="text-gray-900">{item.question}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Answer:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
