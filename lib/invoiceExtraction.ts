import { callLLM } from './llm';

export type InvoiceExtractionResult = {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string; // ISO
  dueDate?: string; // ISO
  totalAmount?: number;
  currency?: string;
  lineItems?: {
    description?: string;
    amount?: number;
    category?: string; // e.g. "Landscaping", "Plumbing", "Utilities"
  }[];
  propertyName?: string;
  leaseIdHint?: string; // e.g. suite or tenant name found
  notes?: string;
};

export async function extractInvoiceData(
  content: string
): Promise<InvoiceExtractionResult | null> {
  try {
    // Truncate content to avoid token bloat (max ~8-10k characters)
    const truncatedContent = content.slice(0, 10000);

    const prompt = `You are a commercial real estate invoice processing system. Extract structured data from the following invoice text.

Invoice Text:
${truncatedContent}

Extract the following information and return ONLY valid JSON matching this exact structure (no other text):

{
  "vendorName": "string or omit if not found",
  "invoiceNumber": "string or omit if not found",
  "invoiceDate": "YYYY-MM-DD or omit if not found",
  "dueDate": "YYYY-MM-DD or omit if not found",
  "totalAmount": number or omit if not found,
  "currency": "USD, CAD, etc or omit if not found",
  "lineItems": [
    {
      "description": "string",
      "amount": number,
      "category": "Landscaping, Plumbing, Utilities, Cleaning, Repairs, etc"
    }
  ],
  "propertyName": "string or omit if not found",
  "leaseIdHint": "suite number, tenant name, or other lease identifier if found",
  "notes": "any important notes or observations"
}

Guidelines:
- Parse dates into YYYY-MM-DD format
- Extract all line items with amounts if available
- Categorize line items into common property management categories
- Include any property/suite/tenant identifiers in leaseIdHint
- If you cannot find a field, omit it entirely (do not use null)
- Return ONLY the JSON object, no markdown, no explanation

JSON:`;

    // Call LLM
    const response = await callLLM(prompt);

    // Parse JSON response
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in LLM response:', response);
        return null;
      }

      const extracted = JSON.parse(jsonMatch[0]) as InvoiceExtractionResult;

      // Validate that we got at least some data
      if (
        !extracted.vendorName &&
        !extracted.invoiceNumber &&
        !extracted.totalAmount &&
        (!extracted.lineItems || extracted.lineItems.length === 0)
      ) {
        console.warn('No meaningful invoice data extracted');
        return null;
      }

      return extracted;
    } catch (parseError) {
      console.error('Error parsing invoice extraction JSON:', parseError);
      console.error('Response was:', response);
      return null;
    }
  } catch (error) {
    console.error('Error extracting invoice data:', error);
    return null;
  }
}
