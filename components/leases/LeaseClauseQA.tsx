'use client';

import { useState } from 'react';

interface Citation {
  leaseId: string;
  leaseName?: string | null;
  propertyName?: string | null;
  tenantName?: string | null;
  sectionLabel?: string | null;
  textSnippet: string;
  pageNumber?: number | null;
}

interface QAResponse {
  answer: string;
  responsibleParty?: 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN';
  citations: Citation[];
  mode: 'clause_rag' | 'no_clauses';
}

interface LeaseClauseQAProps {
  leaseId: string;
  tenantName: string;
}

const SUGGESTION_QUESTIONS = [
  'Who is responsible for repairs and maintenance?',
  'Who maintains HVAC and mechanical systems?',
  "Summarize the landlord's responsibilities.",
];

export default function LeaseClauseQA({ leaseId, tenantName }: LeaseClauseQAProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/leases/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText.trim(),
          leaseId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setResponse(data);
      setQuestion('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
    handleAsk(suggestion);
  };

  const getResponsiblePartyBadge = (party: string | undefined) => {
    if (!party) return null;

    const badges: Record<string, { bg: string; text: string; label: string }> = {
      LANDLORD: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Landlord' },
      TENANT: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Tenant' },
      SHARED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Shared' },
      UNKNOWN: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Unknown' },
    };

    const badge = badges[party];
    if (!badge) return null;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Ask about this lease
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Responsibility, options, caps, and key clauses.
      </p>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTION_QUESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Question input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this lease..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {/* Responsible party badge */}
          {response.responsibleParty && (
            <div className="mb-3">
              {getResponsiblePartyBadge(response.responsibleParty)}
            </div>
          )}

          {/* Answer */}
          <p className="text-sm text-gray-900 whitespace-pre-wrap mb-4">
            {response.answer}
          </p>

          {/* Citations */}
          {response.citations.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Source clauses:
              </p>
              <div className="space-y-2">
                {response.citations.slice(0, 3).map((citation, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-gray-50 rounded p-2 border border-gray-100"
                  >
                    {citation.sectionLabel && (
                      <p className="font-medium text-gray-700 mb-1">
                        {citation.sectionLabel}
                      </p>
                    )}
                    <p className="text-gray-600 line-clamp-2">
                      {citation.textSnippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No clauses message */}
          {response.mode === 'no_clauses' && (
            <p className="text-xs text-gray-500 italic">
              No indexed clauses available for this lease. Run the indexing script to enable clause-level Q&A.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
