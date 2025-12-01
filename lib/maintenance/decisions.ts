// Business Rules for Maintenance Work Orders
// All logic is deterministic TypeScript - no LLM calls

import {
  Priority,
  BusinessImpact,
  IssueCategory,
  ExtractedWorkOrder,
  WorkOrderDecisions,
  ScheduledActionProposal,
  CATEGORY_TO_TRADE,
} from './types';
import { prisma } from '@/lib/prisma';

// Keywords indicating life-safety emergencies
const LIFE_SAFETY_KEYWORDS = [
  'fire',
  'smoke',
  'burning smell',
  'electrical burning',
  'gas leak',
  'gas smell',
  'blocked exit',
  'blocked egress',
  'emergency exit',
  'sprinkler',
  'fire alarm',
  'evacuation',
  'structural damage',
  'collapse',
  'flooding',
  'sewage',
  'hazmat',
  'chemical spill',
];

// Keywords indicating high-priority water issues
const WATER_EMERGENCY_KEYWORDS = [
  'water intrusion',
  'water damage',
  'active leak',
  'flooding',
  'burst pipe',
  'water pouring',
  'ceiling leak',
  'roof leak active',
  'water on floor',
];

// Keywords indicating operations impact
const OPERATIONS_IMPACT_KEYWORDS = [
  'cannot operate',
  'store closure',
  'business closed',
  'uninhabitable',
  'cannot open',
  'customer safety',
  'employee safety',
  'health hazard',
  'no power',
  'no heat',
  'no cooling',
  'no water',
  'sales floor',
  'lobby',
  'main entrance',
  'critical area',
];

// Keywords indicating moderate impact
const MODERATE_IMPACT_KEYWORDS = [
  'discomfort',
  'inconvenience',
  'minor leak',
  'slow drain',
  'flickering light',
  'back office',
  'storage area',
  'break room',
];

/**
 * Determine priority and SLA based on issue category and description
 */
export function determinePriorityAndSLA(
  extracted: ExtractedWorkOrder
): { priority: Priority; slaHours: number } {
  const descLower = extracted.description.toLowerCase();
  const category = extracted.issueCategory;

  // Check for life-safety emergencies first
  if (
    category === 'LIFE_SAFETY' ||
    LIFE_SAFETY_KEYWORDS.some((kw) => descLower.includes(kw))
  ) {
    return { priority: 'EMERGENCY', slaHours: 2 };
  }

  // Check for active water emergencies
  if (WATER_EMERGENCY_KEYWORDS.some((kw) => descLower.includes(kw))) {
    // If affecting operations (sales floor, main areas)
    if (OPERATIONS_IMPACT_KEYWORDS.some((kw) => descLower.includes(kw))) {
      return { priority: 'EMERGENCY', slaHours: 2 };
    }
    return { priority: 'HIGH', slaHours: 4 };
  }

  // Electrical issues with burning smell = emergency
  if (category === 'ELECTRICAL' && descLower.includes('burning')) {
    return { priority: 'EMERGENCY', slaHours: 2 };
  }

  // Check severity from extraction
  if (extracted.severity === 'EMERGENCY') {
    return { priority: 'EMERGENCY', slaHours: 2 };
  }

  if (extracted.severity === 'HIGH') {
    return { priority: 'HIGH', slaHours: 4 };
  }

  // HVAC comfort issues during business hours
  if (category === 'HVAC') {
    if (
      descLower.includes('no heat') ||
      descLower.includes('no cooling') ||
      descLower.includes('no air')
    ) {
      return { priority: 'HIGH', slaHours: 4 };
    }
    return { priority: 'MEDIUM', slaHours: 24 };
  }

  // Plumbing - depends on severity
  if (category === 'PLUMBING') {
    if (descLower.includes('clogged') || descLower.includes('slow drain')) {
      return { priority: 'MEDIUM', slaHours: 24 };
    }
    if (descLower.includes('leak')) {
      return { priority: 'HIGH', slaHours: 4 };
    }
    return { priority: 'MEDIUM', slaHours: 24 };
  }

  // Roofing - usually high if there's a leak
  if (category === 'ROOFING') {
    if (descLower.includes('leak')) {
      return { priority: 'HIGH', slaHours: 4 };
    }
    return { priority: 'MEDIUM', slaHours: 24 };
  }

  // Default based on extracted severity
  if (extracted.severity === 'MEDIUM') {
    return { priority: 'MEDIUM', slaHours: 24 };
  }

  return { priority: 'LOW', slaHours: 72 };
}

/**
 * Determine business impact based on description and priority
 */
