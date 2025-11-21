/**
 * Lease Document Ingestion Pipeline
 *
 * Handles the complete flow from PDF → text → chunks → embeddings → storage
 */

import { readFile } from 'fs/promises';
import pdf from 'pdf-parse';
import { prisma } from './prisma';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const CHUNK_SIZE = 3500; // ~800-1000 tokens
const CHUNK_OVERLAP = 350; // ~80-100 tokens overlap

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const dataBuffer = await readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`);
  }
}

/**
 * Chunk text into overlapping segments for embedding
 */
export function chunkText(
  text: string,
  options?: { maxChars?: number; overlapChars?: number }
): string[] {
  const maxChars = options?.maxChars || CHUNK_SIZE;
  const overlapChars = options?.overlapChars || CHUNK_OVERLAP;

  // Clean up the text
  const cleanedText = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleanedText.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    const endIndex = Math.min(startIndex + maxChars, cleanedText.length);
    let chunkText = cleanedText.substring(startIndex, endIndex);

    // Try to break at sentence or word boundary if not at the end
    if (endIndex < cleanedText.length) {
      // Look for sentence ending
      const lastPeriod = chunkText.lastIndexOf('. ');
      const lastQuestion = chunkText.lastIndexOf('? ');
      const lastExclamation = chunkText.lastIndexOf('! ');
      const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (lastSentence > maxChars * 0.7) {
        // If we found a sentence ending in the last 30% of the chunk, break there
        chunkText = chunkText.substring(0, lastSentence + 2);
      } else {
        // Otherwise, try to break at a word boundary
        const lastSpace = chunkText.lastIndexOf(' ');
        if (lastSpace > maxChars * 0.8) {
          chunkText = chunkText.substring(0, lastSpace);
        }
      }
    }

    chunks.push(chunkText.trim());

    // Move forward, accounting for overlap
    startIndex += chunkText.length - overlapChars;

    // Ensure we're making progress
    if (startIndex <= chunks.length * overlapChars) {
      startIndex = chunks.length * maxChars;
    }
  }

  return chunks.filter((chunk) => chunk.length > 50); // Filter out very small chunks
}

/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (chunks.length === 0) {
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: chunks,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${(error as Error).message}`);
  }
}

/**
 * Generate a single embedding for a query string
 */
