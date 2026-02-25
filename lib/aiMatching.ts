/**
 * AI-based job matching, skill extraction, and fraud detection service.
 *
 * Architecture:
 *  - Gemini AI (optional) for smart skill extraction & match explanations
 *  - Deterministic keyword fallback when API key is absent
 *  - Weighted scoring: Skills(40) + Category(20) + Location(15) + Availability(15) + Experience(10)
 */
import { Job, WorkerProfile } from './types';
import { generateWithGemini } from './gemini';

// ────────────────────────────────────────────────────────────────────────────
// Gemini AI integration (optional — falls back to keyword logic)
// ────────────────────────────────────────────────────────────────────────────

/** Call Gemini via shared client. Returns null on failure. */
async function callGemini(prompt: string): Promise<string | null> {
  return generateWithGemini(prompt, { tier: 'flash', maxTokens: 256 });
}

// ────────────────────────────────────────────────────────────────────────────
// Skill extraction
// ────────────────────────────────────────────────────────────────────────────

/** Keyword → skill taxonomy for deterministic extraction */
const SKILL_TAXONOMY: Record<string, string[]> = {
  hotel: ['Hospitality', 'Customer Service', 'Cleaning', 'Housekeeping'],
  restaurant: ['Food Service', 'Customer Service', 'Kitchen Work', 'Hospitality'],
  cook: ['Cooking', 'Food Preparation', 'Kitchen Management', 'Recipe Knowledge'],
  waiter: ['Customer Service', 'Communication', 'Food Service', 'Hospitality'],
  clean: ['Cleaning', 'Housekeeping', 'Maintenance', 'Attention to Detail'],
  driver: ['Driving', 'Navigation', 'Vehicle Maintenance', 'Time Management'],
  delivery: ['Delivery', 'Logistics', 'Customer Service', 'Time Management'],
  sales: ['Sales', 'Communication', 'Customer Relations', 'Negotiation'],
  shop: ['Retail', 'Customer Service', 'Sales', 'Inventory Management'],
  computer: ['Computer Skills', 'Data Entry', 'Office Work', 'Technology'],
  teaching: ['Teaching', 'Communication', 'Patience', 'Subject Knowledge'],
  carpenter: ['Carpentry', 'Woodwork', 'Tool Handling', 'Construction'],
  plumber: ['Plumbing', 'Pipe Fitting', 'Maintenance', 'Problem Solving'],
  electrician: ['Electrical Work', 'Wiring', 'Troubleshooting', 'Safety'],
  painter: ['Painting', 'Color Mixing', 'Surface Preparation', 'Decoration'],
  mechanic: ['Mechanical Work', 'Vehicle Repair', 'Troubleshooting', 'Tool Handling'],
  security: ['Security', 'Surveillance', 'Safety', 'Communication'],
  gardener: ['Gardening', 'Landscaping', 'Plant Care', 'Maintenance'],
} as const;

/** Contextual keyword → skill inferences */
const CONTEXT_KEYWORDS: Record<string, string> = {
  worked: 'Experience',
  experience: 'Experience',
  manage: 'Management',
  supervisor: 'Management',
  team: 'Teamwork',
  group: 'Teamwork',
};

/**
 * Extract skills from natural language using keyword matching.
 * Used as fallback when Gemini is unavailable.
 */
export function extractSkills(description: string): string[] {
  const extracted = new Set<string>();
  const lower = description.toLowerCase();

  // Match taxonomy keywords
  for (const [keyword, skills] of Object.entries(SKILL_TAXONOMY)) {
    if (lower.includes(keyword)) {
      skills.forEach((s) => extracted.add(s));
    }
  }

  // Match contextual keywords
  for (const [keyword, skill] of Object.entries(CONTEXT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      extracted.add(skill);
    }
  }

  return Array.from(extracted);
}

/**
 * Extract skills using Gemini AI, with keyword fallback.
 * Truncates input to 500 chars to stay within token budget.
 */
export async function extractSkillsWithAI(description: string): Promise<string[]> {
  const prompt = `Extract a JSON array of professional skills from this job description. Return ONLY a JSON array like ["skill1","skill2"]. Description: "${description.slice(0, 500)}"`;
  const result = await callGemini(prompt);
  if (result) {
    try {
      const match = result.match(/\[[\s\S]*?\]/);
      if (match) return JSON.parse(match[0]) as string[];
    } catch {
      /* fall through to keyword extraction */
    }
  }
  return extractSkills(description);
}

/**
 * Generate a human-readable match explanation using Gemini or deterministic logic.
 */
