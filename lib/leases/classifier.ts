/**
 * Lease Clause Classifier
 *
 * Uses LLM to classify lease text chunks by topic and responsible party.
 * Optimized for commercial real estate (CRE) lease analysis.
 */

import { callLLM } from '../llm';

// Valid topics for lease clauses - CRE-specific
export const CLAUSE_TOPICS = [
  'HVAC',
  'ROOF',
  'STRUCTURE',
  'CAM',
  'INSURANCE',
  'INDEMNITY',
  'PARKING',
  'SIGNAGE',
  'ACCESS',
  'UTILITIES',
  'MAINTENANCE',
  'REPAIRS',
  'JANITORIAL',
  'LANDSCAPING',
  'SECURITY',
  'FIRE_SAFETY',
  'ELEVATORS',
  'PLUMBING',
  'ELECTRICAL',
  'ENVIRONMENTAL',
  'EXCLUSIVITY',
  'USE',
  'RENEWAL_OPTIONS',
  'RENT_ESCALATION',
  'DEFAULT',
  'TERMINATION',
  'OTHER',
] as const;

export type ClauseTopic = (typeof CLAUSE_TOPICS)[number];

// Valid responsible parties
export const RESPONSIBLE_PARTIES = [
  'LANDLORD',
  'TENANT',
  'SHARED',
  'UNKNOWN',
] as const;

export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export interface ClauseClassification {
  topic: ClauseTopic;
  responsibleParty: ResponsibleParty;
  sectionLabel: string | null;
  confidence: number;
}

/**
 * Build the classification prompt - optimized for CRE lease analysis
 */
function buildClassificationPrompt(chunkText: string, sectionLabel?: string): string {
  const sectionContext = sectionLabel
    ? `SECTION CONTEXT: This clause is from "${sectionLabel}"\n\n`
    : '';

  return `You are a commercial real estate (CRE) lease analyst. Classify this lease clause.

${sectionContext}CLAUSE TEXT:
"""
${chunkText.substring(0, 2500)}
"""

ALLOWED TOPICS (pick exactly one):
HVAC, ROOF, STRUCTURE, CAM, INSURANCE, INDEMNITY, PARKING, SIGNAGE, ACCESS, UTILITIES, MAINTENANCE, REPAIRS, JANITORIAL, LANDSCAPING, SECURITY, FIRE_SAFETY, ELEVATORS, PLUMBING, ELECTRICAL, ENVIRONMENTAL, EXCLUSIVITY, USE, RENEWAL_OPTIONS, RENT_ESCALATION, DEFAULT, TERMINATION, OTHER

ALLOWED RESPONSIBLE PARTIES (pick exactly one):
LANDLORD, TENANT, SHARED, UNKNOWN

CLASSIFICATION RULES:
1. TOPIC: Choose the MOST SPECIFIC applicable topic.
   - HVAC = heating, ventilation, air conditioning, mechanical systems
   - ROOF = roof repairs, roof replacement, roof maintenance
   - STRUCTURE = foundation, walls, building envelope, structural elements
   - CAM = common area maintenance, operating expenses, NNN pass-throughs
   - MAINTENANCE = general maintenance obligations (use more specific if possible)
   - REPAIRS = general repair obligations (use more specific if possible)
   - USE = permitted use, prohibited uses, exclusive use rights
   - EXCLUSIVITY = exclusive use, non-compete, co-tenancy
   - Use OTHER only for definitions, recitals, or truly miscellaneous provisions

2. RESPONSIBLE PARTY:
   - LANDLORD: The clause clearly places the obligation on Landlord/Lessor
   - TENANT: The clause clearly places the obligation on Tenant/Lessee
   - SHARED: Obligations are split (e.g., Landlord = structural, Tenant = non-structural) OR both parties have duties
   - UNKNOWN: Cannot determine responsibility (e.g., definitions, general provisions)

3. If this is a definitions section, recitals, or signature block, use topic=OTHER, responsibleParty=UNKNOWN

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "topic": "TOPIC_HERE",
  "responsibleParty": "PARTY_HERE",
  "sectionLabel": "extract section number/title if visible, or null",
  "confidence": 0.0 to 1.0
}`;
}

/**
 * Classify a lease clause text chunk
 */
