// Maintenance Module Types
// CRE-specific terminology: property, building, suite/space, occupier, vendor, asset manager

export type IssueCategory =
  | 'ROOFING'
  | 'HVAC'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'LIFE_SAFETY'
  | 'GENERAL'
  | 'OTHER';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type BusinessImpact = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';

export type WorkOrderStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MessageStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

export type RecipientType = 'OCCUPIER' | 'VENDOR' | 'INTERNAL';

export type ScheduledActionType =
  | 'VENDOR_FOLLOWUP'
  | 'OCCUPIER_CHECKIN'
  | 'ESCALATION_INTERNAL';

export type ScheduledActionStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED';

// Extracted data from an occupier's email
export interface ExtractedWorkOrder {
  propertyName?: string;     // e.g. "Willow Creek Shopping Center"
  spaceLabel?: string;       // e.g. "Suite 120"
  occupierName?: string;     // e.g. "Anchor Grocery"
  occupierEmail?: string;    // Sender email
  issueCategory: IssueCategory;
  description: string;       // Natural language description of the problem
  severity: Priority;        // Initial priority estimate from email
  accessConstraints?: string; // e.g. "Store open 8am–10pm, rear service corridor access"
  reportedAt?: string;       // ISO datetime if parseable
}

// Business rule decisions computed from extracted data
export interface WorkOrderDecisions {
  priority: Priority;
  slaHours: number;
  assignedVendorId: string | null;
  needsOwnerApproval: boolean;
  businessImpact: BusinessImpact;
  proposedVisitWindow: {
    start: string; // ISO datetime
    end: string;   // ISO datetime
  } | null;
  estimatedCost: number | null;
  maxApprovedCost: number | null;
}

// Email draft structure
export interface EmailDraft {
  subject: string;
  body: string;
}

// Scheduled action proposal (before persisting to DB)
export interface ScheduledActionProposal {
  actionType: ScheduledActionType;
  scheduledFor: string; // ISO datetime
  payload: Record<string, unknown>;
  description: string;  // Human-readable summary
}

// Full response from the from-email API
export interface HandleEmailResponse {
  extracted: ExtractedWorkOrder;
  decisions: WorkOrderDecisions;
  drafts: {
    occupierAcknowledgement: EmailDraft;
    vendorDispatch: EmailDraft;
    internalNote: EmailDraft;
  };
  scheduledActions: ScheduledActionProposal[];
  // Resolved entity IDs (if found in database)
  resolvedEntities: {
    propertyId: string | null;
    spaceId: string | null;
    occupierId: string | null;
    vendorId: string | null;
  };
  // Resolved entity data for display
  resolvedEntityData?: {
    property?: PropertyEntity | null;
    space?: SpaceEntity | null;
    occupier?: OccupierEntity | null;
    vendor?: VendorEntity | null;
  };
}

// Request body for approve-plan API
export interface ApprovePlanRequest {
  rawEmailText: string;
  extracted: ExtractedWorkOrder;
  decisions: WorkOrderDecisions;
  drafts: {
    occupierAcknowledgement: EmailDraft;
    vendorDispatch: EmailDraft;
    internalNote: EmailDraft;
  };
  scheduledActions: ScheduledActionProposal[];
  // Overrides from UI
  overrides?: {
    vendorId?: string;
    visitWindowStart?: string;
    visitWindowEnd?: string;
    estimatedCost?: number;
    maxApprovedCost?: number;
    enabledActionTypes?: ScheduledActionType[];
  };
}

// Response from approve-plan API
export interface ApprovePlanResponse {
  success: boolean;
  workOrderId: string;
  propertyId: string;
  spaceId: string | null;
  occupierId: string | null;
  messagesCreated: number;
  scheduledActionsCreated: number;
}

// Property entity for display/selection
export interface PropertyEntity {
  id: string;
  name: string;
  address: string;
  type: string | null;
  timeZone: string;
}

// Space entity for display/selection
export interface SpaceEntity {
  id: string;
  propertyId: string;
  spaceLabel: string;
  floor: string | null;
  areaSqft: number | null;
  useType: string | null;
}

// Occupier entity for display/selection
export interface OccupierEntity {
  id: string;
  spaceId: string;
  legalName: string;
  brandName: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
}

// Vendor entity for display/selection
export interface VendorEntity {
  id: string;
  name: string;
  trade: string;
  email: string | null;
  phone: string | null;
}

// Trade types for vendor matching
export const TRADE_TO_CATEGORY: Record<string, IssueCategory> = {
  ROOFING: 'ROOFING',
  HVAC: 'HVAC',
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  LIFE_SAFETY: 'LIFE_SAFETY',
  GENERAL_CONTRACTOR: 'GENERAL',
};

export const CATEGORY_TO_TRADE: Record<IssueCategory, string> = {
  ROOFING: 'ROOFING',
  HVAC: 'HVAC',
  PLUMBING: 'PLUMBING',
  ELECTRICAL: 'ELECTRICAL',
  LIFE_SAFETY: 'LIFE_SAFETY',
  GENERAL: 'GENERAL_CONTRACTOR',
  OTHER: 'GENERAL_CONTRACTOR',
};
