// AI-based job matching and skill extraction service
import { Job, WorkerProfile } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Optional Gemini AI integration (NEXT_PUBLIC_GEMINI_API_KEY env var)
// Falls back to keyword-based matching when key is absent.
// ────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '')
  : ''

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    return (json?.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? null
  } catch { return null }
}

/**
 * Extract skills from a natural language description.
 * Uses Gemini when available, otherwise falls back to keyword matching.
 */
export async function extractSkillsWithAI(description: string): Promise<string[]> {
  const prompt = `Extract a JSON array of professional skills from this job description. Return ONLY a JSON array like ["skill1","skill2"]. Description: "${description.slice(0, 500)}"`
  const result = await callGemini(prompt)
  if (result) {
    try {
      const match = result.match(/\[[\s\S]*?\]/)
      if (match) return JSON.parse(match[0]) as string[]
    } catch { /* fall through */ }
  }
  return extractSkills(description)
}

/**
 * Generate a personalized match explanation using Gemini or fallback to local logic.
 */
export async function generateMatchExplanationWithAI(
  workerProfile: WorkerProfile,
  job: Job,
  matchScore: number
): Promise<string> {
  const prompt = `A worker has skills: ${workerProfile.skills.join(', ')} and works in: ${workerProfile.categories.join(', ')}.
A job requires: ${job.requiredSkills.join(', ')} in ${job.category} at ${job.location}.
Match score: ${matchScore}%. Write ONE short sentence (max 20 words) explaining why this is a ${matchScore >= 70 ? 'great' : matchScore >= 40 ? 'good' : 'possible'} match.`
  const result = await callGemini(prompt)
  if (result) return result.trim().replace(/^["']|["']$/g, '')
  return explainJobMatch(workerProfile, job, matchScore)
}

// Mock AI skill extraction from natural language
export function extractSkills(description: string): string[] {
  const skillsMap: Record<string, string[]> = {
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
  };

  const extractedSkills: Set<string> = new Set();
  const lowerDesc = description.toLowerCase();

  // Extract skills based on keywords
  Object.entries(skillsMap).forEach(([keyword, skills]) => {
    if (lowerDesc.includes(keyword)) {
      skills.forEach(skill => extractedSkills.add(skill));
    }
  });

  // Add general skills based on context
  if (lowerDesc.includes('worked') || lowerDesc.includes('experience')) {
    extractedSkills.add('Experience');
  }
  if (lowerDesc.includes('manage') || lowerDesc.includes('supervisor')) {
    extractedSkills.add('Management');
  }
  if (lowerDesc.includes('team') || lowerDesc.includes('group')) {
    extractedSkills.add('Teamwork');
  }

  return Array.from(extractedSkills);
}

// Calculate match score between worker and job
export function calculateMatchScore(
  workerProfile: WorkerProfile,
  job: Job
): number {
  let score = 0;
  const maxScore = 100;

  // 1. Skill matching (40 points)
  const workerSkills = workerProfile.skills.map(s => s.toLowerCase());
  const jobSkills = job.requiredSkills.map(s => s.toLowerCase());

  let skillMatches = 0;
  jobSkills.forEach(jobSkill => {
    if (workerSkills.some(workerSkill => workerSkill.includes(jobSkill) || jobSkill.includes(workerSkill))) {
      skillMatches++;
    }
  });

  if (jobSkills.length > 0) {
    score += (skillMatches / jobSkills.length) * 40;
  }

  // 2. Category matching (20 points)
  if (workerProfile.categories.includes(job.category)) {
    score += 20;
  }

  // 3. Location proximity (15 points)
  if (workerProfile.location && job.location) {
    const workerLocation = workerProfile.location.toLowerCase();
    const jobLocation = job.location.toLowerCase();

    // Check for same city
    const workerCity = workerLocation.split(',')[0].trim();
    const jobCity = jobLocation.split(',')[0].trim();

    if (workerCity === jobCity) {
      score += 15;
    } else if (workerLocation.includes(jobCity) || jobLocation.includes(workerCity)) {
      score += 10;
    }
  }

  // 4. Availability matching (15 points)
  if (workerProfile.availability) {
    const availability = workerProfile.availability.toLowerCase();
    const jobType = job.jobType.toLowerCase();

    if (
      (availability.includes('full') && jobType === 'full-time') ||
      (availability.includes('part') && jobType === 'part-time') ||
      availability.includes('flexible') ||
      availability.includes('any')
    ) {
      score += 15;
    } else if (
      (availability.includes('part') && jobType === 'gig') ||
      (availability.includes('full') && jobType === 'part-time')
    ) {
      score += 8;
    }
  }

  // 5. Experience bonus (10 points)
  if (workerProfile.experience && workerProfile.experience.length > 20) {
    score += 10;
  }

  return Math.min(Math.round(score), maxScore);
}

// Get recommended jobs for worker
export function getRecommendedJobs(
  workerProfile: WorkerProfile,
  allJobs: Job[],
  limit: number = 10
): Array<{ job: Job; matchScore: number }> {
  // Calculate match scores for all active jobs
  const scoredJobs = allJobs
    .filter(job => job.status === 'active')
    .map(job => ({
      job,
      matchScore: calculateMatchScore(workerProfile, job),
    }))
    .filter(item => item.matchScore > 20) // Only show jobs with >20% match
    .sort((a, b) => b.matchScore - a.matchScore);

  return scoredJobs.slice(0, limit);
}

// Basic recommendations (category-based only)
export function getBasicRecommendations(
  categories: string[],
  allJobs: Job[],
  limit: number = 10
): Job[] {
  if (categories.length === 0) {
    // Return recent jobs if no categories selected
    return allJobs
      .filter(job => job.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // Filter by categories
  const categoryJobs = allJobs
    .filter(job => job.status === 'active' && categories.includes(job.category))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return categoryJobs.slice(0, limit);
}

export async function matchJobs(
  worker: { id: string },
  jobs: Job[],
  getWorkerProfile?: (workerId: string) => Promise<WorkerProfile | null>
): Promise<Array<{ job: Job; score: number }>> {
  if (!getWorkerProfile) {
    return jobs
      .filter((job) => job.status === 'active')
      .map((job) => ({ job, score: 50 }))
      .sort((a, b) => b.score - a.score);
  }

  const profile = await getWorkerProfile(worker.id);
  if (!profile) {
    return jobs
      .filter((job) => job.status === 'active')
      .map((job) => ({ job, score: 35 }))
      .sort((a, b) => b.score - a.score);
  }

  return jobs
    .filter((job) => job.status === 'active')
    .map((job) => ({ job, score: calculateMatchScore(profile, job) }))
    .sort((a, b) => b.score - a.score);
}

// Detect fraud keywords in job description
export function detectFraudKeywords(text: string): {
  isSuspicious: boolean;
  keywords: string[];
} {
  const fraudKeywords = [
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
  ];

  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  fraudKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });

  return {
    isSuspicious: foundKeywords.length > 0,
    keywords: foundKeywords,
  };
}

// Check for suspicious messaging patterns
export function checkMessageSuspicion(message: string): {
  isSuspicious: boolean;
  reason?: string;
} {
  const lowerMessage = message.toLowerCase();

  // Check for phone number patterns
  const phonePattern = /(\+91|91)?[\s-]?[6-9]\d{9}/;
  if (phonePattern.test(message)) {
    return {
      isSuspicious: true,
      reason: 'Contains phone number - please use in-app chat only',
    };
  }

  // Check for WhatsApp mention
  if (lowerMessage.includes('whatsapp') || lowerMessage.includes('wa.me')) {
    return {
      isSuspicious: true,
      reason: 'Contains WhatsApp reference - please use in-app chat only',
    };
  }

  // Check for email
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(message)) {
    return {
      isSuspicious: true,
      reason: 'Contains email address - please use in-app chat only',
    };
  }

  // Check for payment requests
  const paymentKeywords = ['send money', 'payment', 'paytm', 'gpay', 'phonepe', 'bank transfer'];
  if (paymentKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return {
      isSuspicious: true,
      reason: 'Contains payment reference - all payments must go through platform escrow',
    };
  }

  return { isSuspicious: false };
}

// Generate job explanation (mock RAG)
export function explainJobMatch(
  workerProfile: WorkerProfile,
  job: Job,
  matchScore: number
): string {
  const reasons: string[] = [];

  // Skill matches
  const matchingSkills = workerProfile.skills.filter(ws =>
    job.requiredSkills.some(js =>
      ws.toLowerCase().includes(js.toLowerCase()) ||
      js.toLowerCase().includes(ws.toLowerCase())
    )
  );

  if (matchingSkills.length > 0) {
    reasons.push(`Your skills (${matchingSkills.join(', ')}) match the job requirements`);
  }

  // Category match
  if (workerProfile.categories.includes(job.category)) {
    reasons.push(`You have experience in ${job.category}`);
  }

  // Location match
  if (workerProfile.location && job.location) {
    const workerCity = workerProfile.location.split(',')[0].trim();
    const jobCity = job.location.split(',')[0].trim();
    if (workerCity.toLowerCase() === jobCity.toLowerCase()) {
      reasons.push('Job is in your city');
    }
  }

  // Availability match
  if (workerProfile.availability) {
    const availability = workerProfile.availability.toLowerCase();
    const jobType = job.jobType;
    if (
      (availability.includes('full') && jobType === 'full-time') ||
      (availability.includes('part') && jobType === 'part-time')
    ) {
      reasons.push('Job timing matches your availability');
    }
  }

  if (reasons.length === 0) {
    return `This ${job.jobType} ${job.category} position might be a good fit for you based on your profile.`;
  }

  return reasons.join('. ') + '.';
}

// Job categories
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
  'Other',
];
