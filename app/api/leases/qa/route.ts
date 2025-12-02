import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';
import { searchClausesByVector, ClauseSearchResult } from '@/lib/leases/vectorStore';
import { inferTopicsFromQuestion, ClauseTopic, ResponsibleParty } from '@/lib/leases/classifier';

// Response type for lease Q&A
export interface LeaseQAResponse {
  answer: string;
  responsibleParty?: 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN';
  citations: Array<{
    leaseId: string;
    leaseName?: string | null;
    propertyName?: string | null;
    tenantName?: string | null;
    sectionLabel?: string | null;
    textSnippet: string;
    pageNumber?: number | null;
    topic?: string;
    responsibleParty?: string;
  }>;
  mode: 'clause_rag' | 'no_clauses';
}

// Request body type
interface LeaseQARequest {
  question: string;
  leaseId?: string;
  filters?: {
    propertyId?: string;
    tenantName?: string;
    topic?: ClauseTopic;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: LeaseQARequest = await request.json();
    const { question, leaseId, filters } = body;

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid question' },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // Infer topics from question if not explicitly provided
    const inferredTopics = filters?.topic
      ? [filters.topic]
      : inferTopicsFromQuestion(trimmedQuestion);

    // Search for relevant clauses
    const searchResults = await searchClausesByVector({
      query: trimmedQuestion,
      leaseId,
      propertyId: filters?.propertyId,
      tenantName: filters?.tenantName,
      topics: inferredTopics.length > 0 ? inferredTopics : undefined,
      topK: 10, // Increased for better coverage
      minSimilarity: 0.25,
    });

    // If no clauses found with topic filter, try without
    let finalResults = searchResults;
    if (searchResults.length === 0 && inferredTopics.length > 0) {
      finalResults = await searchClausesByVector({
        query: trimmedQuestion,
        leaseId,
        propertyId: filters?.propertyId,
        tenantName: filters?.tenantName,
        topK: 10,
        minSimilarity: 0.25,
      });
    }

    // If still no clauses, return a no-clauses response
    if (finalResults.length === 0) {
      const response: LeaseQAResponse = {
        answer: leaseId
          ? 'No indexed clauses found for this lease. Please ensure the lease document has been processed through the indexing script.'
          : 'No relevant clauses found in the portfolio. Please ensure lease documents have been indexed.',
        citations: [],
        mode: 'no_clauses',
      };
      return NextResponse.json(response);
    }

    // Get lease context for better answers
    let leaseContext = '';
    if (leaseId) {
      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { property: true },
      });
      if (lease) {
        leaseContext = `
LEASE CONTEXT:
- Tenant: ${lease.tenantName}
- Property: ${lease.property?.name || 'Unknown'}
- Address: ${lease.property?.address || 'Unknown'}
- Suite: ${lease.suite || 'N/A'}
- Lease Start: ${lease.leaseStart?.toISOString().split('T')[0] || 'N/A'}
- Lease End: ${lease.leaseEnd?.toISOString().split('T')[0] || 'N/A'}
`;
      }
    }

    // Build context from retrieved clauses - grouped by property/tenant
    const clauseContext = buildClauseContext(finalResults, !leaseId);

    // Build the RAG prompt with executive-style instructions
    const prompt = buildExecutiveRAGPrompt({
      question: trimmedQuestion,
      clauseContext,
      leaseContext,
      isPortfolioWide: !leaseId,
    });

    // Call LLM
    const llmResponse = await callLLM(prompt);

    // Parse the response
    const { answer, responsibleParty } = parseClauseResponse(llmResponse, finalResults);

    // Build citations with additional metadata
    const citations = finalResults.slice(0, 8).map((clause) => ({
      leaseId: clause.leaseId,
      leaseName: null,
      propertyName: clause.propertyName || null,
      tenantName: clause.tenantName || null,
      sectionLabel: clause.sectionLabel,
      textSnippet: clause.textSnippet,
      pageNumber: clause.pageNumber,
      topic: clause.topic,
      responsibleParty: clause.responsibleParty,
    }));

    const response: LeaseQAResponse = {
      answer,
      responsibleParty,
      citations,
      mode: 'clause_rag',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in lease QA:', error);
    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Build clause context, grouped by property/tenant for portfolio queries
 */
function buildClauseContext(clauses: ClauseSearchResult[], groupByLease: boolean): string {
  if (!groupByLease) {
    // Single lease - simple list
    return clauses
      .map((clause, idx) => {
        const header = clause.sectionLabel
          ? `[${idx + 1}. ${clause.sectionLabel}]`
          : `[${idx + 1}]`;
        return `${header}
Topic: ${clause.topic} | Responsible: ${clause.responsibleParty}
${clause.text}`;
      })
      .join('\n\n---\n\n');
  }

  // Portfolio - group by property/tenant
  const grouped = new Map<string, ClauseSearchResult[]>();

  for (const clause of clauses) {
    const key = `${clause.propertyName || 'Unknown Property'} - ${clause.tenantName || 'Unknown Tenant'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(clause);
  }

  const sections: string[] = [];
  let clauseNum = 1;

  for (const [key, groupClauses] of grouped) {
    const clauseTexts = groupClauses.map((clause) => {
      const header = clause.sectionLabel
        ? `[${clauseNum}. ${clause.sectionLabel}]`
        : `[${clauseNum}]`;
      clauseNum++;
      return `${header}
Topic: ${clause.topic} | Responsible: ${clause.responsibleParty}
${clause.text}`;
    });

    sections.push(`=== ${key} ===\n\n${clauseTexts.join('\n\n')}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Build the RAG prompt with executive-style formatting instructions
 */
function buildExecutiveRAGPrompt(params: {
  question: string;
  clauseContext: string;
  leaseContext: string;
  isPortfolioWide: boolean;
}): string {
  const { question, clauseContext, leaseContext, isPortfolioWide } = params;

  const scope = isPortfolioWide
    ? 'You are analyzing clauses from MULTIPLE leases across a CRE portfolio.'
    : 'You are analyzing clauses from a SINGLE lease.';

  return `You are an AI lease analyst for commercial real estate (CRE).
Using ONLY the clauses provided below, answer the user's question in a concise, executive-style format.

${scope}
${leaseContext}

RELEVANT LEASE CLAUSES:
${clauseContext}

USER QUESTION:
${question}

RESPONSE FORMAT INSTRUCTIONS:
1. Start with a 1-3 sentence SUMMARY that directly answers the question
2. If the question is about responsibility (who pays, who maintains, who is liable), clearly state:
   "Responsible Party: [LANDLORD/TENANT/SHARED]"
3. Provide a short bullet list of KEY POINTS (3-5 bullets max)
4. ${isPortfolioWide ? 'Group findings BY LEASE if there are differences across properties/tenants' : 'Reference specific sections when citing the lease'}
5. Be direct and factual - avoid speculation beyond what the clauses state

Example structure:
---
[1-3 sentence summary]

Responsible Party: [LANDLORD/TENANT/SHARED]

Key Points:
- Point 1
- Point 2
- Point 3

${isPortfolioWide ? 'By Lease:\n- Property A - Tenant X: ...\n- Property B - Tenant Y: ...' : ''}
---

YOUR ANSWER:`;
}

/**
 * Parse the LLM response to extract structured data
 */
function parseClauseResponse(
  response: string,
  clauses: ClauseSearchResult[]
): {
  answer: string;
  responsibleParty?: 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN';
} {
  // Look for responsible party in the response
  let responsibleParty: 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN' | undefined;

  const responsibleMatch = response.match(
    /responsible\s*party[:\s]+(\w+)/i
  );
  if (responsibleMatch) {
    const party = responsibleMatch[1].toUpperCase();
    if (['LANDLORD', 'TENANT', 'SHARED', 'UNKNOWN'].includes(party)) {
      responsibleParty = party as 'LANDLORD' | 'TENANT' | 'SHARED' | 'UNKNOWN';
    }
  }

  // If not found in response, try to infer from clause data
  if (!responsibleParty && clauses.length > 0) {
    const partyVotes: Record<string, number> = {};
    for (const clause of clauses) {
      const party = clause.responsibleParty;
      partyVotes[party] = (partyVotes[party] || 0) + clause.similarity;
    }

    // Get the party with highest weighted votes (excluding UNKNOWN unless only option)
    const sortedParties = Object.entries(partyVotes)
      .filter(([party]) => party !== 'UNKNOWN' || Object.keys(partyVotes).length === 1)
      .sort((a, b) => b[1] - a[1]);

    if (sortedParties.length > 0) {
      responsibleParty = sortedParties[0][0] as
        | 'LANDLORD'
        | 'TENANT'
        | 'SHARED'
        | 'UNKNOWN';
    }
  }

  return {
    answer: response.trim(),
    responsibleParty,
  };
}
