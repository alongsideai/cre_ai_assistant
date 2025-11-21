'use client';

import { useState } from 'react';
import { LeaseQuestionResponse } from '@/lib/types';

interface LeaseQAProps {
  leaseId: string;
  hasDocument?: boolean;
}

interface QAHistoryItem {
  question: string;
  answer: string;
  mode: 'rag' | 'metadata_only';
  sourceChunks?: {
    chunkIndex: number;
    snippet: string;
    similarity?: number;
  }[];
}

export default function LeaseQA({ leaseId, hasDocument = false }: LeaseQAProps) {
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
      const response = await fetch(`/api/leases/${leaseId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data: LeaseQuestionResponse = await response.json();

      if (response.ok) {
        setHistory([
          ...history,
          {
            question: question.trim(),
            answer: data.answer,
            mode: data.mode,
            sourceChunks: data.sourceChunks,
          },
        ]);
        setQuestion('');
      } else {
        setError((data as any).error || 'Failed to get answer');
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
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Answer:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{item.answer}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Answer source:</span>
                  {item.mode === 'rag' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">
                      📄 Lease Document + Metadata
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                      📋 Lease Metadata Only
                    </span>
                  )}
                </div>
                {item.sourceChunks && item.sourceChunks.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      Show context ({item.sourceChunks.length} chunks used)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {item.sourceChunks.map((chunk, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded p-2 text-xs"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-500">Chunk {chunk.chunkIndex + 1}</span>
                            {chunk.similarity !== undefined && (
                              <span className="text-gray-500">
                                Relevance: {(chunk.similarity * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700">{chunk.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
