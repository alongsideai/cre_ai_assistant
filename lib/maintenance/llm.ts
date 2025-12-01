// LLM Helpers for Maintenance Module
// Uses CRE-specific language: property, building, suite/space, occupier, vendor, asset manager

import { callLLM } from '@/lib/llm';
import {
  ExtractedWorkOrder,
  WorkOrderDecisions,
  EmailDraft,
  IssueCategory,
  Priority,
} from './types';

// Valid issue categories for validation
const VALID_CATEGORIES: IssueCategory[] = [
  'ROOFING',
  'HVAC',
  'PLUMBING',
  'ELECTRICAL',
  'LIFE_SAFETY',
  'GENERAL',
  'OTHER',
];

const VALID_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

/**
 * Extract structured work order details from raw email text
 */
export async function extractWorkOrderFromEmail(
  rawEmailText: string
): Promise<ExtractedWorkOrder> {
  const prompt = `You are a commercial real estate (CRE) property management assistant. Analyze the following email from an occupier (tenant) reporting a maintenance issue at a commercial property.

Extract the following information and return it as a JSON object:

{
  "propertyName": "Name of the property/building/shopping center if mentioned",
  "spaceLabel": "Suite number, bay number, floor, or space identifier if mentioned",
  "occupierName": "Name of the business/tenant/occupier if mentioned",
  "occupierEmail": "Sender's email address if visible",
  "issueCategory": "One of: ROOFING, HVAC, PLUMBING, ELECTRICAL, LIFE_SAFETY, GENERAL, OTHER",
  "description": "Detailed description of the issue in natural language",
  "severity": "One of: LOW, MEDIUM, HIGH, EMERGENCY based on urgency indicators",
  "accessConstraints": "Any access restrictions, business hours, or special instructions",
  "reportedAt": "ISO datetime if a date/time is mentioned"
}

CRE Context:
- Properties include: shopping centers, office buildings, industrial facilities, flex spaces
- Occupiers are commercial tenants: retailers, office tenants, warehouse operators
- Spaces are identified by: suite numbers, bays, floors, wings
- This is NOT residential - no apartments, residents, or move-ins

Severity Guidelines:
- EMERGENCY: Fire, gas leak, flooding, electrical burning smell, blocked egress, active safety hazard
- HIGH: Active leaks, no HVAC in extreme weather, power outage, security issues
- MEDIUM: HVAC comfort issues, minor leaks, non-urgent repairs
- LOW: Cosmetic issues, routine maintenance, non-urgent requests

EMAIL TEXT:
${rawEmailText}

Return ONLY the JSON object, no additional text.`;

  const response = await callLLM(prompt);

  // Parse JSON from response
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    return {
      propertyName: parsed.propertyName || undefined,
      spaceLabel: parsed.spaceLabel || undefined,
      occupierName: parsed.occupierName || undefined,
      occupierEmail: parsed.occupierEmail || undefined,
      issueCategory: VALID_CATEGORIES.includes(parsed.issueCategory)
        ? parsed.issueCategory
        : 'OTHER',
      description: parsed.description || 'No description provided',
      severity: VALID_PRIORITIES.includes(parsed.severity)
        ? parsed.severity
        : 'MEDIUM',
      accessConstraints: parsed.accessConstraints || undefined,
      reportedAt: parsed.reportedAt || undefined,
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    // Return a default extraction with the raw text as description
    return {
      issueCategory: 'OTHER',
      description: rawEmailText.slice(0, 500),
      severity: 'MEDIUM',
    };
  }
}

/**
 * Input for generating maintenance email drafts
 */
interface DraftEmailsInput {
  extracted: ExtractedWorkOrder;
  decisions: WorkOrderDecisions;
  property?: { name: string; address: string };
  space?: { spaceLabel: string };
  occupier?: {
    brandName?: string | null;
    legalName: string;
    primaryContactName?: string | null;
    primaryContactEmail?: string | null;
    primaryContactPhone?: string | null;
  };
  vendor?: { name: string; trade: string } | null;
}