export function determineBusinessImpact(
  extracted: ExtractedWorkOrder,
  priority: Priority
): BusinessImpact {
  const descLower = extracted.description.toLowerCase();

  // Emergency = Critical
  if (priority === 'EMERGENCY') {
    return 'CRITICAL';
  }

  // Check for operations impact keywords
  const hasOperationsImpact = OPERATIONS_IMPACT_KEYWORDS.some((kw) =>
    descLower.includes(kw)
  );

  if (hasOperationsImpact) {
    return priority === 'HIGH' ? 'MAJOR' : 'MODERATE';
  }

  // Check for moderate impact keywords
  const hasModerateImpact = MODERATE_IMPACT_KEYWORDS.some((kw) =>
    descLower.includes(kw)
  );

  if (hasModerateImpact || priority === 'HIGH') {
    return 'MODERATE';
  }

  if (priority === 'MEDIUM') {
    return 'MODERATE';
  }

  return 'MINOR';
}

/**
 * Select appropriate vendor based on issue category
 */
export async function selectVendor(
  issueCategory: IssueCategory
): Promise<string | null> {
  const trade = CATEGORY_TO_TRADE[issueCategory];

  // First try to find a vendor with matching trade
  const matchingVendor = await prisma.vendor.findFirst({
    where: { trade },
    select: { id: true },
  });

  if (matchingVendor) {
    return matchingVendor.id;
  }

  // Fall back to general contractor
  if (trade !== 'GENERAL_CONTRACTOR') {
    const generalContractor = await prisma.vendor.findFirst({
      where: { trade: 'GENERAL_CONTRACTOR' },
      select: { id: true },
    });

    if (generalContractor) {
      return generalContractor.id;
    }
  }

  return null;
}

/**
 * Estimate cost based on category and priority
 */
export function estimateCost(
  category: IssueCategory,
  priority: Priority
): number {
  // Base estimates by category
  const categoryBaseCosts: Record<IssueCategory, number> = {
    ROOFING: 3500,
    HVAC: 2000,
    PLUMBING: 1200,
    ELECTRICAL: 1500,
    LIFE_SAFETY: 4000,
    GENERAL: 1500,
    OTHER: 2000,
  };

  const baseCost = categoryBaseCosts[category];

  // Priority multipliers
  const priorityMultipliers: Record<Priority, number> = {
    EMERGENCY: 2.0, // Emergency call-out premium
    HIGH: 1.5,
    MEDIUM: 1.0,
    LOW: 0.8,
  };

  return Math.round(baseCost * priorityMultipliers[priority]);
}

/**
 * Determine owner approval requirements based on cost
 */
export function determineOwnerApproval(estimatedCost: number): {
  needsOwnerApproval: boolean;
  maxApprovedCost: number;
} {
  // Threshold for auto-approval
  const autoApprovalLimit = 2500;

  if (estimatedCost <= autoApprovalLimit) {
    return {
      needsOwnerApproval: false,
      maxApprovedCost: autoApprovalLimit,
    };
  }

  // Above threshold: needs approval, but can proceed with temporary mitigation
  return {
    needsOwnerApproval: true,
    maxApprovedCost: autoApprovalLimit, // For temporary mitigation only
  };
}

// Keywords indicating extended operating hours (e.g., retail stores, gyms)
const EXTENDED_HOURS_KEYWORDS = [
  'open until 10',
  'open until 11',
  'open til 10',
  'open til 11',
  'hours are 7am-10pm',
  'hours are 8am-10pm',
  '24/7',
  '24 hour',
  'open late',
  'evening hours',
];

/**
 * Calculate proposed visit window using CRE business hours
 *
 * Rules:
 * - Default business hours: 8:00 AM - 6:00 PM (18:00)
 * - Round start time up to the next full hour
 * - If the calculated hour is before 8:00 AM, use 8:00 AM today
 * - If the calculated hour is after 6:00 PM, use 8:00 AM next day
 * - Visit window is 2 hours (start to start+2h)
 * - Extended hours (until 10pm) allowed if access constraints indicate it
 */