export async function embedQuery(query: string): Promise<number[]> {
  const embeddings = await embedChunks([query]);
  return embeddings[0];
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Ingest a lease document: extract, chunk, embed, and store
 */
export async function ingestLeaseDocument(params: {
  leaseId: string;
  filePath: string;
}): Promise<{ chunksCreated: number; success: boolean; error?: string }> {
  const { leaseId, filePath } = params;

  try {
    console.log(`[Ingestion] Starting ingestion for lease ${leaseId}`);

    // Step 1: Extract text from PDF
    console.log(`[Ingestion] Extracting text from ${filePath}`);
    const text = await extractTextFromPdf(filePath);

    if (!text || text.trim().length === 0) {
      console.warn(`[Ingestion] No text extracted from PDF for lease ${leaseId}`);
      return { chunksCreated: 0, success: true };
    }

    // Step 2: Chunk the text
    console.log(`[Ingestion] Chunking text (${text.length} characters)`);
    const chunks = chunkText(text);
    console.log(`[Ingestion] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      console.warn(`[Ingestion] No chunks created for lease ${leaseId}`);
      return { chunksCreated: 0, success: true };
    }

    // Step 3: Generate embeddings
    console.log(`[Ingestion] Generating embeddings for ${chunks.length} chunks`);
    const embeddings = await embedChunks(chunks);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: ${embeddings.length} embeddings for ${chunks.length} chunks`
      );
    }

    // Step 4: Delete existing chunks for this lease (idempotent)
    console.log(`[Ingestion] Deleting existing chunks for lease ${leaseId}`);
    await prisma.leaseDocumentChunk.deleteMany({
      where: { leaseId },
    });

    // Step 5: Store chunks and embeddings
    console.log(`[Ingestion] Storing ${chunks.length} chunks in database`);
    const chunkRecords = chunks.map((content, index) => ({
      leaseId,
      chunkIndex: index,
      content,
      embedding: JSON.stringify(embeddings[index]),
    }));

    await prisma.leaseDocumentChunk.createMany({
      data: chunkRecords,
    });

    console.log(`[Ingestion] Successfully ingested ${chunks.length} chunks for lease ${leaseId}`);

    return {
      chunksCreated: chunks.length,
      success: true,
    };
  } catch (error) {
    console.error(`[Ingestion] Error ingesting lease ${leaseId}:`, error);
    return {
      chunksCreated: 0,
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Retrieve relevant chunks for a query
 */
export async function retrieveRelevantChunks(params: {
  leaseId: string;
  query: string;
  topK?: number;
}): Promise<
  Array<{
    chunkIndex: number;
    content: string;
    similarity: number;
  }>
> {
  const { leaseId, query, topK = 5 } = params;

  try {
    // Get all chunks for this lease
    const chunks = await prisma.leaseDocumentChunk.findMany({
      where: { leaseId },
      orderBy: { chunkIndex: 'asc' },
    });

    if (chunks.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await embedQuery(query);

    // Compute similarity for each chunk
    const chunksWithSimilarity = chunks.map((chunk) => {
      const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      return {
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        similarity,
      };
    });

    // Sort by similarity (descending) and take top K
    chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    return chunksWithSimilarity.slice(0, topK);
  } catch (error) {
    console.error(`Error retrieving chunks for lease ${leaseId}:`, error);
    return [];
  }
}

/**
 * Retrieved chunk with lease and property context for cross-lease search
 */
export interface RetrievedChunkWithLease {
  leaseId: string;
  propertyId: string | null;
  tenantName: string;
  propertyName: string | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/**
 * Retrieve relevant chunks across multiple leases
 */
export async function retrieveRelevantChunksForLeaseIds(params: {
  leaseIds: string[];
  query: string;
  topK?: number;
  maxChunksPerLease?: number;
}): Promise<RetrievedChunkWithLease[]> {
  const { leaseIds, query, topK = 10, maxChunksPerLease = 5 } = params;

  if (leaseIds.length === 0) {
    return [];
  }

  try {
    // Get all chunks for these leases with lease and property info
    const chunks = await prisma.leaseDocumentChunk.findMany({
      where: { leaseId: { in: leaseIds } },
      include: {
        lease: {
          include: {
            property: true,
          },
        },
      },
    });

    if (chunks.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await embedQuery(query);

    // Compute similarity for each chunk
    const chunksWithSimilarity = chunks.map((chunk) => {
      const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

      return {
        leaseId: chunk.leaseId,
        propertyId: chunk.lease.propertyId,
        tenantName: chunk.lease.tenantName,
        propertyName: chunk.lease.property?.name || null,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        similarity,
      };
    });

    // Group by leaseId and keep top N per lease
    const groupedByLease = new Map<string, RetrievedChunkWithLease[]>();
    for (const chunk of chunksWithSimilarity) {
      const existing = groupedByLease.get(chunk.leaseId) || [];
      existing.push(chunk);
      groupedByLease.set(chunk.leaseId, existing);
    }

    // Sort each group by similarity and limit per lease
    const limitedChunks: RetrievedChunkWithLease[] = [];
    for (const [, leaseChunks] of groupedByLease) {
      leaseChunks.sort((a, b) => b.similarity - a.similarity);
      limitedChunks.push(...leaseChunks.slice(0, maxChunksPerLease));
    }

    // Sort all results by similarity and take topK overall
    limitedChunks.sort((a, b) => b.similarity - a.similarity);

    return limitedChunks.slice(0, topK);
  } catch (error) {
    console.error('Error retrieving chunks for multiple leases:', error);
    return [];
  }
}

/**
 * Retrieve relevant chunks for all leases in a property
 */
export async function retrieveRelevantChunksForProperty(params: {
  propertyId: string;
  query: string;
  topK?: number;
  maxChunksPerLease?: number;
}): Promise<RetrievedChunkWithLease[]> {
  const { propertyId, query, topK = 10, maxChunksPerLease = 3 } = params;

  try {
    // Find all leases for this property that have chunks
    const leasesWithChunks = await prisma.lease.findMany({
      where: {
        propertyId,
        chunks: {
          some: {},
        },
      },
      select: { id: true },
    });

    if (leasesWithChunks.length === 0) {
      return [];
    }

    const leaseIds = leasesWithChunks.map((l) => l.id);

    return retrieveRelevantChunksForLeaseIds({
      leaseIds,
      query,
      topK,
      maxChunksPerLease,
    });
  } catch (error) {
    console.error(`Error retrieving chunks for property ${propertyId}:`, error);
    return [];
  }
}
