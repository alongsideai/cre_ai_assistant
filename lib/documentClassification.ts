/**
 * Document Classification
 *
 * Auto-classify documents using LLM based on filename and content
 */

import { callLLM } from './llm';

export const VALID_DOCUMENT_TYPES = [
  'LEASE',
  'AMENDMENT',
  'COI',
  'INVOICE',
  'EMAIL',
  'WORK_ORDER',
  'ABSTRACT',
  'RENT_ROLL',
  'OTHER',
] as const;

export type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

export function isValidDocumentType(type: string): type is DocumentType {
  return VALID_DOCUMENT_TYPES.includes(type as DocumentType);
}

/**
 * Classify a document using LLM
 */
export async function classifyDocument(params: {
  fileName: string;
  contentSample?: string;
}): Promise<{ type: DocumentType; confidence?: number }> {
  const { fileName, contentSample } = params;

  const prompt = buildClassificationPrompt(fileName, contentSample);

  try {
    const response = await callLLM(prompt);

    // Parse response - expecting format like "LEASE" or "LEASE (confidence: 0.95)"
    const cleanedResponse = response.trim().toUpperCase();

    // Extract just the type (first word)
    const typeMatch = cleanedResponse.match(/^([A-Z_]+)/);
    if (!typeMatch) {
      console.warn('Failed to parse LLM classification response:', response);
      return { type: 'OTHER' };
    }

    const type = typeMatch[1];

    // Extract confidence if present
    const confidenceMatch = cleanedResponse.match(/CONFIDENCE:\s*([0-9.]+)/);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : undefined;

    // Validate type
    if (!isValidDocumentType(type)) {
      console.warn('LLM returned invalid type:', type);
      return { type: 'OTHER', confidence };
    }

    return { type, confidence };
  } catch (error) {
    console.error('Error classifying document:', error);
    return { type: 'OTHER' };
  }
}

function buildClassificationPrompt(
  fileName: string,
  contentSample?: string
): string {
  return `You are a document classification system for commercial real estate property management.

Classify the following document into ONE of these categories:
- LEASE: Commercial lease agreement
- AMENDMENT: Lease amendment or addendum
- COI: Certificate of Insurance
- INVOICE: Invoice or bill
- EMAIL: Email correspondence
- WORK_ORDER: Work order or maintenance request
- ABSTRACT: Lease abstract or summary
- RENT_ROLL: Rent roll spreadsheet or report
- OTHER: Any other document type

DOCUMENT INFORMATION:
Filename: ${fileName}
${contentSample ? `\nContent Preview:\n${contentSample.substring(0, 1000)}` : ''}

INSTRUCTIONS:
1. Analyze the filename and content (if available)
2. Return ONLY the category name (e.g., "LEASE", "INVOICE", etc.)
3. Do not include any explanation or additional text
4. If uncertain, return "OTHER"

YOUR CLASSIFICATION:`;
}
