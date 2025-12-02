/**
 * Vector Store Abstraction for Lease Clauses
 *
 * Stores and retrieves clause embeddings using the existing SQLite + in-memory
 * cosine similarity approach (same as DocumentChunk).
 */

import { prisma } from '@/lib/prisma';
import { embedChunks, embedQuery, cosineSimilarity } from '@/lib/leaseIngestion';
import { ClauseTopic, ResponsibleParty } from './classifier';

export interface LeaseClauseMetadata {
  leaseId: string;
  topic: ClauseTopic;
  responsibleParty: ResponsibleParty;
  sectionLabel: string | null;
  pageNumber: number | null;
}

export interface ClauseSearchResult {
  clauseId: string;
  leaseId: string;
  topic: string;
  responsibleParty: string;
  sectionLabel: string | null;
  text: string;
  textSnippet: string;
  pageNumber: number | null;
  similarity: number;
  // Joined from lease
  tenantName?: string;
  propertyName?: string;
  propertyId?: string;
}

/**
 * Upsert (create or update) a lease clause with its embedding
 */
export async function upsertLeaseClauseEmbedding(params: {
  clauseId?: string;
  leaseId: string;
  text: string;
  topic: ClauseTopic;
  responsibleParty: ResponsibleParty;
  sectionLabel: string | null;
  pageNumber: number | null;
}): Promise<string> {
  const { clauseId, leaseId, text, topic, responsibleParty, sectionLabel, pageNumber } =
    params;

  // Generate embedding
  const embeddings = await embedChunks([text]);
  const embedding = embeddings[0];

  if (clauseId) {
    // Update existing clause
    await prisma.leaseClause.update({
      where: { id: clauseId },
      data: {
        text,
        topic,
        responsibleParty,
        sectionLabel,
        pageNumber,
        embedding: JSON.stringify(embedding),
      },
    });
    return clauseId;
  } else {
    // Create new clause
    const clause = await prisma.leaseClause.create({
      data: {
        leaseId,
        text,
        topic,
        responsibleParty,
        sectionLabel,
        pageNumber,
        embedding: JSON.stringify(embedding),
      },
    });
    return clause.id;
  }
}

/**
 * Batch upsert multiple clauses
 */
export async function upsertLeaseClausesBatch(
  clauses: Array<{
    leaseId: string;
    text: string;
    topic: ClauseTopic;
    responsibleParty: ResponsibleParty;
    sectionLabel: string | null;
    pageNumber: number | null;
  }>
): Promise<string[]> {
  if (clauses.length === 0) return [];

  // Generate embeddings in batch
  const texts = clauses.map((c) => c.text);
  const embeddings = await embedChunks(texts);

  // Create all clauses
  const clauseIds: string[] = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = await prisma.leaseClause.create({
      data: {
        leaseId: clauses[i].leaseId,
        text: clauses[i].text,
        topic: clauses[i].topic,
        responsibleParty: clauses[i].responsibleParty,
        sectionLabel: clauses[i].sectionLabel,
        pageNumber: clauses[i].pageNumber,
        embedding: JSON.stringify(embeddings[i]),
      },
    });
    clauseIds.push(clause.id);
  }

  return clauseIds;
}

/**
 * Search for relevant clauses using vector similarity
 */
export async function searchClausesByVector(params: {
  query: string;
  leaseId?: string;
  propertyId?: string;
  tenantName?: string;
  topics?: ClauseTopic[];
  responsibleParty?: ResponsibleParty;
  topK?: number;
  minSimilarity?: number;
}): Promise<ClauseSearchResult[]> {
  const {
    query,
    leaseId,
    propertyId,
    tenantName,
    topics,
    responsibleParty,
    topK = 10,
    minSimilarity = 0.3,
  } = params;

  // Build where clause for filtering
  const where: any = {};

  if (leaseId) {
    where.leaseId = leaseId;
  }

  if (topics && topics.length > 0) {
    where.topic = { in: topics };
  }

  if (responsibleParty) {
    where.responsibleParty = responsibleParty;
  }

  // If filtering by property or tenant, we need to join through lease
  if (propertyId || tenantName) {
    where.lease = {};
    if (propertyId) {
      where.lease.propertyId = propertyId;
    }
    if (tenantName) {
      where.lease.tenantName = tenantName;
    }
  }

  // Fetch clauses with their embeddings
  const clauses = await prisma.leaseClause.findMany({
    where,
    include: {
      lease: {
        include: {
          property: true,
        },
      },
    },
  });

  if (clauses.length === 0) {
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await embedQuery(query);

  // Compute similarity for each clause
  const results: ClauseSearchResult[] = [];

  for (const clause of clauses) {
    if (!clause.embedding) continue;

    const clauseEmbedding = JSON.parse(clause.embedding) as number[];
    const similarity = cosineSimilarity(queryEmbedding, clauseEmbedding);

    if (similarity >= minSimilarity) {
      results.push({
        clauseId: clause.id,
        leaseId: clause.leaseId,
        topic: clause.topic,
        responsibleParty: clause.responsibleParty,
        sectionLabel: clause.sectionLabel,
        text: clause.text,
        textSnippet: clause.text.substring(0, 300) + (clause.text.length > 300 ? '...' : ''),
        pageNumber: clause.pageNumber,
        similarity,
        tenantName: clause.lease.tenantName,
        propertyName: clause.lease.property?.name || undefined,
        propertyId: clause.lease.propertyId,
      });
    }
  }

  // Sort by similarity (descending) and take topK
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Get all clauses for a lease (no vector search)
 */
export async function getClausesForLease(
  leaseId: string,
  options?: { topic?: ClauseTopic; responsibleParty?: ResponsibleParty }
): Promise<ClauseSearchResult[]> {
  const where: any = { leaseId };

  if (options?.topic) {
    where.topic = options.topic;
  }

  if (options?.responsibleParty) {
    where.responsibleParty = options.responsibleParty;
  }

  const clauses = await prisma.leaseClause.findMany({
    where,
    include: {
      lease: {
        include: {
          property: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return clauses.map((clause) => ({
    clauseId: clause.id,
    leaseId: clause.leaseId,
    topic: clause.topic,
    responsibleParty: clause.responsibleParty,
    sectionLabel: clause.sectionLabel,
    text: clause.text,
    textSnippet: clause.text.substring(0, 300) + (clause.text.length > 300 ? '...' : ''),
    pageNumber: clause.pageNumber,
    similarity: 1.0, // Not from search
    tenantName: clause.lease.tenantName,
    propertyName: clause.lease.property?.name || undefined,
    propertyId: clause.lease.propertyId,
  }));
}

/**
 * Delete all clauses for a lease (for re-indexing)
 */
export async function deleteClausesForLease(leaseId: string): Promise<number> {
  const result = await prisma.leaseClause.deleteMany({
    where: { leaseId },
  });
  return result.count;
}