/**
 * Generate three email drafts: occupier acknowledgement, vendor dispatch, and internal note
 */
export async function draftMaintenanceEmails(
  input: DraftEmailsInput
): Promise<{
  occupierAcknowledgement: EmailDraft;
  vendorDispatch: EmailDraft;
  internalNote: EmailDraft;
}> {
  const {
    extracted,
    decisions,
    property,
    space,
    occupier,
    vendor,
  } = input;

  const propertyName = property?.name || extracted.propertyName || 'the property';
  const spaceLabel = space?.spaceLabel || extracted.spaceLabel || '';
  const occupierName = occupier?.brandName || occupier?.legalName || extracted.occupierName || 'Valued Occupier';
  const contactName = occupier?.primaryContactName || '';
  const vendorName = vendor?.name || 'our service vendor';
  const vendorTrade = vendor?.trade || 'maintenance';

  const visitWindow = decisions.proposedVisitWindow
    ? `between ${new Date(decisions.proposedVisitWindow.start).toLocaleString()} and ${new Date(decisions.proposedVisitWindow.end).toLocaleString()}`
    : 'as soon as possible';

  const prompt = `You are a commercial real estate (CRE) property management professional. Generate three email drafts for a maintenance work order.

CONTEXT:
- Property: ${propertyName}${property?.address ? ` (${property.address})` : ''}
- Space: ${spaceLabel || 'Not specified'}
- Occupier: ${occupierName}${contactName ? ` (Contact: ${contactName})` : ''}
- Issue: ${extracted.description}
- Category: ${extracted.issueCategory}
- Priority: ${decisions.priority}
- SLA: Vendor on-site within ${decisions.slaHours} hours
- Business Impact: ${decisions.businessImpact}
- Assigned Vendor: ${vendorName} (${vendorTrade})
- Proposed Visit: ${visitWindow}
- Estimated Cost: $${decisions.estimatedCost || 'TBD'}
- Owner Approval Required: ${decisions.needsOwnerApproval ? 'Yes' : 'No'}
- Access Constraints: ${extracted.accessConstraints || 'None specified'}

Generate three professional emails in JSON format:

{
  "occupierAcknowledgement": {
    "subject": "Subject line for occupier",
    "body": "Full email body acknowledging the issue and next steps"
  },
  "vendorDispatch": {
    "subject": "Subject line for vendor",
    "body": "Full email body dispatching vendor to the site"
  },
  "internalNote": {
    "subject": "Subject line for internal note",
    "body": "Full internal note for property management team"
  }
}

REQUIREMENTS:
- Use professional CRE language (property, center, building, suite, occupier, store manager - NOT apartment, resident, unit)
- Occupier email: Acknowledge receipt, explain next steps, provide timeline, include contact info for questions
- Vendor email: Include all necessary details - property address, space, issue description, urgency, access instructions, cost authorization
- Internal note: Emphasize business impact, risk assessment, timeline, follow-up actions, any concerns

Return ONLY the JSON object.`;

  const response = await callLLM(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      occupierAcknowledgement: {
        subject: parsed.occupierAcknowledgement?.subject || `Work Order Received - ${extracted.issueCategory} Issue`,
        body: parsed.occupierAcknowledgement?.body || generateFallbackOccupierEmail(input),
      },
      vendorDispatch: {
        subject: parsed.vendorDispatch?.subject || `Service Request - ${decisions.priority} Priority`,
        body: parsed.vendorDispatch?.body || generateFallbackVendorEmail(input),
      },
      internalNote: {
        subject: parsed.internalNote?.subject || `Internal: ${extracted.issueCategory} - ${occupierName}`,
        body: parsed.internalNote?.body || generateFallbackInternalNote(input),
      },
    };
  } catch (error) {
    console.error('Failed to parse LLM draft response:', error);
    // Return fallback drafts
    return {
      occupierAcknowledgement: {
        subject: `Work Order Received - ${extracted.issueCategory} Issue`,
        body: generateFallbackOccupierEmail(input),
      },
      vendorDispatch: {
        subject: `Service Request - ${decisions.priority} Priority - ${propertyName}`,
        body: generateFallbackVendorEmail(input),
      },
      internalNote: {
        subject: `Internal: ${extracted.issueCategory} Issue - ${occupierName}`,
        body: generateFallbackInternalNote(input),
      },
    };
  }
}

