import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveRelevantChunks } from '@/lib/leaseIngestion';
import { callLLM } from '@/lib/llm';
import { LeaseQuestionResponse } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: leaseId } = params;
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid question' },
        { status: 400 }
      );
    }

    // Fetch lease with related data
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: true,
        documents: {
          include: {
            chunks: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Format lease metadata
    const metadata = {
      tenantName: lease.tenantName,
      propertyName: lease.property?.name || 'N/A',
      address: lease.property?.address || 'N/A',
      suite: lease.suite || undefined,
      squareFeet: lease.squareFeet || undefined,
      baseRent: lease.baseRent || undefined,
      leaseStart: lease.leaseStart?.toISOString().split('T')[0],
      leaseEnd: lease.leaseEnd?.toISOString().split('T')[0],
    };

    const hasChunks = lease.documents.some((doc) => doc.chunks.length > 0);

    // Determine mode: RAG or metadata-only
    let mode: 'rag' | 'metadata_only' = 'metadata_only';
    let answer: string;
    let sourceChunks: LeaseQuestionResponse['sourceChunks'] = [];

    if (hasChunks) {
      // RAG MODE: Retrieve relevant chunks and use them to answer
      console.log(`[RAG] Processing question for lease ${leaseId} with RAG mode`);

      try {
        const relevantChunks = await retrieveRelevantChunks({
          leaseId,
          query: question,
          topK: 5,
        });

        if (relevantChunks.length > 0) {
          mode = 'rag';

          // Build context from chunks
          const contextText = relevantChunks
            .map(
              (chunk, idx) =>
                `[Context ${idx + 1}]:\n${chunk.content}\n`
            )
            .join('\n');

          // Prepare source chunks for response
          sourceChunks = relevantChunks.map((chunk) => ({
            chunkIndex: chunk.chunkIndex,
            snippet: chunk.content.substring(0, 200) + '...',
            similarity: Math.round(chunk.similarity * 100) / 100,
          }));

          // Build RAG prompt
          const prompt = buildRAGPrompt({
            metadata,
            contextText,
            question,
          });

          // Call LLM
          answer = await callLLM(prompt);
        } else {
          // No relevant chunks found, fall back to metadata-only
          console.log(
            `[RAG] No relevant chunks found for lease ${leaseId}, falling back to metadata-only`
          );
          mode = 'metadata_only';
          answer = await answerFromMetadata({ metadata, question });
        }
      } catch (error) {
        console.error('[RAG] Error in RAG pipeline:', error);
        // Fall back to metadata-only on error
        mode = 'metadata_only';
        answer = await answerFromMetadata({ metadata, question });
      }
    } else {
      // METADATA-ONLY MODE: No chunks available
      console.log(
        `[RAG] No chunks available for lease ${leaseId}, using metadata-only mode`
      );
      answer = await answerFromMetadata({ metadata, question });
    }

    const response: LeaseQuestionResponse = {
      answer,
      mode,
      sourceChunks: mode === 'rag' ? sourceChunks : undefined,
      metadata,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing lease question:', error);
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
 * Build a RAG prompt with metadata and retrieved context
 */
function buildRAGPrompt(params: {
  metadata: any;
  contextText: string;
  question: string;
}): string {
  const { metadata, contextText, question } = params;

  return `You are a commercial real estate lease analyst. Answer questions about this lease accurately based on the provided context. If information is not present in the context, say you don't know rather than guessing.

LEASE METADATA:
- Tenant: ${metadata.tenantName}
- Property: ${metadata.propertyName}
- Address: ${metadata.address}
- Suite: ${metadata.suite || 'N/A'}
- Square Feet: ${metadata.squareFeet || 'N/A'}
- Base Rent: ${metadata.baseRent ? `$${metadata.baseRent}/month` : 'N/A'}
- Lease Start: ${metadata.leaseStart || 'N/A'}
- Lease End: ${metadata.leaseEnd || 'N/A'}

LEASE DOCUMENT EXCERPTS:
${contextText}

USER QUESTION:
${question}

INSTRUCTIONS:
- Answer based on the lease metadata and document excerpts above
- Be specific and reference relevant details from the context
- If the answer is not in the provided context, clearly state that you don't have that information
- Keep your answer concise but complete

YOUR ANSWER:`;
}

/**
 * Answer a question using only lease metadata (fallback mode)
 */
async function answerFromMetadata(params: {
  metadata: any;
  question: string;
}): Promise<string> {
  const { metadata, question } = params;

  const prompt = `You are a commercial real estate lease analyst. Answer the following question about a lease using ONLY the lease metadata provided below. If the information is not available in the metadata, clearly state that.

LEASE METADATA:
- Tenant: ${metadata.tenantName}
- Property: ${metadata.propertyName}
- Address: ${metadata.address}
- Suite: ${metadata.suite || 'N/A'}
- Square Feet: ${metadata.squareFeet || 'N/A'}
- Base Rent: ${metadata.baseRent ? `$${metadata.baseRent}/month` : 'N/A'}
- Lease Start: ${metadata.leaseStart || 'N/A'}
- Lease End: ${metadata.leaseEnd || 'N/A'}

Note: No lease document text is available. Answer based only on the metadata above.

USER QUESTION:
${question}

YOUR ANSWER:`;

  return await callLLM(prompt);
}