export function calculateVisitWindow(
  slaHours: number,
  timeZone: string = 'America/New_York',
  accessConstraints?: string
): { start: string; end: string } {
  const now = new Date();

  // Check if extended hours are allowed based on access constraints
  const constraintsLower = (accessConstraints || '').toLowerCase();
  const allowExtendedHours = EXTENDED_HOURS_KEYWORDS.some(kw =>
    constraintsLower.includes(kw)
  );

  // Business hours configuration
  const BUSINESS_START_HOUR = 8;  // 8:00 AM
  const BUSINESS_END_HOUR = allowExtendedHours ? 22 : 18; // 10 PM for extended, 6 PM default
  const VISIT_DURATION_HOURS = 2;

  // Calculate the proposed start time (round up to next hour + 1 hour buffer)
  let proposedStartHour = now.getHours() + 2;
  let proposedDate = new Date(now);
  proposedDate.setMinutes(0, 0, 0);

  // Round up if we have any minutes past the hour
  if (now.getMinutes() > 0 || now.getSeconds() > 0) {
    proposedStartHour = now.getHours() + 2;
  }

  // Apply business hours rules
  if (proposedStartHour < BUSINESS_START_HOUR) {
    // Too early - schedule for 8 AM today
    proposedStartHour = BUSINESS_START_HOUR;
  } else if (proposedStartHour >= BUSINESS_END_HOUR) {
    // Too late - schedule for 8 AM next day
    proposedDate.setDate(proposedDate.getDate() + 1);
    proposedStartHour = BUSINESS_START_HOUR;
  }

  // Set the start time
  const start = new Date(proposedDate);
  start.setHours(proposedStartHour, 0, 0, 0);

  // End time is start + 2 hours
  const end = new Date(start);
  end.setHours(start.getHours() + VISIT_DURATION_HOURS);

  // Ensure end time doesn't exceed business hours (extend to next day if needed)
  if (end.getHours() > BUSINESS_END_HOUR ||
      (end.getHours() === BUSINESS_END_HOUR && end.getMinutes() > 0)) {
    // If the visit would extend past business hours, just cap it
    end.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  }

  // For emergencies, check if we can still meet SLA with business hours
  const dueTime = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
  if (start > dueTime && slaHours <= 4) {
    // Emergency/high priority that can't wait for business hours
    // Allow immediate dispatch even outside normal hours
    const urgentStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    urgentStart.setMinutes(0, 0, 0);
    return {
      start: urgentStart.toISOString(),
      end: new Date(urgentStart.getTime() + VISIT_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Generate scheduled follow-up actions
 */
export function generateScheduledActions(
  priority: Priority,
  slaHours: number,
  dueAt: Date,
  timeZone: string = 'America/New_York'
): ScheduledActionProposal[] {
  const now = new Date();
  const actions: ScheduledActionProposal[] = [];

  // 1. Vendor follow-up
  const vendorFollowupHours = priority === 'EMERGENCY' || priority === 'HIGH' ? 1 : 4;
  const vendorFollowupTime = new Date(
    now.getTime() + vendorFollowupHours * 60 * 60 * 1000
  );

  actions.push({
    actionType: 'VENDOR_FOLLOWUP',
    scheduledFor: vendorFollowupTime.toISOString(),
    payload: {
      checkFor: 'vendor_confirmation',
      escalateIfNoResponse: true,
    },
    description: `Follow up with vendor if no confirmation received (${vendorFollowupHours}h after dispatch)`,
  });

  // 2. Occupier check-in - next day at 9am property local time
  const tomorrow9am = new Date(now);
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  actions.push({
    actionType: 'OCCUPIER_CHECKIN',
    scheduledFor: tomorrow9am.toISOString(),
    payload: {
      purpose: 'satisfaction_check',
      askAbout: ['issue_resolved', 'vendor_arrival', 'additional_concerns'],
    },
    description: 'Check in with occupier on work order status and satisfaction',
  });

  // 3. Internal escalation - if not completed by due date + 1 day
  const escalationTime = new Date(dueAt.getTime() + 24 * 60 * 60 * 1000);

  actions.push({
    actionType: 'ESCALATION_INTERNAL',
    scheduledFor: escalationTime.toISOString(),
    payload: {
      escalateTo: 'asset_manager',
      reason: 'work_order_overdue',
      includeTimeline: true,
    },
    description: 'Escalate to asset manager if work order not completed by due date',
  });

  return actions;
}

/**
 * Main function to compute all work order decisions
 */
export async function computeWorkOrderDecisions(
  extracted: ExtractedWorkOrder,
  timeZone: string = 'America/New_York'
): Promise<WorkOrderDecisions> {
  // 1. Determine priority and SLA
  const { priority, slaHours } = determinePriorityAndSLA(extracted);

  // 2. Determine business impact
  const businessImpact = determineBusinessImpact(extracted, priority);

  // 3. Select vendor
  const assignedVendorId = await selectVendor(extracted.issueCategory);

  // 4. Estimate cost
  const estimatedCost = estimateCost(extracted.issueCategory, priority);

  // 5. Determine owner approval
  const { needsOwnerApproval, maxApprovedCost } = determineOwnerApproval(estimatedCost);

  // 6. Calculate visit window (pass access constraints for extended hours detection)
  const proposedVisitWindow = calculateVisitWindow(
    slaHours,
    timeZone,
    extracted.accessConstraints
  );

  return {
    priority,
    slaHours,
    assignedVendorId,
    needsOwnerApproval,
    businessImpact,
    proposedVisitWindow,
    estimatedCost,
    maxApprovedCost,
  };
}

/**
 * Compute due date from SLA hours
 */
export function computeDueDate(slaHours: number): Date {
  return new Date(Date.now() + slaHours * 60 * 60 * 1000);
}