// Fallback email generators for when LLM fails

function generateFallbackOccupierEmail(input: DraftEmailsInput): string {
  const { extracted, decisions, property, occupier } = input;
  const occupierName = occupier?.brandName || occupier?.legalName || extracted.occupierName || 'Valued Occupier';
  const propertyName = property?.name || extracted.propertyName || 'the property';

  return `Dear ${occupier?.primaryContactName || occupierName} Team,

Thank you for reporting the ${extracted.issueCategory.toLowerCase()} issue at ${propertyName}. We have received your request and are treating it as ${decisions.priority} priority.

Issue Summary: ${extracted.description}

Next Steps:
- Our service vendor has been dispatched
- Expected response time: Within ${decisions.slaHours} hours
- A technician will contact you to confirm arrival time

If you have any questions or the situation changes, please contact our property management team immediately.

Best regards,
Property Management Team`;
}

function generateFallbackVendorEmail(input: DraftEmailsInput): string {
  const { extracted, decisions, property, space, occupier } = input;
  const propertyName = property?.name || extracted.propertyName || 'Property';
  const spaceLabel = space?.spaceLabel || extracted.spaceLabel || 'See details below';

  return `SERVICE REQUEST - ${decisions.priority} PRIORITY

Property: ${propertyName}
${property?.address ? `Address: ${property.address}` : ''}
Space: ${spaceLabel}
Occupier: ${occupier?.brandName || occupier?.legalName || extracted.occupierName || 'On-site contact'}
Contact: ${occupier?.primaryContactPhone || occupier?.primaryContactEmail || extracted.occupierEmail || 'Contact property management'}

Issue Category: ${extracted.issueCategory}
Description: ${extracted.description}

SLA Requirement: On-site within ${decisions.slaHours} hours
Authorization: Up to $${decisions.maxApprovedCost || 2500} without additional approval

Access Instructions: ${extracted.accessConstraints || 'Contact occupier for access'}

Please confirm receipt and estimated arrival time.

Property Management Team`;
}

function generateFallbackInternalNote(input: DraftEmailsInput): string {
  const { extracted, decisions, property, space, occupier, vendor } = input;

  return `INTERNAL WORK ORDER NOTE

Property: ${property?.name || extracted.propertyName || 'Unknown'}
Space: ${space?.spaceLabel || extracted.spaceLabel || 'Unknown'}
Occupier: ${occupier?.brandName || occupier?.legalName || extracted.occupierName || 'Unknown'}

Issue: ${extracted.issueCategory} - ${extracted.description}

Risk Assessment:
- Priority: ${decisions.priority}
- Business Impact: ${decisions.businessImpact}
- SLA: ${decisions.slaHours} hours

Vendor Assignment: ${vendor?.name || 'Pending assignment'}
Cost Estimate: $${decisions.estimatedCost || 'TBD'}
Owner Approval Required: ${decisions.needsOwnerApproval ? 'YES' : 'No'}

Follow-up Required:
- Vendor confirmation
- Occupier check-in
- Completion verification

Notes: ${extracted.accessConstraints || 'None'}`;
}

/**
 * Generate a one-line summary for the work order
 */
export async function generateWorkOrderSummary(
  extracted: ExtractedWorkOrder
): Promise<string> {
  // For simplicity, create a deterministic summary without LLM
  const location = [extracted.propertyName, extracted.spaceLabel]
    .filter(Boolean)
    .join(' - ');

  const issue = extracted.description.length > 100
    ? extracted.description.slice(0, 100) + '...'
    : extracted.description;

  return location ? `${location}: ${issue}` : issue;
}
