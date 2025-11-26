import { callLLM } from './llm';

export type WorkOrderExtractionResult = {
  issueType?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  summary?: string;
  fullDescription?: string;
  affectedArea?: string;
  recommendedVendor?: string;
  tenantName?: string;
  propertyName?: string;
  detectedRisk?: string[];
  suggestedNextSteps?: string[];
};

export async function extractWorkOrder(
  content: string
): Promise<WorkOrderExtractionResult | null> {
  try {
    // Truncate content to avoid token bloat (max ~8-10k characters)
    const truncatedContent = content.slice(0, 10000);

    const prompt = `You are analyzing a tenant email or report to create a work order for commercial property management. Extract structured data from the following text.

Document Text:
${truncatedContent}

Extract the following information and return ONLY valid JSON matching this exact structure (no other text):

{
  "issueType": "string (e.g. Plumbing, HVAC, Electrical, Cleaning, Landscaping, etc.) or omit if not found",
  "priority": "LOW | MEDIUM | HIGH | EMERGENCY or omit if not found",
  "summary": "brief one-line description or omit if not found",
  "fullDescription": "detailed description of the issue or omit if not found",
  "affectedArea": "suite number, floor, area description or omit if not found",
  "recommendedVendor": "vendor name or type if mentioned or omit if not found",
  "tenantName": "tenant or sender name or omit if not found",
  "propertyName": "property name or address or omit if not found",
  "detectedRisk": ["risk 1", "risk 2"] array of detected risks or omit if none,
  "suggestedNextSteps": ["step 1", "step 2"] array of recommended actions or omit if none
}

Guidelines:
- Determine priority based on urgency language: emergency/urgent = EMERGENCY, needs attention soon = HIGH, routine = MEDIUM, can wait = LOW
- Extract all relevant details about the issue
- Identify any safety or compliance risks
- Suggest practical next steps for property management
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

      const extracted = JSON.parse(jsonMatch[0]) as WorkOrderExtractionResult;

      // Validate that we got at least some data
      if (
        !extracted.issueType &&
        !extracted.summary &&
        !extracted.fullDescription &&
        !extracted.affectedArea
      ) {
        console.warn('No meaningful work order data extracted');
        return null;
      }

      return extracted;
    } catch (parseError) {
      console.error('Error parsing work order extraction JSON:', parseError);
      console.error('Response was:', response);
      return null;
    }
  } catch (error) {
    console.error('Error extracting work order data:', error);
    return null;
  }
}