export async function classifyClause(
  chunkText: string,
  sectionLabel?: string
): Promise<ClauseClassification> {
  const prompt = buildClassificationPrompt(chunkText, sectionLabel);

  try {
    const response = await callLLM(prompt);

    // Parse the JSON response
    const cleanedResponse = response
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // Validate and normalize the topic
    let topic: ClauseTopic = 'OTHER';
    if (parsed.topic && CLAUSE_TOPICS.includes(parsed.topic)) {
      topic = parsed.topic;
    } else if (parsed.topic) {
      // Try to map common variations
      const normalizedTopic = parsed.topic.toUpperCase().replace(/\s+/g, '_');
      if (normalizedTopic === 'GENERAL_MAINTENANCE') {
        topic = 'MAINTENANCE';
      } else if (CLAUSE_TOPICS.includes(normalizedTopic as ClauseTopic)) {
        topic = normalizedTopic as ClauseTopic;
      }
    }

    // Validate and normalize the responsible party
    let responsibleParty: ResponsibleParty = 'UNKNOWN';
    if (parsed.responsibleParty && RESPONSIBLE_PARTIES.includes(parsed.responsibleParty)) {
      responsibleParty = parsed.responsibleParty;
    } else if (parsed.responsibleParty) {
      const normalizedParty = parsed.responsibleParty.toUpperCase();
      if (RESPONSIBLE_PARTIES.includes(normalizedParty as ResponsibleParty)) {
        responsibleParty = normalizedParty as ResponsibleParty;
      }
    }

    // Extract section label (prefer passed-in label, fall back to parsed)
    const extractedLabel = sectionLabel || parsed.sectionLabel || null;

    return {
      topic,
      responsibleParty,
      sectionLabel: extractedLabel,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
    };
  } catch (error) {
    console.error('Error classifying clause:', error);
    // Return a default classification on error
    return {
      topic: 'OTHER',
      responsibleParty: 'UNKNOWN',
      sectionLabel: sectionLabel || null,
      confidence: 0,
    };
  }
}

/**
 * Batch classify multiple clauses (with rate limiting)
 */
export async function classifyClausesBatch(
  chunks: Array<{ text: string; sectionLabel?: string }>,
  options?: { delayMs?: number }
): Promise<ClauseClassification[]> {
  const delayMs = options?.delayMs || 200;
  const results: ClauseClassification[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Classifier] Classifying chunk ${i + 1}/${chunks.length}`);
    const classification = await classifyClause(chunks[i].text, chunks[i].sectionLabel);
    results.push(classification);

    // Rate limiting delay (except for last item)
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Infer likely topics from a question for filtering
 */
export function inferTopicsFromQuestion(question: string): ClauseTopic[] {
  const lowerQuestion = question.toLowerCase();
  const inferredTopics: ClauseTopic[] = [];

  const topicKeywords: Record<ClauseTopic, string[]> = {
    HVAC: ['hvac', 'heating', 'cooling', 'air conditioning', 'ac unit', 'ventilation', 'mechanical'],
    ROOF: ['roof', 'roofing', 'leak', 'water damage from above'],
    STRUCTURE: ['structure', 'structural', 'foundation', 'walls', 'building envelope', 'exterior walls'],
    CAM: ['cam', 'common area', 'operating expenses', 'pass-through', 'triple net', 'nnn', 'cam cap'],
    INSURANCE: ['insurance', 'liability', 'coverage', 'policy', 'waiver of subrogation'],
    INDEMNITY: ['indemnity', 'indemnification', 'hold harmless'],
    PARKING: ['parking', 'spaces', 'garage', 'lot'],
    SIGNAGE: ['signage', 'sign', 'logo', 'branding', 'monument'],
    ACCESS: ['access', 'entry', 'keys', '24/7', 'hours of operation', 'building access'],
    UTILITIES: ['utilities', 'electric', 'gas', 'water', 'sewer', 'utility'],
    MAINTENANCE: ['maintenance', 'maintain', 'upkeep', 'preventive maintenance'],
    REPAIRS: ['repair', 'fix', 'restore', 'replacement'],
    JANITORIAL: ['janitorial', 'cleaning', 'custodial', 'trash'],
    LANDSCAPING: ['landscaping', 'grounds', 'exterior grounds', 'lawn'],
    SECURITY: ['security', 'alarm', 'surveillance', 'guard'],
    FIRE_SAFETY: ['fire', 'sprinkler', 'life safety', 'fire extinguisher', 'smoke detector'],
    ELEVATORS: ['elevator', 'lift', 'escalator'],
    PLUMBING: ['plumbing', 'pipes', 'water heater', 'drain', 'sewer'],
    ELECTRICAL: ['electrical', 'wiring', 'outlets', 'power', 'electric panel'],
    ENVIRONMENTAL: ['environmental', 'hazardous', 'asbestos', 'mold', 'contamination'],
    EXCLUSIVITY: ['exclusivity', 'exclusive use', 'non-compete', 'co-tenancy', 'radius restriction'],
    USE: ['permitted use', 'prohibited use', 'use restriction', 'operating covenant'],
    RENEWAL_OPTIONS: ['renewal', 'option to renew', 'extension', 'renewal option'],
    RENT_ESCALATION: ['escalation', 'increase', 'cpi', 'rent bump', 'annual increase'],
    DEFAULT: ['default', 'breach', 'violation', 'cure period'],
    TERMINATION: ['termination', 'early termination', 'break clause', 'termination option'],
    OTHER: [],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((kw) => lowerQuestion.includes(kw))) {
      inferredTopics.push(topic as ClauseTopic);
    }
  }

  return inferredTopics;
}
