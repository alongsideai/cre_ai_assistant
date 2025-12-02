'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Citation {
  leaseId: string;
  leaseName?: string | null;
  propertyName?: string | null;
  tenantName?: string | null;
  sectionLabel?: string | null;
  textSnippet: string;
  pageNumber?: number | null;
  topic?: string;
  responsibleParty?: string;
}

interface QAResponse {
  answer: string;
  responsibleParty?: 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN';
  citations: Citation[];
  mode: 'clause_rag' | 'no_clauses';
}

interface Property {
  id: string;
  name: string;
}

interface GroupedCitations {
  key: string;
  propertyName: string;
  tenantName: string;
  leaseId: string;
  citations: Citation[];
  dominantParty?: string;
}

type Scope = 'all' | 'property' | 'tenant';

const TOPIC_CHIPS = [
  'HVAC',
  'ROOF',
  'STRUCTURE',
  'CAM',
  'INSURANCE',
  'MAINTENANCE',
  'REPAIRS',
  'UTILITIES',
  'PARKING',
];

export default function LeaseAssistantPage() {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  // Fetch properties on mount
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (Array.isArray(data)) {
        setProperties(data);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    }
  };

  // Group citations by property/tenant
  const groupedCitations = useMemo((): GroupedCitations[] => {
    if (!response?.citations?.length) return [];

    const groups = new Map<string, GroupedCitations>();

    for (const citation of response.citations) {
      const propertyName = citation.propertyName || 'Unknown Property';
      const tenantName = citation.tenantName || 'Unknown Tenant';
      const key = `${propertyName}|||${tenantName}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          propertyName,
          tenantName,
          leaseId: citation.leaseId,
          citations: [],
        });
      }
      groups.get(key)!.citations.push(citation);
    }

    // Calculate dominant party for each group
    for (const group of groups.values()) {
      const partyCounts: Record<string, number> = {};
      for (const cit of group.citations) {
        if (cit.responsibleParty && cit.responsibleParty !== 'UNKNOWN') {
          partyCounts[cit.responsibleParty] = (partyCounts[cit.responsibleParty] || 0) + 1;
        }
      }
      const sorted = Object.entries(partyCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        group.dominantParty = sorted[0][0];
      }
    }

    return Array.from(groups.values());
  }, [response?.citations]);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const filters: any = {};

      if (scope === 'property' && selectedPropertyId) {
        filters.propertyId = selectedPropertyId;
      }

      if (scope === 'tenant' && tenantName.trim()) {
        filters.tenantName = tenantName.trim();
      }

      if (selectedTopic) {
        filters.topic = selectedTopic;
      }

      const res = await fetch('/api/leases/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setResponse(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk();
  };

  const getResponsiblePartyBadge = (party: string | undefined, size: 'sm' | 'md' = 'md') => {
    if (!party) return null;

    const badges: Record<string, { bg: string; text: string; label: string }> = {
      LANDLORD: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Landlord' },
      TENANT: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Tenant' },
      SHARED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Shared' },
      UNKNOWN: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Unknown' },
    };

    const badge = badges[party];
    if (!badge) return null;

    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm';

    return (
      <span
        className={`inline-flex items-center rounded-full font-semibold ${sizeClasses} ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  const getTopicBadge = (topic: string | undefined) => {
    if (!topic) return null;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {topic}
      </span>
    );
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Lease Clause Assistant
            </h1>
            <p className="text-gray-600 mt-1">
              Search obligations and responsibilities across your entire portfolio.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Scope selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All leases</option>
                <option value="property">By property</option>
                <option value="tenant">By tenant</option>
              </select>
            </div>

            {/* Property selector (if scope = property) */}
            {scope === 'property' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a property</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tenant input (if scope = tenant) */}
            {scope === 'tenant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant Name
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter tenant name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Topic chips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by topic (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPIC_CHIPS.map((topic) => (
                <button
                  key={topic}
                  onClick={() =>
                    setSelectedTopic(selectedTopic === topic ? null : topic)
                  }
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTopic === topic
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question input */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask a question about lease clauses
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., Who is responsible for HVAC repairs across all leases?"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 mb-6">
            {error}
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-6">
            {/* Answer card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              {/* Responsible party badge */}
              {response.responsibleParty && (
                <div className="mb-4">
                  {getResponsiblePartyBadge(response.responsibleParty)}
                </div>
              )}

              {/* Answer - render with markdown-like formatting */}
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-900 whitespace-pre-wrap">{response.answer}</div>
              </div>
            </div>

            {/* Grouped Citations */}
            {groupedCitations.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Matching Clauses by Lease ({response.citations.length} total)
                </h3>

                <div className="space-y-6">
                  {groupedCitations.map((group) => (
                    <div
                      key={group.key}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Group header */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {group.propertyName}
                          </h4>
                          <p className="text-sm text-gray-600">{group.tenantName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {group.dominantParty && getResponsiblePartyBadge(group.dominantParty, 'sm')}
                          <Link
                            href={`/leases/${group.leaseId}/overview`}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Lease
                          </Link>
                        </div>
                      </div>

                      {/* Group clauses */}
                      <div className="divide-y divide-gray-100">
                        {group.citations.map((citation, idx) => (
                          <div key={idx} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {citation.sectionLabel && (
                                    <span className="text-sm font-medium text-gray-700">
                                      {citation.sectionLabel}
                                    </span>
                                  )}
                                  {getTopicBadge(citation.topic)}
                                  {citation.responsibleParty && citation.responsibleParty !== 'UNKNOWN' && (
                                    getResponsiblePartyBadge(citation.responsibleParty, 'sm')
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {citation.textSnippet}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No clauses message */}
            {response.mode === 'no_clauses' && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-500 italic">
                  No indexed clauses found. Run the indexing script to enable clause-level Q&A.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
