'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PortfolioQuestionResponse } from '@/lib/types';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Lease {
  id: string;
  tenantName: string;
  suite: string | null;
  squareFeet: number | null;
  baseRent: number | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  hasChunks: boolean;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error('Property not found');
      }
      const data = await response.json();
      setProperty(data.property);
      setLeases(data.leases);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600">Loading property...</p>
        </div>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-200 text-red-800 rounded-lg p-6">
            <p className="font-semibold">Error loading property</p>
            <p className="text-sm mt-1">{error || 'Unknown error'}</p>
          </div>
          <Link
            href="/properties"
            className="inline-block mt-4 text-blue-600 hover:text-blue-800 underline"
          >
            Back to Properties
          </Link>
        </div>
      </main>
    );
  }

  const leasesWithDocs = leases.filter((l) => l.hasChunks).length;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-600 mt-1">{property.address}</p>
          </div>
          <div className="space-x-2">
            <Link
              href="/properties"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Back to Properties
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Property Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Leases</p>
              <p className="text-2xl font-bold text-blue-900">{leases.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Analyzed Documents</p>
              <p className="text-2xl font-bold text-green-900">{leasesWithDocs}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total SF</p>
              <p className="text-2xl font-bold text-purple-900">
                {leases.reduce((sum, l) => sum + (l.squareFeet || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Monthly Rent</p>
              <p className="text-2xl font-bold text-orange-900">
                ${leases.reduce((sum, l) => sum + (l.baseRent || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Leases List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Leases</h2>
          {leases.length === 0 ? (
            <p className="text-gray-500 italic">No leases for this property</p>
          ) : (
            <div className="space-y-3">
              {leases.map((lease) => (
                <Link
                  key={lease.id}
                  href={`/leases/${lease.id}`}
                  className="block bg-gray-50 border border-gray-200 rounded p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{lease.tenantName}</h4>
                      {lease.suite && (
                        <p className="text-sm text-gray-600">Suite: {lease.suite}</p>
                      )}
                      {lease.hasChunks && (
                        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Document Analyzed
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {lease.baseRent && (
                        <p className="font-semibold text-green-700">
                          ${lease.baseRent.toLocaleString()}/mo
                        </p>
                      )}
                      {lease.squareFeet && (
                        <p className="text-sm text-gray-600">
                          {lease.squareFeet.toLocaleString()} sq ft
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Property Q&A */}
        <PropertyQA propertyId={propertyId} propertyName={property.name} />
      </div>
    </main>
  );
}

// Property Q&A Component
function PropertyQA({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{
    question: string;
    response: PortfolioQuestionResponse;
  }>>([]);
  const [showContext, setShowContext] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data: PortfolioQuestionResponse = await response.json();
      setHistory(prev => [{ question: question.trim(), response: data }, ...prev]);
      setQuestion('');
    } catch (error) {
      console.error('Error asking property question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Ask About This Property
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Ask questions across all analyzed lease documents in {propertyName}.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g., Which tenants have renewal options after 2030?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </div>
      </form>

      {history.length > 0 && (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">
                Q: {item.question}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  item.response.mode === 'rag'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.response.mode === 'rag' ? 'Lease Documents' : 'No Documents'}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {item.response.answer}
              </p>

              {item.response.sourceChunks.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowContext(showContext === idx ? null : idx)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showContext === idx ? 'Hide context' : `Show context (${item.response.sourceChunks.length} sources)`}
                  </button>

                  {showContext === idx && (
                    <div className="mt-2 space-y-2">
                      {item.response.sourceChunks.map((chunk, cIdx) => (
                        <div key={cIdx} className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
                          <p className="font-medium text-gray-900">
                            {chunk.tenantName}
                          </p>
                          <p className="text-gray-600 mt-1">
                            {chunk.snippet}...
                          </p>
                          <p className="text-gray-400 mt-1">
                            Similarity: {(chunk.similarity * 100).toFixed(0)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