export async function generateMatchExplanationWithAI(
  workerProfile: WorkerProfile,
  job: Job,
  matchScore: number,
): Promise<string> {
  const quality = matchScore >= 70 ? 'great' : matchScore >= 40 ? 'good' : 'possible';
  const prompt = `A worker has skills: ${workerProfile.skills.join(', ')} and works in: ${workerProfile.categories.join(', ')}.
A job requires: ${job.requiredSkills.join(', ')} in ${job.category} at ${job.location}.
Match score: ${matchScore}%. Write ONE short sentence (max 20 words) explaining why this is a ${quality} match.`;
  const result = await callGemini(prompt);
  if (result) return result.trim().replace(/^["']|["']$/g, '');
  return explainJobMatch(workerProfile, job, matchScore);
}

// ────────────────────────────────────────────────────────────────────────────
// Category matching with alias resolution
// ────────────────────────────────────────────────────────────────────────────

/** Maps employer slug-style categories to worker display-name categories */
const CATEGORY_ALIASES: Record<string, string[]> = {
  'home-services': ['Cleaning', 'Gardening', 'Security', 'Housekeeping'],
  delivery: ['Delivery', 'Driving'],
  repair: ['Plumbing', 'Electrical', 'Mechanical', 'Carpentry'],
  construction: ['Construction', 'Carpentry', 'Painting'],
  'office-work': ['Office Work', 'Data Entry', 'Customer Service', 'Teaching'],
  hospitality: ['Hospitality', 'Cooking'],
  teaching: ['Teaching'],
  sales: ['Sales', 'Retail'],
  other: ['Other'],
};

/**
 * Check if a job category matches any of the worker's selected categories.
 * Supports direct match, alias resolution, and partial substring match.
 */
function categoryMatches(jobCategory: string, workerCategories: string[]): boolean {
  const jc = jobCategory.toLowerCase();
  const wc = workerCategories.map((c) => c.toLowerCase());

  // Direct match (case-insensitive)
  if (wc.includes(jc)) return true;

  // Alias match (slug → display names)
  const aliases = CATEGORY_ALIASES[jc] ?? [];
  if (aliases.some((a) => wc.includes(a.toLowerCase()))) return true;

  // Reverse: worker category matches part of job category or vice-versa
  return wc.some((w) => jc.includes(w) || w.includes(jc));
}

// ────────────────────────────────────────────────────────────────────────────
// Scoring helpers
// ────────────────────────────────────────────────────────────────────────────

/** Scoring weight constants (must sum to 100) */
const WEIGHTS = {
  SKILLS: 40,
  CATEGORY: 20,
  LOCATION_EXACT: 15,
  LOCATION_PARTIAL: 10,
  AVAILABILITY_EXACT: 15,
  AVAILABILITY_PARTIAL: 8,
  EXPERIENCE: 10,
} as const;

/**
 * Tokenize a skill string into individual words for more accurate matching.
 * "Data Entry" → ["data", "entry"]
 */
function tokenize(skill: string): string[] {
  return skill
    .toLowerCase()
    .split(/[\s,\-\/&]+/)
    .filter((t) => t.length > 1);
}

/**
 * Calculate similarity between two skills using token overlap (Jaccard-like).
 * Returns a value between 0 and 1.
 * This avoids false positives from naive `includes()` (e.g. "Data" matching "Update Database").
 */
function skillSimilarity(skillA: string, skillB: string): number {
  const tokensA = tokenize(skillA);
  const tokensB = tokenize(skillB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = tokensA.filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;

  return union > 0 ? intersection / union : 0;
}

/** Threshold above which two skills are considered a match */
const SKILL_MATCH_THRESHOLD = 0.5;

/**
 * Extract the first city name from a "City, State" location string.
 */
function extractCity(location: string): string {
  return location.split(',')[0].trim().toLowerCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Core matching engine
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculate a match score (0–100) between a worker profile and a job.
 *
 * Scoring breakdown:
 *  - Skills overlap:        40 pts (token-based similarity)
 *  - Category match:        20 pts (with alias resolution)
 *  - Location proximity:    15 pts (exact city) / 10 pts (partial)
 *  - Availability match:    15 pts (exact) / 8 pts (partial)
 *  - Experience relevance:  10 pts (keyword overlap with job description)
 */
export function calculateMatchScore(
  workerProfile: WorkerProfile,
  job: Job,
): number {
  let score = 0;

  // ── 1. Skill matching (40 pts) ──────────────────────────────────────────
  const jobSkills = job.requiredSkills;
  const workerSkills = workerProfile.skills;

  if (jobSkills.length > 0 && workerSkills.length > 0) {
    let matchedCount = 0;
    for (const js of jobSkills) {
      // Find the best-matching worker skill for this job skill
      const bestSim = Math.max(
        ...workerSkills.map((ws) => skillSimilarity(ws, js)),
      );
      if (bestSim >= SKILL_MATCH_THRESHOLD) matchedCount++;
    }
    score += (matchedCount / jobSkills.length) * WEIGHTS.SKILLS;
  }

  // ── 2. Category matching (20 pts) ───────────────────────────────────────
  if (categoryMatches(job.category, workerProfile.categories)) {
    score += WEIGHTS.CATEGORY;
  }

  // ── 3. Location proximity (15 pts) ──────────────────────────────────────
  if (workerProfile.location && job.location) {
    const workerCity = extractCity(workerProfile.location);
    const jobCity = extractCity(job.location);

    if (workerCity === jobCity) {
      score += WEIGHTS.LOCATION_EXACT;
    } else if (workerCity.includes(jobCity) || jobCity.includes(workerCity)) {
      score += WEIGHTS.LOCATION_PARTIAL;
    }
  }

  // ── 4. Availability matching (15 pts) ───────────────────────────────────
  if (workerProfile.availability) {
    const avail = workerProfile.availability.toLowerCase();
    const jt = job.jobType;

    const isExactMatch =
      (avail.includes('full') && jt === 'full-time') ||
      (avail.includes('part') && jt === 'part-time') ||
      avail.includes('flexible') ||
      avail.includes('any');

    const isPartialMatch =
      (avail.includes('part') && jt === 'gig') ||
      (avail.includes('full') && jt === 'part-time');

    if (isExactMatch) {
      score += WEIGHTS.AVAILABILITY_EXACT;
    } else if (isPartialMatch) {
      score += WEIGHTS.AVAILABILITY_PARTIAL;
    }
  }

  // ── 5. Experience relevance (10 pts) ────────────────────────────────────
  // Check keyword overlap between worker experience and job description
  // instead of just checking string length (previous bug).
  if (workerProfile.experience) {
    const expTokens = new Set(tokenize(workerProfile.experience));
    const jobTokens = tokenize(job.description + ' ' + job.requiredSkills.join(' '));
    const overlap = jobTokens.filter((t) => expTokens.has(t)).length;
    // Award points proportionally: 3+ overlapping words = full points
    const expScore = Math.min(overlap / 3, 1) * WEIGHTS.EXPERIENCE;
    score += expScore;
  }

  return Math.min(Math.round(score), 100);
}

// ────────────────────────────────────────────────────────────────────────────
// Job recommendation APIs
// ────────────────────────────────────────────────────────────────────────────

/** Minimum match score to include in recommendations */
const MIN_RECOMMENDATION_SCORE = 20;

/**
 * Get AI-scored job recommendations for a worker with a completed profile.
 * Returns jobs sorted by match score (descending), filtered above threshold.
 */
export function getRecommendedJobs(
  workerProfile: WorkerProfile,
  allJobs: Job[],
  limit = 10,
): Array<{ job: Job; matchScore: number }> {
  return allJobs
    .filter((job) => job.status === 'active')
    .map((job) => ({
      job,
      matchScore: calculateMatchScore(workerProfile, job),
    }))
    .filter((item) => item.matchScore > MIN_RECOMMENDATION_SCORE)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * Basic category-only recommendations for workers with incomplete profiles.
 * Uses `categoryMatches()` with alias resolution (previously used strict equality — bug fix).
 */
export function getBasicRecommendations(
  categories: string[],
  allJobs: Job[],
  limit = 10,
): Job[] {
  const activeJobs = allJobs.filter((j) => j.status === 'active');

  if (categories.length === 0) {
    // No categories selected → return most recent jobs
    return activeJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Use alias-aware matching instead of strict equality
  return activeJobs
    .filter((job) => categoryMatches(job.category, categories))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Match jobs for a worker — auto-fetches worker profile for real scoring.
 *
 * FIXED: Previous version returned flat score (50) when no `getWorkerProfile`
 * callback was provided, making the "Recommended" tab on the Jobs page useless.
 * Now requires the callback or returns jobs sorted by recency with score 0.
 */
export async function matchJobs(
  worker: { id: string },
  jobs: Job[],
  getWorkerProfile?: (workerId: string) => Promise<WorkerProfile | null>,
): Promise<Array<{ job: Job; score: number }>> {
  const activeJobs = jobs.filter((job) => job.status === 'active');

  // Without a profile fetcher, we can't score — return by recency with score 0
  if (!getWorkerProfile) {
    return activeJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((job) => ({ job, score: 0 }));
  }

  const profile = await getWorkerProfile(worker.id);

  // No profile found — return by recency with score 0
  if (!profile) {
    return activeJobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((job) => ({ job, score: 0 }));
  }

  // Full scoring with worker profile
  return activeJobs
    .map((job) => ({ job, score: calculateMatchScore(profile, job) }))
    .sort((a, b) => b.score - a.score);
}

// ────────────────────────────────────────────────────────────────────────────
// Fraud detection
// ────────────────────────────────────────────────────────────────────────────

/** Keywords that indicate a potentially fraudulent job posting */
const FRAUD_KEYWORDS = [
  'registration fee',
  'deposit required',
  'pay to apply',
  'advance payment',
  'training fee',
  'security deposit',
  'upfront payment',
  'send money',
  'bank details',
  'credit card',
  'ssn',
  'aadhaar card required',
  'guaranteed income',
  'get rich quick',
  'work from home guaranteed',
  'no experience needed high pay',
] as const;

/**
 * Detect fraud keywords in a job description.
 * Returns the list of matched keywords and a suspicion flag.
 */
export function detectFraudKeywords(text: string): {
  isSuspicious: boolean;
  keywords: string[];
} {
  const lower = text.toLowerCase();
  const found = FRAUD_KEYWORDS.filter((kw) => lower.includes(kw));
  return { isSuspicious: found.length > 0, keywords: [...found] };
}

// ────────────────────────────────────────────────────────────────────────────
// Chat message safety
// ────────────────────────────────────────────────────────────────────────────

/** Indian phone number pattern (with optional +91 prefix) */
const PHONE_REGEX = /(\+91|91)?[\s-]?[6-9]\d{9}/;

/** Common email pattern */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Off-platform payment keywords that indicate a user is trying to bypass escrow.
 * FIXED: Removed generic "payment" — it false-positived on legitimate escrow status discussions.
 */
const OFFPLATFORM_PAYMENT_KEYWORDS = [
  'send money',
  'paytm',
  'gpay',
  'phonepe',
  'bank transfer',
  'upi id',
  'pay me directly',
] as const;

/**
 * Check if a chat message contains suspicious off-platform content.
 * Returns a reason string if suspicious.
 */
export function checkMessageSuspicion(message: string): {
  isSuspicious: boolean;
  reason?: string;
} {
  // Phone number sharing
  if (PHONE_REGEX.test(message)) {
    return {
      isSuspicious: true,
      reason: 'Contains phone number - please use in-app chat only',
    };
  }

  // WhatsApp sharing
  const lower = message.toLowerCase();
  if (lower.includes('whatsapp') || lower.includes('wa.me')) {
    return {
      isSuspicious: true,
      reason: 'Contains WhatsApp reference - please use in-app chat only',
    };
  }

  // Email sharing
  if (EMAIL_REGEX.test(message)) {
    return {
      isSuspicious: true,
      reason: 'Contains email address - please use in-app chat only',
    };
  }

  // Off-platform payment attempts (escrow bypass)
  if (OFFPLATFORM_PAYMENT_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      isSuspicious: true,
      reason: 'Contains off-platform payment reference - all payments must go through platform escrow',
    };
  }

  return { isSuspicious: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Match explanation (deterministic fallback)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable explanation for why a job matches a worker.
 * Uses the same scoring dimensions as `calculateMatchScore`.
 */
export function explainJobMatch(
  workerProfile: WorkerProfile,
  job: Job,
  _matchScore: number,
): string {
  const reasons: string[] = [];

  // Skill matches (using token similarity, consistent with scoring)
  const matchingSkills = workerProfile.skills.filter((ws) =>
    job.requiredSkills.some((js) => skillSimilarity(ws, js) >= SKILL_MATCH_THRESHOLD),
  );
  if (matchingSkills.length > 0) {
    reasons.push(`Your skills (${matchingSkills.join(', ')}) match the job requirements`);
  }

  // Category match (using alias-aware matching, consistent with scoring)
  if (categoryMatches(job.category, workerProfile.categories)) {
    reasons.push(`You have experience in ${job.category}`);
  }

  // Location match
  if (workerProfile.location && job.location) {
    const workerCity = extractCity(workerProfile.location);
    const jobCity = extractCity(job.location);
    if (workerCity === jobCity) {
      reasons.push('Job is in your city');
    }
  }

  // Availability match
  if (workerProfile.availability) {
    const avail = workerProfile.availability.toLowerCase();
    if (
      (avail.includes('full') && job.jobType === 'full-time') ||
      (avail.includes('part') && job.jobType === 'part-time') ||
      avail.includes('flexible')
    ) {
      reasons.push('Job timing matches your availability');
    }
  }

  if (reasons.length === 0) {
    return `This ${job.jobType} ${job.category} position might be a good fit for you based on your profile.`;
  }

  return reasons.join('. ') + '.';
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Job categories — shared between worker profile and employer post form */
export const JOB_CATEGORIES = [
  'Hospitality',
  'Cooking',
  'Cleaning',
  'Delivery',
  'Driving',
  'Sales',
  'Retail',
  'Construction',
  'Carpentry',
  'Plumbing',
  'Electrical',
  'Painting',
  'Mechanical',
  'Security',
  'Gardening',
  'Teaching',
  'Office Work',
  'Data Entry',
  'Customer Service',
  'Healthcare',
  'Beauty & Wellness',
  'IT & Tech Support',
  'Photography',
  'Event Management',
  'Other',
] as const;
