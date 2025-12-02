/**
 * Lease Text Chunker
 *
 * Splits raw lease PDF text into clause-sized chunks for indexing.
 * Goal: produce 100-250 chunks per lease (instead of 12-20).
 */

export interface ClauseChunk {
  text: string;
  sectionLabel?: string;
  pageNumber?: number;
}

// Heading patterns for legal/lease documents
const HEADING_PATTERNS = [
  // ARTICLE I, ARTICLE 1, ARTICLE ONE
  /^ARTICLE\s+([IVXLCDM]+|\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)[\.:\s]/i,
  // SECTION 1.1, Section 2.3.4
  /^SECTION\s+\d+(\.\d+)*[\.:\s]/i,
  // 1.1 Title, 2.3 Title, 10.1.2 Title
  /^\d+\.\d+(\.\d+)*\s+[A-Z]/,
  // 1. TITLE, 2. TITLE (numbered sections with all caps)
  /^\d+\.\s+[A-Z][A-Z\s]+/,
  // (a), (b), (i), (ii) at start of significant text
  /^\([a-z]\)\s+[A-Z]/,
  /^\([ivx]+\)\s+[A-Z]/i,
  // EXHIBIT A, EXHIBIT B
  /^EXHIBIT\s+[A-Z]/i,
  // SCHEDULE 1, SCHEDULE A
  /^SCHEDULE\s+[\dA-Z]/i,
];

/**
 * Check if a line looks like a section heading
 */
function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3 || trimmed.length > 150) return false;
  return HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Extract section label from a heading line
 */
function extractSectionLabel(line: string): string {
  const trimmed = line.trim();
  // Limit label length
  if (trimmed.length <= 80) return trimmed;
  return trimmed.substring(0, 77) + '...';
}

/**
 * Split text into semantic sections based on headings
 */
function splitIntoSections(
  rawText: string
): Array<{ heading?: string; content: string }> {
  const lines = rawText.split(/\r?\n/);
  const sections: Array<{ heading?: string; content: string }> = [];
  let currentSection: { heading?: string; lines: string[] } = { lines: [] };

  for (const line of lines) {
    if (isHeading(line)) {
      // Save current section if it has content
      if (currentSection.lines.length > 0) {
        sections.push({
          heading: currentSection.heading,
          content: currentSection.lines.join('\n'),
        });
      }
      // Start new section
      currentSection = {
        heading: extractSectionLabel(line),
        lines: [line],
      };
    } else {
      currentSection.lines.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection.lines.length > 0) {
    sections.push({
      heading: currentSection.heading,
      content: currentSection.lines.join('\n'),
    });
  }

  return sections;
}

/**
 * Further split a section into smaller chunks if it's too long
 */
function splitSectionIntoChunks(
  content: string,
  sectionLabel?: string,
  maxChars: number = 1200
): ClauseChunk[] {
  const chunks: ClauseChunk[] = [];
  const cleanedContent = content.replace(/\n{3,}/g, '\n\n').trim();

  if (!cleanedContent || cleanedContent.length < 50) {
    return chunks;
  }

  // If short enough, return as single chunk
  if (cleanedContent.length <= maxChars) {
    chunks.push({ text: cleanedContent, sectionLabel });
    return chunks;
  }

  // Split by double newlines (paragraphs) first
  const paragraphs = cleanedContent.split(/\n\n+/);
  let buffer = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    const candidate = buffer ? buffer + '\n\n' + trimmedPara : trimmedPara;

    if (candidate.length > maxChars && buffer) {
      // Save buffer and start new with current para
      if (buffer.length >= 50) {
        chunks.push({ text: buffer.trim(), sectionLabel });
      }
      buffer = trimmedPara;
    } else if (candidate.length > maxChars && !buffer) {
      // Single paragraph is too long, split by sentences
      const sentences = splitBySentences(trimmedPara);
      let sentenceBuffer = '';

      for (const sentence of sentences) {
        const sentenceCandidate = sentenceBuffer
          ? sentenceBuffer + ' ' + sentence
          : sentence;

        if (sentenceCandidate.length > maxChars && sentenceBuffer) {
          if (sentenceBuffer.length >= 50) {
            chunks.push({ text: sentenceBuffer.trim(), sectionLabel });
          }
          sentenceBuffer = sentence;
        } else {
          sentenceBuffer = sentenceCandidate;
        }
      }

      if (sentenceBuffer.length >= 50) {
        buffer = sentenceBuffer;
      }
    } else {
      buffer = candidate;
    }
  }

  // Save remaining buffer
  if (buffer.length >= 50) {
    chunks.push({ text: buffer.trim(), sectionLabel });
  }

  return chunks;
}

/**
 * Split text by sentence boundaries
 */
function splitBySentences(text: string): string[] {
  // Split on period followed by space and capital letter, or on semicolons
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z])|(?<=;)\s+/);
  return sentences.filter((s) => s.trim().length > 0);
}

/**
 * Main chunking function
 * Takes raw PDF text and produces clause-sized chunks
 */
export function chunkLeaseText(rawText: string): ClauseChunk[] {
  if (!rawText || rawText.length < 100) {
    return [];
  }

  // Step 1: Split into semantic sections based on headings
  const sections = splitIntoSections(rawText);

  // Step 2: Further split long sections into smaller chunks
  const allChunks: ClauseChunk[] = [];

  for (const section of sections) {
    const sectionChunks = splitSectionIntoChunks(
      section.content,
      section.heading,
      1200 // ~400-600 tokens
    );
    allChunks.push(...sectionChunks);
  }

  // Step 3: Filter out very short or low-value chunks
  const filteredChunks = allChunks.filter((chunk) => {
    const text = chunk.text;
    // Skip if too short
    if (text.length < 80) return false;
    // Skip if mostly whitespace or numbers
    const alphaRatio =
      text.replace(/[^a-zA-Z]/g, '').length / Math.max(text.length, 1);
    if (alphaRatio < 0.3) return false;
    // Skip pure signature/date blocks
    if (/^(IN WITNESS WHEREOF|SIGNATURES?|DATE:|WITNESS:)/i.test(text.trim()))
      return false;
    return true;
  });

  return filteredChunks;
}

/**
 * Get chunking statistics for debugging
 */
export function getChunkingStats(chunks: ClauseChunk[]): {
  totalChunks: number;
  avgLength: number;
  minLength: number;
  maxLength: number;
  withSectionLabel: number;
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      avgLength: 0,
      minLength: 0,
      maxLength: 0,
      withSectionLabel: 0,
    };
  }

  const lengths = chunks.map((c) => c.text.length);
  return {
    totalChunks: chunks.length,
    avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    withSectionLabel: chunks.filter((c) => c.sectionLabel).length,
  };
}
