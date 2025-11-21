import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveRelevantChunksForProperty } from '@/lib/leaseIngestion';
import { callLLM } from '@/lib/llm';
import { PortfolioQuestionResponse } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: propertyId } = params;
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid question' },
        { status: 400 }
      );
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Retrieve relevant chunks for this property
    const topChunks = await retrieveRelevantChunksForProperty({
      propertyId,
      query: question,
      topK: 10,
      maxChunksPerLease: 3,
    });

    if (topChunks.length === 0) {
      const response: PortfolioQuestionResponse = {
        answer: `No analyzed lease documents are available for ${property.name} yet. Please upload and process lease documents to enable property-level Q&A.`,
        mode: 'no_documents',
        scope: 'property',
        sourceChunks: [],
      };
      return NextResponse.json(response);
    }

    // Build context from chunks
    const contextText = topChunks
      .map(
        (chunk, idx) =>
          `[Context ${idx + 1}]\nTenant: ${chunk.tenantName}\nSnippet:\n"""${chunk.content}"""\n`
      )
      .join('\n');

    // Build property RAG prompt
    const prompt = `You are a commercial real estate analyst.
You are answering questions about all leases in one property: "${property.name}" at "${property.address}".
Use the provided snippets from multiple leases within this property.
Clearly state which tenant(s) and suite(s) your answer refers to.
If the information is not in the context, say that it is not provided.

LEASE DOCUMENT EXCERPTS FROM THIS PROPERTY:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
- Answer based on the lease document excerpts above
- Clearly identify which tenant(s) you are referencing
- If multiple tenants are relevant, summarize findings across them
- If the information is not in the provided context, clearly state that
- Be concise but complete

YOUR ANSWER:`;

    // Call LLM
    const answer = await callLLM(prompt);

    const response: PortfolioQuestionResponse = {
      answer,
      mode: 'rag',
      scope: 'property',
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
    console.error('Error processing property question:', error);
    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
