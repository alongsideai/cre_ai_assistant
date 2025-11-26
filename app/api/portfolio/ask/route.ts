import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveRelevantChunksForLeaseIds } from '@/lib/leaseIngestion';
import { callLLM } from '@/lib/llm';
import { PortfolioQuestionResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid question' },
        { status: 400 }
      );
    }

    // Find all leases that have documents with chunks (analyzed documents)
    const leasesWithChunks = await prisma.lease.findMany({
      where: {
        documents: {
          some: {
            chunks: {
              some: {},
            },
          },
        },
      },
      select: { id: true },
    });

    if (leasesWithChunks.length === 0) {
      const response: PortfolioQuestionResponse = {
        answer:
          'No leases have analyzed documents yet. Please upload and process lease documents to enable portfolio-level Q&A.',
        mode: 'no_documents',
        scope: 'portfolio',
        sourceChunks: [],
      };
      return NextResponse.json(response);
    }

    const leaseIds = leasesWithChunks.map((l) => l.id);

    // Retrieve relevant chunks across all leases
    const topChunks = await retrieveRelevantChunksForLeaseIds({
      leaseIds,
      query: question,
      topK: 10,
      maxChunksPerLease: 3,
    });

    if (topChunks.length === 0) {
      const response: PortfolioQuestionResponse = {
        answer:
          'No relevant information found in the analyzed lease documents for your question.',
        mode: 'no_documents',
        scope: 'portfolio',
        sourceChunks: [],
      };
      return NextResponse.json(response);
    }

    // Build context from chunks
    const contextText = topChunks
      .map(
        (chunk, idx) =>
          `[Context ${idx + 1}]\nTenant: ${chunk.tenantName}\nProperty: ${chunk.propertyName || 'N/A'}\nSnippet:\n"""${chunk.content}"""\n`
      )
      .join('\n');

    // Build portfolio RAG prompt
    const prompt = `You are a commercial real estate portfolio analyst.
You are answering questions about a portfolio of leases.
Use ONLY the provided lease metadata and context snippets.
When describing results, name the tenant and property clearly.
If the answer is not clearly supported by the context, say that the information is not available.

LEASE DOCUMENT EXCERPTS FROM PORTFOLIO:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
- Answer based on the lease document excerpts above
- Clearly identify which tenant(s) and property/properties you are referencing
- If multiple leases are relevant, summarize findings across them
- If the information is not in the provided context, clearly state that
- Be concise but complete

YOUR ANSWER:`;

    // Call LLM
    const answer = await callLLM(prompt);

    const response: PortfolioQuestionResponse = {
      answer,
      mode: 'rag',
      scope: 'portfolio',
      sourceChunks: topChunks.map((c) => ({
        leaseId: c.leaseId,
        tenantName: c.tenantName,
        propertyId: c.propertyId,
        propertyName: c.propertyName,
        chunkIndex: c.chunkIndex,
        snippet: c.content.slice(0, 300),
        similarity: Math.round(c.similarity * 100) / 100,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing portfolio question:', error);
    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
