/**
 * Lease Data Extraction
 *
 * Extract structured data from lease documents using LLM
 */

import { callLLM } from './llm';

export interface ExtractedLeaseData {
  tenantName?: string;
  propertyName?: string;
  suite?: string;
  baseRent?: number;
  rentCurrency?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
  escalationType?: string;
  escalationRate?: number;
  camType?: string;
  camCap?: number | null;
  renewalOptions?: {
    months: number;
    deadline: string; // ISO
    noticeMonths?: number;
  }[];
  criticalDates?: {
    type: 'LEASE_EXPIRATION' | 'RENEWAL_DEADLINE' | 'NOTICE_DEADLINE' | 'COI_EXPIRATION';
    date: string; // ISO
    description?: string;
  }[];
}

/**
 * Extract structured data from a lease document
 */
export async function extractLeaseData(
  documentText: string
): Promise<ExtractedLeaseData> {
  const prompt = buildExtractionPrompt(documentText);

  try {
    const response = await callLLM(prompt);

    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('LLM did not return valid JSON for lease extraction');
      return {};
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedLeaseData;
    return extracted;
  } catch (error) {
    console.error('Error extracting lease data:', error);
    return {};
  }
}

function buildExtractionPrompt(documentText: string): string {
  // Limit text to ~10k characters to avoid token limits
  const truncatedText = documentText.substring(0, 10000);

  return `You are a commercial real estate lease analyst. Extract structured data from the following lease document.

LEASE DOCUMENT TEXT:
${truncatedText}

Extract the following information in JSON format. Only include fields where you find clear evidence in the document. Use null for missing values.

Return ONLY valid JSON with this structure:
{
  "tenantName": "Name of the tenant",
  "propertyName": "Name or address of the property",
  "suite": "Suite or unit number",
  "baseRent": 5000.00,
  "rentCurrency": "USD",
  "startDate": "2024-01-01",
  "endDate": "2029-12-31",
  "escalationType": "Fixed percentage" or "CPI" or "None",
  "escalationRate": 3.0,
  "camType": "Triple Net" or "Modified Gross" or "Full Service",
  "camCap": 5.0,
  "renewalOptions": [
    {
      "months": 60,
      "deadline": "2029-06-30",
      "noticeMonths": 6
    }
  ],
  "criticalDates": [
    {
      "type": "LEASE_EXPIRATION",
      "date": "2029-12-31",
      "description": "Lease expiration date"
    },
    {
      "type": "RENEWAL_DEADLINE",
      "date": "2029-06-30",
      "description": "Renewal option deadline"
    }
  ]
}

INSTRUCTIONS:
- Return ONLY valid JSON, no explanations
- Use ISO 8601 date format (YYYY-MM-DD) for all dates
- Extract numeric values without currency symbols
- If information is not found, omit the field or use null
- Be conservative: only extract what you're confident about

YOUR JSON RESPONSE:`;
}
