/**
 * Lease Clause Indexing Script
 *
 * Indexes demo lease PDFs into LeaseClause records with embeddings.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/index-leases.ts
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import pdf from 'pdf-parse';
import { PrismaClient } from '@prisma/client';
import { classifyClause, ClauseTopic } from '../lib/leases/classifier';
import { chunkLeaseText, getChunkingStats, ClauseChunk } from '../lib/leases/chunker';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION: Map PDF files to lease IDs
// ============================================================================
const leaseFileMap: { filePath: string; leaseId: string; tenantName: string }[] = [
  {
    filePath: 'data/leases/Willow Creek Grocery Lease.pdf',
    leaseId: 'cminnxpn000017sfjqt10ppr3', // Anchor Grocery Inc.
    tenantName: 'Anchor Grocery Inc.',
  },
  {
    filePath: 'data/leases/Office Lease TechStart Metro Tower.pdf',
    leaseId: 'cminnxpn000057sfjpn6xmm1d', // TechStart Solutions LLC
    tenantName: 'TechStart Solutions LLC',
  },
  {
    filePath: 'data/leases/Industrial Lease Global Logistics Gateway.pdf',
    leaseId: 'cminnxpn1000p7sfj8ndczm3w', // Global Logistics Corp
    tenantName: 'Global Logistics Corp',
  },
  {
    filePath: 'data/leases/Verde Cantina Lease.pdf',
    leaseId: 'cminnxpn1000n7sfjjea21hr8', // Coffee Corner LLC (using as placeholder)
    tenantName: 'Verde Cantina',
  },
  {
    filePath: 'data/leases/Summit Orthopedics Medical Office Lease.pdf',
    leaseId: 'cminnxpn0000b7sfj5w220rlz', // Midwest Financial Advisors (using as placeholder)
    tenantName: 'Summit Orthopedics',
  },
];

// ============================================================================
// EMBEDDING GENERATION (uses OpenAI)
// ============================================================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';

async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================
async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = await readFile(filePath);
  const pdfData = await pdf(dataBuffer);
  return pdfData.text;
}

// ============================================================================
// TOPIC DISTRIBUTION HELPER
// ============================================================================
function buildTopicHistogram(topics: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const topic of topics) {
    counts[topic] = (counts[topic] || 0) + 1;
  }
  return counts;
}

function formatTopicHistogram(histogram: Record<string, number>): string {
  return Object.entries(histogram)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => `${topic}:${count}`)
    .join(', ');
}

// ============================================================================
// MAIN INDEXING FUNCTION
// ============================================================================
interface IndexResult {
  success: boolean;
  clauseCount: number;
  chunkCount: number;
  topicDistribution: Record<string, number>;
  error?: string;
}

async function indexLease(params: {
  filePath: string;
  leaseId: string;
  tenantName: string;
}): Promise<IndexResult> {
  const { filePath, leaseId, tenantName } = params;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`INDEXING: ${tenantName}`);
  console.log(`File: ${filePath}`);
  console.log(`Lease ID: ${leaseId}`);
  console.log('='.repeat(70));

  // Check if file exists
  if (!existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { success: false, clauseCount: 0, chunkCount: 0, topicDistribution: {}, error: 'File not found' };
  }

  // Check if lease exists
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
  });

  if (!lease) {
    console.log(`⚠️  Lease not found in database: ${leaseId}`);
    return { success: false, clauseCount: 0, chunkCount: 0, topicDistribution: {}, error: 'Lease not found in database' };
  }

  try {
    // Step 1: Extract text from PDF
    console.log('\n📄 STEP 1: Extracting text from PDF...');
    const rawText = await extractTextFromPdf(filePath);
    console.log(`   Raw text length: ${rawText.length.toLocaleString()} characters`);

    // Step 2: Chunk the text using improved chunker
    console.log('\n✂️  STEP 2: Chunking text into clauses...');
    const chunks = chunkLeaseText(rawText);
    const stats = getChunkingStats(chunks);
    console.log(`   Chunks generated: ${stats.totalChunks}`);
    console.log(`   Avg chunk length: ${stats.avgLength} chars`);
    console.log(`   Min/Max length: ${stats.minLength} / ${stats.maxLength} chars`);
    console.log(`   With section labels: ${stats.withSectionLabel}`);

    // Warning for low chunk count
    if (chunks.length < 20) {
      console.warn(`\n⚠️  WARNING: Low chunk count (${chunks.length}) - check PDF extraction or chunking logic.`);
      // Log sample of raw text for debugging
      console.log('   First 500 chars of raw text:');
      console.log('   ' + rawText.substring(0, 500).replace(/\n/g, '\n   '));
    }

    // Step 3: Delete existing clauses for this lease (idempotent)
    console.log('\n🗑️  STEP 3: Clearing existing clauses...');
    const deleted = await prisma.leaseClause.deleteMany({
      where: { leaseId },
    });
    console.log(`   Deleted ${deleted.count} existing clauses`);

    // Step 4: Process each chunk - classify and embed
    console.log('\n🤖 STEP 4: Classifying and embedding clauses...');
    let clauseCount = 0;
    const topics: string[] = [];
    const batchSize = 10;
    const totalChunks = chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Progress indicator every 10 chunks
      if (i % batchSize === 0) {
        console.log(`   Processing chunks ${i + 1}-${Math.min(i + batchSize, totalChunks)} of ${totalChunks}...`);
      }

      try {
        // Classify the chunk (pass sectionLabel for context)
        const classification = await classifyClause(chunk.text, chunk.sectionLabel);
        topics.push(classification.topic);

        // Generate embedding
        const embedding = await generateEmbedding(chunk.text);

        // Store the clause
        await prisma.leaseClause.create({
          data: {
            leaseId,
            topic: classification.topic,
            responsibleParty: classification.responsibleParty,
            sectionLabel: chunk.sectionLabel || classification.sectionLabel || null,
            text: chunk.text,
            embedding: JSON.stringify(embedding),
            pageNumber: chunk.pageNumber || null,
          },
        });

        clauseCount++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (err) {
        console.error(`   ⚠️  Error processing chunk ${i + 1}: ${(err as Error).message}`);
      }
    }

    // Build topic distribution
    const topicDistribution = buildTopicHistogram(topics);

    // Step 5: Summary
    console.log('\n📊 STEP 5: Results');
    console.log(`   LeaseClause rows created: ${clauseCount}`);
    console.log(`   Topic distribution: ${formatTopicHistogram(topicDistribution)}`);

    // Warning for low clause count
    if (clauseCount < 10) {
      console.warn(`\n⚠️  WARNING: Low clause count (${clauseCount}) for lease ${leaseId}`);
      console.warn('   This may indicate issues with PDF extraction or chunking.');
    }

    console.log(`\n✅ Successfully indexed ${clauseCount} clauses for ${tenantName}`);
    return { success: true, clauseCount, chunkCount: chunks.length, topicDistribution };
  } catch (error) {
    console.error(`\n❌ Error indexing ${tenantName}:`, (error as Error).message);
    return { success: false, clauseCount: 0, chunkCount: 0, topicDistribution: {}, error: (error as Error).message };
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
async function main() {
  console.log('\n🚀 LEASE CLAUSE INDEXING SCRIPT');
  console.log('================================');
  console.log('Improved chunking for better clause coverage\n');

  // Check for API key
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    console.error('   Set it in your .env file or export it before running this script');
    process.exit(1);
  }

  // Process each configured lease
  const results: Array<{
    tenantName: string;
    filePath: string;
    leaseId: string;
  } & IndexResult> = [];

  for (const mapping of leaseFileMap) {
    const result = await indexLease(mapping);
    results.push({
      tenantName: mapping.tenantName,
      filePath: mapping.filePath,
      leaseId: mapping.leaseId,
      ...result,
    });
  }

  // Print summary
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 INDEXING SUMMARY');
  console.log('='.repeat(70) + '\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalClauses = successful.reduce((sum, r) => sum + r.clauseCount, 0);
  const totalChunks = successful.reduce((sum, r) => sum + r.chunkCount, 0);

  console.log(`Total leases configured: ${leaseFileMap.length}`);
  console.log(`Successfully indexed: ${successful.length}`);
  console.log(`Failed/Skipped: ${failed.length}`);
  console.log(`Total chunks generated: ${totalChunks}`);
  console.log(`Total clauses created: ${totalClauses}`);

  // Per-lease breakdown
  console.log('\n📋 PER-LEASE BREAKDOWN:');
  console.log('-'.repeat(70));
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`\n${status} ${r.tenantName}`);
    console.log(`   File: ${r.filePath}`);
    console.log(`   Chunks: ${r.chunkCount}, Clauses: ${r.clauseCount}`);
    if (r.topicDistribution && Object.keys(r.topicDistribution).length > 0) {
      console.log(`   Topics: ${formatTopicHistogram(r.topicDistribution)}`);
    }
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  }

  // Warnings
  if (failed.length > 0) {
    console.log('\n⚠️  FAILED/SKIPPED LEASES:');
    for (const f of failed) {
      console.log(`   - ${f.tenantName}: ${f.error}`);
    }
  }

  // Low coverage warnings
  const lowCoverage = successful.filter((r) => r.clauseCount < 50);
  if (lowCoverage.length > 0) {
    console.log('\n⚠️  LOW COVERAGE LEASES (< 50 clauses):');
    for (const l of lowCoverage) {
      console.log(`   - ${l.tenantName}: ${l.clauseCount} clauses from ${l.chunkCount} chunks`);
    }
  }

  console.log('\n✨ Done!\n');
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
