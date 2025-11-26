import { callLLM } from './llm';

export type CommunicationIntent =
  | 'RENEWAL_NOTICE'
  | 'RENEWAL_REMINDER'
  | 'RENT_ADJUSTMENT'
  | 'WORK_ORDER_UPDATE'
  | 'GENERAL_NOTICE';

export type DraftCommunicationInput = {
  intent: CommunicationIntent;
  tenantName?: string;
  propertyName?: string;
  suite?: string;
  leaseSummary?: string;
  leaseEndDate?: string;
  workOrderSummary?: string;
  invoiceSummary?: string;
  additionalContext?: string;
};

export type DraftCommunicationResult = {
  subject: string;
  body: string;
};

export async function draftTenantCommunication(
  input: DraftCommunicationInput
): Promise<DraftCommunicationResult> {
  try {
    // Build context based on available information
    let contextParts: string[] = [];

    if (input.tenantName) {
      contextParts.push(`Tenant: ${input.tenantName}`);
    }
    if (input.propertyName) {
      contextParts.push(`Property: ${input.propertyName}`);
    }
    if (input.suite) {
      contextParts.push(`Suite: ${input.suite}`);
    }
    if (input.leaseEndDate) {
      contextParts.push(`Lease End Date: ${input.leaseEndDate}`);
    }
    if (input.leaseSummary) {
      contextParts.push(`Lease Details: ${input.leaseSummary}`);
    }
    if (input.workOrderSummary) {
      contextParts.push(`Work Order: ${input.workOrderSummary}`);
    }
    if (input.invoiceSummary) {
      contextParts.push(`Invoice: ${input.invoiceSummary}`);
    }
    if (input.additionalContext) {
      contextParts.push(`Additional Context: ${input.additionalContext}`);
    }

    const context = contextParts.join('\n');

    // Build intent-specific guidance
    let intentGuidance = '';
    switch (input.intent) {
      case 'RENEWAL_NOTICE':
        intentGuidance = 'Write a professional email notifying the tenant about their upcoming lease renewal options. Be friendly but businesslike. Include key dates and encourage them to reach out with questions.';
        break;
      case 'RENEWAL_REMINDER':
        intentGuidance = 'Write a friendly reminder email about an upcoming lease renewal deadline. Be courteous and helpful, emphasizing the timeline and next steps.';
        break;
      case 'RENT_ADJUSTMENT':
        intentGuidance = 'Write a professional email notifying the tenant about a rent adjustment. Be clear, transparent, and reference the lease agreement. Maintain a respectful and professional tone.';
        break;
      case 'WORK_ORDER_UPDATE':
        intentGuidance = 'Write an update email about a work order or maintenance issue. Be clear about the status, timeline, and any actions the tenant needs to take. Show empathy for any inconvenience.';
        break;
      case 'GENERAL_NOTICE':
        intentGuidance = 'Write a general notice email to the tenant. Be clear, professional, and friendly.';
        break;
    }

    const prompt = `You are a professional property management assistant drafting an email to a tenant.

Communication Type: ${input.intent}

${intentGuidance}

Context Information:
${context}

Write a professional, concise email with an appropriate subject line and body. The tone should be:
- Professional but friendly
- Clear and concise
- Respectful and courteous
- Action-oriented when appropriate

Return ONLY valid JSON in this exact format (no markdown, no explanation):

{
  "subject": "Brief, professional subject line",
  "body": "Professional email body with proper greeting, clear message, and professional closing. Use \\n\\n for paragraph breaks."
}

JSON:`;

    // Call LLM
    const response = await callLLM(prompt);

    // Parse JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in LLM response:', response);
        return getFallbackCommunication(input);
      }

      const result = JSON.parse(jsonMatch[0]) as DraftCommunicationResult;

      // Validate that we got both fields
      if (!result.subject || !result.body) {
        console.warn('Missing subject or body in response');
        return getFallbackCommunication(input);
      }

      return result;
    } catch (parseError) {
      console.error('Error parsing communication JSON:', parseError);
      console.error('Response was:', response);
      return getFallbackCommunication(input);
    }
  } catch (error) {
    console.error('Error drafting tenant communication:', error);
    return getFallbackCommunication(input);
  }
}

function getFallbackCommunication(input: DraftCommunicationInput): DraftCommunicationResult {
  const tenantName = input.tenantName || 'Valued Tenant';
  const propertyName = input.propertyName || 'the property';

  let subject = '';
  let body = '';

  switch (input.intent) {
    case 'RENEWAL_NOTICE':
      subject = `Lease Renewal Information for ${propertyName}`;
      body = `Dear ${tenantName},\n\nWe wanted to reach out regarding your upcoming lease renewal at ${propertyName}.\n\nPlease contact our office at your earliest convenience to discuss your renewal options.\n\nBest regards,\nProperty Management`;
      break;
    case 'RENEWAL_REMINDER':
      subject = `Lease Renewal Deadline Reminder - ${propertyName}`;
      body = `Dear ${tenantName},\n\nThis is a friendly reminder about your upcoming lease renewal deadline at ${propertyName}.\n\nPlease let us know your intentions at your earliest convenience.\n\nBest regards,\nProperty Management`;
      break;
    case 'RENT_ADJUSTMENT':
      subject = `Important: Rent Adjustment Notice for ${propertyName}`;
      body = `Dear ${tenantName},\n\nWe are writing to inform you of an upcoming rent adjustment for your lease at ${propertyName}.\n\nPlease contact us if you have any questions.\n\nBest regards,\nProperty Management`;
      break;
    case 'WORK_ORDER_UPDATE':
      subject = `Maintenance Update - ${propertyName}`;
      body = `Dear ${tenantName},\n\nWe wanted to provide you with an update regarding the maintenance issue at ${propertyName}.\n\nThank you for your patience.\n\nBest regards,\nProperty Management`;
      break;
    case 'GENERAL_NOTICE':
      subject = `Important Notice - ${propertyName}`;
      body = `Dear ${tenantName},\n\nWe wanted to inform you about an important matter regarding ${propertyName}.\n\nPlease contact us if you have any questions.\n\nBest regards,\nProperty Management`;
      break;
    default:
      subject = 'Important Communication';
      body = `Dear ${tenantName},\n\nPlease contact our office regarding your lease at ${propertyName}.\n\nBest regards,\nProperty Management`;
  }

  return { subject, body };
}
