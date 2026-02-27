/**
 * Gemini AI integration with:
 *  - Round-robin API key rotation (multiple keys = parallel quota)
 *  - Model tiering: flash-lite (cheaper) for simple tasks, flash (standard) for complex ones
 *  - Local-first detection: regex checks before API calls to avoid wasting tokens
 *  - TTL in-memory cache: prevents repeated calls for identical inputs
 *
 * Keys: set NEXT_PUBLIC_GEMINI_API_KEYS (comma-separated) in .env.local
 */

// ── API keys (round-robin rotation across multiple keys) ─────────────────────

const GEMINI_KEYS: string[] = (process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let _keyIndex = 0
let _rateLimitedUntil = 0
let _lastRequestTime = 0
const _minDelayBetweenRequests = 300 // ms — throttles requests to avoid rate limits
const _invalidKeys = new Set<string>() // keys confirmed invalid

/** Returns the next key that hasn't been marked invalid. Throws if all keys are bad. */
function _getValidKey(): string {
  const validKeys = GEMINI_KEYS.filter(k => !_invalidKeys.has(k))
  if (validKeys.length === 0) {
    throw new Error('All Gemini API keys are invalid. Add valid keys to NEXT_PUBLIC_GEMINI_API_KEYS.')
  }
  const key = validKeys[_keyIndex % validKeys.length]
  _keyIndex++
  return key
}

/** Parse the Retry-After header (seconds or HTTP-date) → milliseconds */
function _parseRetryAfter(res: Response): number {
  const raw = res.headers.get('Retry-After')
  if (!raw) return 0
  const secs = parseInt(raw, 10)
  if (!isNaN(secs)) return secs * 1000
  const date = new Date(raw).getTime()
  return isNaN(date) ? 0 : Math.max(0, date - Date.now())
}

function getNextKey(): string {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured. Set NEXT_PUBLIC_GEMINI_API_KEYS in .env.local')
  }
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length]
  _keyIndex++
  return key
}

// ── Model endpoints ───────────────────────────────────────────────────────────
// LITE  (gemini-2.0-flash-lite): ~3x cheaper — used for language detection,
//        simple translations, short prompts (< 200 token output)
// FLASH (gemini-2.0-flash):      standard — used for intent extraction, summaries,
//        longer explanations
const ENDPOINT = {
  lite:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
} as const

type ModelTier = keyof typeof ENDPOINT

interface GenerateWithGeminiOptions {
  tier?: ModelTier
  maxTokens?: number
}

// ── TTL in-memory cache ───────────────────────────────────────────────────────
// Prevents duplicate API calls for identical prompts within the session.
// 30-minute TTL for translations/summaries; 5-minute TTL for intent extraction.

interface CacheEntry { value: string; expiresAt: number }
const _cache = new Map<string, CacheEntry>()

function getCached(key: string): string | null {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null }
  return entry.value
}

function setCached(key: string, value: string, ttlMs: number) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

const TTL = {
  TRANSLATION: 30 * 60 * 1000,   // 30 min — translations are stable
  SUMMARY:     30 * 60 * 1000,   // 30 min — match summaries are stable
  INTENT:       5 * 60 * 1000,   // 5 min  — user intent can change quickly
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function _callModel(prompt: string, tier: ModelTier, maxTokens = 512): Promise<string> {
  // Honour shared rate-limit guard
  const rlWait = _rateLimitedUntil - Date.now()
  if (rlWait > 0) await new Promise(resolve => setTimeout(resolve, rlWait))

  // Enforce minimum delay between requests to avoid rate limits
  const now = Date.now()
  const timeSinceLastRequest = now - _lastRequestTime
  if (timeSinceLastRequest < _minDelayBetweenRequests) {
    await new Promise(resolve => setTimeout(resolve, _minDelayBetweenRequests - timeSinceLastRequest))
  }
  _lastRequestTime = Date.now()

  const url = ENDPOINT[tier]
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
  })

  // Backoff between full key-sweeps
  const SWEEP_BACKOFFS = [5_000, 15_000, 30_000]
  let allRateLimited = true
  let lastStatus = 0

  for (let round = 0; round <= SWEEP_BACKOFFS.length; round++) {
    const validKeys = GEMINI_KEYS.filter(k => !_invalidKeys.has(k))
    if (validKeys.length === 0) {
      allRateLimited = false
      throw new Error('All Gemini API keys are invalid.')
    }

    let allGot429 = true  // becomes false if any non-429 failure occurs

    for (const key of validKeys) {
      try {
        const res = await fetch(`${url}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })

        if (res.ok) {
          const data = await res.json()
          return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        }

        lastStatus = res.status
        if (res.status === 429) {
          const retryAfterMs = _parseRetryAfter(res)
          if (retryAfterMs > 0) _rateLimitedUntil = Date.now() + retryAfterMs
          console.warn(`Gemini ${tier} 429 – key …${key.slice(-4)} rate-limited (round ${round + 1})`)
          // allGot429 stays true — continue sweeping remaining keys
        } else if (res.status === 400) {
          let msg = 'unknown'
          try { const d = await res.json(); msg = d.error?.message ?? msg } catch { /* */ }
          const isKeyError = /api key|apikey|not valid|invalid key/i.test(msg)
          if (isKeyError) {
            if (!_invalidKeys.has(key)) {
              _invalidKeys.add(key)
              console.warn(`Gemini: key …${key.slice(-6)} is invalid – skipping permanently`)
            }
            allGot429 = false
            continue  // skip to next key
          }
          allRateLimited = false
          throw new Error(`Gemini ${tier} 400: ${msg}`)
        } else {
          allRateLimited = false
          throw new Error(`Gemini ${tier} error: ${res.status}`)
        }
      } catch (err) {
        if (err instanceof Error && !err.message.includes('rate-limited') && !err.message.includes('429') && !err.message.includes('rate limit')) {
          throw err
        }
      }
    }

    if (!allGot429) break  // some non-429 failures — stop trying this tier

    if (round >= SWEEP_BACKOFFS.length) break  // all backoff rounds exhausted

    const backoffMs = SWEEP_BACKOFFS[round]
    const validCount = GEMINI_KEYS.filter(k => !_invalidKeys.has(k)).length
    console.warn(
      `Gemini ${tier}: all ${validCount} key(s) rate-limited, ` +
      `waiting ${Math.round(backoffMs / 1000)}s (round ${round + 1}/${SWEEP_BACKOFFS.length})`
    )
    _rateLimitedUntil = Date.now() + backoffMs
    await new Promise(resolve => setTimeout(resolve, backoffMs))
    _rateLimitedUntil = 0
  }

  if (allRateLimited) {
    _rateLimitedUntil = Date.now() + 2 * 60 * 1000
  }
  throw new Error(`Gemini ${tier} error: ${lastStatus || 429}`)
}

/**
 * Backward-compatible generic Gemini caller used by older modules.
 * Returns null on failure so callers can gracefully fall back.
 */
export async function generateWithGemini(
  prompt: string,
  options: GenerateWithGeminiOptions = {},
): Promise<string | null> {
  const tier = options.tier ?? 'lite'
  const maxTokens = options.maxTokens ?? 512
  try {
    const text = await _callModel(prompt, tier, maxTokens)
    return text?.trim() || null
  } catch {
    return null
  }
}

// ── Local-first language detection (NO API cost) ──────────────────────────────
// Unicode block ranges:
//   Devanagari (Hindi): U+0900–U+097F
//   Telugu:             U+0C00–U+0C7F

const DEVANAGARI_RE = /[\u0900-\u097F]/
const TELUGU_RE     = /[\u0C00-\u0C7F]/
const LATIN_ONLY_RE = /^[\x00-\x7F\s\d.,!?'"()\-_:;@#]+$/

/**
 * Returns true when the text contains only ASCII/Latin characters.
 * Use this to skip API calls for English inputs entirely.
 */
export function isLikelyEnglish(text: string): boolean {
  return LATIN_ONLY_RE.test(text.trim())
}

/**
 * Cheap local language detection based on Unicode script ranges.
 * Falls back to Gemini only when script is ambiguous (e.g. romanized Hindi).
 */
export function detectLanguageLocal(text: string): SupportedLocale | null {
  if (!text?.trim()) return 'en'
  if (DEVANAGARI_RE.test(text)) return 'hi'
  if (TELUGU_RE.test(text)) return 'te'
  if (LATIN_ONLY_RE.test(text)) return 'en'
  return null // ambiguous — caller should use API detection
}

// ── Public types & constants ──────────────────────────────────────────────────

export type SupportedLocale = 'en' | 'hi' | 'te'

const LANG_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
}

// ── detectLanguage ────────────────────────────────────────────────────────────
/**
 * Detect the language of a text snippet.
 * Strategy:
 *  1. Local Unicode check (free, instant)
 *  2. API call with LITE model only for ambiguous romanized text
 */
export async function detectLanguage(text: string): Promise<SupportedLocale> {
  if (!text?.trim() || text.trim().length < 3) return 'en'

  // Free local check first
  const local = detectLanguageLocal(text)
  if (local !== null) return local

  // Ambiguous (romanized Hindi/Telugu) — use lite model, short TTL not needed (it's a 1-token output)
  const cacheKey = `lang:${text.slice(0, 80)}`
  const cached = getCached(cacheKey)
  if (cached) return cached as SupportedLocale

  const prompt = `Reply with ONLY one code: en, hi, or te
en=English  hi=Hindi  te=Telugu
Text: "${text.trim().slice(0, 200)}"`

  try {
    const result = (await _callModel(prompt, 'lite', 16)).trim().toLowerCase()
    const detected: SupportedLocale = result.startsWith('hi') ? 'hi' : result.startsWith('te') ? 'te' : 'en'
    setCached(cacheKey, detected, TTL.TRANSLATION)
    return detected
  } catch {
    return 'en'
  }
}

// ── translateText ─────────────────────────────────────────────────────────────
/**
 * Translate text to the target language via Gemini LITE model.
 * Skips API call if text is already in the target script.
 */
export async function translateText(
  text: string,
  targetLang: SupportedLocale
): Promise<string> {
  if (!text?.trim()) return text

  // Skip if already in target language
  const localLang = detectLanguageLocal(text)
  if (localLang === targetLang) return text
  if (targetLang === 'en' && localLang === 'en') return text

  const cacheKey = `trans:${targetLang}:${text.slice(0, 120)}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const langName = LANG_NAMES[targetLang]
  const prompt = `Translate to ${langName}. Return ONLY the translated text, no explanations.
If already in ${langName}, return unchanged.
Text: ${text}`

  try {
    const result = (await _callModel(prompt, 'lite', 512)).trim()
    const translated = result || text
    setCached(cacheKey, translated, TTL.TRANSLATION)
    return translated
  } catch {
    return text
  }
}

// ── processUserInput ──────────────────────────────────────────────────────────

export interface ProcessedInput {
  normalizedInput: string
  detectedLanguage: SupportedLocale
  intent: string
  data: Record<string, string>
  response: string
}

/**
 * Parse a user search query or message — extract intent, job title, location etc.
 *
 * Token saving rules:
 *  - If text is plain English → skip API, return structured result locally
 *  - Cache result for 5 min (same query won't hit API twice in a session)
 *  - Uses FLASH model (needs reasoning for intent extraction)
 */
export async function processUserInput(
  input: string,
  userLang: SupportedLocale = 'en'
): Promise<ProcessedInput> {
  const trimmed = input.trim()

  // LOCAL FAST PATH: plain English → extract job title directly without API
  if (isLikelyEnglish(trimmed)) {
    return {
      normalizedInput: trimmed,
      detectedLanguage: 'en',
      intent: 'search_job',
      data: { jobTitle: trimmed, location: '', skills: '', salary: '' },
      response: '',
    }
  }

  // Check cache (keyed by input + lang)
  const cacheKey = `intent:${userLang}:${trimmed.slice(0, 120)}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) as ProcessedInput } catch { /* ignore */ }
  }

  const langName = LANG_NAMES[userLang]
  const prompt = `You are an AI for HyperLocal, an Indian blue-collar job app.
User message (possibly in ${langName}): "${trimmed}"

Return ONLY a JSON object (no markdown):
{"normalizedInput":"<English>","detectedLanguage":"<en|hi|te>","intent":"<search_job|apply_job|check_application|ask_question|greeting|other>","data":{"jobTitle":"","location":"","skills":"","salary":""},"response":"<reply IN ${langName}>"}`

  try {
    const raw = await _callModel(prompt, 'flash', 512)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as ProcessedInput
    setCached(cacheKey, JSON.stringify(parsed), TTL.INTENT)
    return parsed
  } catch {
    return {
      normalizedInput: trimmed,
      detectedLanguage: userLang,
      intent: 'other',
      data: {},
      response:
        userLang === 'hi' ? 'क्षमा करें, कुछ समझ नहीं आया।'
        : userLang === 'te' ? 'క్షమించండి, అర్థం కాలేదు.'
        : "Sorry, I couldn't understand that.",
    }
  }
}

// ── translateDynamic ──────────────────────────────────────────────────────────
/**
 * Translate a dynamic field (job description, notification text) for display.
 * Uses in-memory cache — same text will never be translated twice per session.
 * Uses LITE model (translation is a simple task).
 */
export async function translateDynamic(
  text: string,
  targetLang: SupportedLocale
): Promise<string> {
  if (targetLang === 'en') return text
  // Local script check — if already in target script, no API needed
  const local = detectLanguageLocal(text)
  if (local === targetLang) return text

  const cacheKey = `dyn:${targetLang}:${text.slice(0, 120)}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const translated = await translateText(text, targetLang)
  setCached(cacheKey, translated, TTL.TRANSLATION)
  return translated
}

// ── generateJobMatchSummary ───────────────────────────────────────────────────
/**
 * Generate a short localized match explanation for a worker↔job pair.
 *
 * Token saving rules:
 *  - Cached by (jobTitle + skills fingerprint + locale) — stable for 30 min
 *  - Uses LITE model (short, structured output)
 */
export async function generateJobMatchSummary(
  jobTitle: string,
  workerSkills: string[],
  jobSkills: string[],
  userLang: SupportedLocale = 'en'
): Promise<string> {
  const matchedSkills = workerSkills.filter((s) =>
    jobSkills.map((j) => j.toLowerCase()).includes(s.toLowerCase())
  )

  // Cache key based on matched skills fingerprint + locale
  const fingerprint = matchedSkills.sort().join(',').slice(0, 60)
  const cacheKey = `summary:${userLang}:${jobTitle.slice(0, 40)}:${fingerprint}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const langName = LANG_NAMES[userLang]
  const prompt = `HyperLocal job app. Write ONE encouraging sentence (in ${langName}, max 20 words) for why this worker matches "${jobTitle}".
Matched skills: ${matchedSkills.join(', ') || 'general background'}
No markdown.`

  try {
    const result = (await _callModel(prompt, 'lite', 64)).trim()
    setCached(cacheKey, result, TTL.SUMMARY)
    return result
  } catch {
    const fallback = userLang === 'hi'
      ? 'आपके कौशल इस नौकरी के लिए उपयुक्त हैं।'
      : userLang === 'te'
      ? 'మీ నైపుణ్యాలు ఈ ఉద్యోగానికి సరిపోతాయి.'
      : 'Your skills are a good match for this job.'
    setCached(cacheKey, fallback, TTL.SUMMARY)
    return fallback
  }
}

// ── AI Skill Gap Analyzer ────────────────────────────────────────────────────
// Compares worker skills against in-demand skills from active jobs and returns
// a structured JSON analysis with gaps and up-skilling tips.

export interface SkillGapResult {
  strongSkills: string[]
  gapSkills: string[]
  tips: Array<{ skill: string; suggestion: string }>
  summary: string
}

export async function analyzeSkillGap(
  workerSkills: string[],
  demandedSkills: string[],
  userLang: SupportedLocale = 'en'
): Promise<SkillGapResult> {
  const cacheKey = `skillgap:${userLang}:${workerSkills.sort().join(',').slice(0, 60)}:${demandedSkills.sort().join(',').slice(0, 60)}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* fall through */ }
  }

  const langName = LANG_NAMES[userLang]
  const prompt = `You are a career advisor for HyperLocal, a blue-collar/hyperlocal job platform in India.

Worker's current skills: ${workerSkills.join(', ') || 'none listed'}
Top in-demand skills from active job listings: ${demandedSkills.join(', ')}

Analyze the gap. Respond in ${langName} with ONLY valid JSON (no markdown, no code fences):
{
  "strongSkills": ["skills the worker already has that are in demand"],
  "gapSkills": ["top 5 in-demand skills the worker is missing"],
  "tips": [{"skill": "skill name", "suggestion": "one-sentence actionable tip to learn it"}],
  "summary": "2-3 sentence encouraging overview of their position and growth path"
}`

  try {
    const raw = (await _callModel(prompt, 'flash', 512)).trim()
    // Strip possible code fences
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result: SkillGapResult = JSON.parse(cleaned)
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    // Deterministic fallback
    const matched = workerSkills.filter((s) =>
      demandedSkills.map((d) => d.toLowerCase()).includes(s.toLowerCase())
    )
    const missing = demandedSkills
      .filter((d) => !workerSkills.map((s) => s.toLowerCase()).includes(d.toLowerCase()))
      .slice(0, 5)
    const fallback: SkillGapResult = {
      strongSkills: matched,
      gapSkills: missing,
      tips: missing.map((s) => ({ skill: s, suggestion: `Look for free online tutorials or local workshops on ${s}.` })),
      summary: `You have ${matched.length} in-demand skill${matched.length !== 1 ? 's' : ''}. Learning ${missing.slice(0, 3).join(', ')} could open more opportunities for you.`,
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── AI Learning Recommendations (Agentic) ───────────────────────────────────
// Given a job's required skills and the worker's current skills, generates
// personalized learning resources with real web links, YouTube channels,
// free course platforms, and local training center suggestions.

export interface LearningResource {
  skill: string
  hasSkill: boolean
  resources: Array<{
    title: string
    url: string
    type: 'video' | 'course' | 'article' | 'practice' | 'community'
    free: boolean
    platform: string
    description: string
  }>
  estimatedTime: string
}

export interface AILearningPlan {
  resources: LearningResource[]
  quickWins: string[]
  careerPath: string
  readinessScore: number
}

export async function generateLearningPlan(
  jobTitle: string,
  jobSkills: string[],
  workerSkills: string[],
  workerExperience: string,
  userLang: SupportedLocale = 'en'
): Promise<AILearningPlan> {
  const cacheKey = `learnplan:${userLang}:${jobTitle.slice(0, 30)}:${jobSkills.sort().join(',').slice(0, 60)}:${workerSkills.sort().join(',').slice(0, 40)}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* fall through */ }
  }

  const langName = LANG_NAMES[userLang]
  const matched = workerSkills.filter((s) =>
    jobSkills.map((j) => j.toLowerCase()).includes(s.toLowerCase())
  )
  const missing = jobSkills.filter(
    (s) => !workerSkills.map((w) => w.toLowerCase()).includes(s.toLowerCase())
  )

  const prompt = `You are an AI career coach for HyperLocal, India's hyperlocal job platform.

Job: "${jobTitle}"
Required skills: ${jobSkills.join(', ')}
Worker's skills: ${workerSkills.join(', ') || 'none listed'}
Worker's experience level: ${workerExperience || 'not specified'}
Skills worker already has: ${matched.join(', ') || 'none'}
Skills to learn: ${missing.join(', ') || 'none (fully qualified!)'}

Generate a PERSONALIZED learning plan. Respond in ${langName} with ONLY valid JSON (no markdown, no code fences):
{
  "resources": [
    {
      "skill": "skill name",
      "hasSkill": false,
      "resources": [
        {
          "title": "resource title",
          "url": "https://real-working-url",
          "type": "video|course|article|practice|community",
          "free": true,
          "platform": "YouTube/Coursera/Khan Academy/Udemy/Skillshare/NPTEL/Government portal etc",
          "description": "one line about what they'll learn"
        }
      ],
      "estimatedTime": "e.g. 2 weeks"
    }
  ],
  "quickWins": ["3 things the worker can do TODAY to get closer to this job"],
  "careerPath": "2-3 sentence career growth path from current position through this job to long term",
  "readinessScore": 75
}

Rules:
- Include 2-3 resources per skill (mix of YouTube, free courses, practice sites)
- For blue-collar skills, prefer: YouTube tutorials in Hindi, government skill portals (skill.gov.in), NSDC courses
- For technical skills: Coursera, freeCodeCamp, Khan Academy, NPTEL
- URLs must be real, well-known platforms (YouTube search URLs are acceptable: https://www.youtube.com/results?search_query=...)
- readinessScore: 0-100 based on how ready the worker is
- quickWins should be specific and actionable
- Keep resources for skills the worker ALREADY has brief (1 resource to level up)
- Focus more on MISSING skills`

  try {
    const raw = (await _callModel(prompt, 'flash', 1024)).trim()
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result: AILearningPlan = JSON.parse(cleaned)
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    // Deterministic fallback with real links
    const fallbackResources: LearningResource[] = [
      ...missing.slice(0, 4).map((skill) => ({
        skill,
        hasSkill: false,
        resources: [
          {
            title: `Learn ${skill} - Complete Guide`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial hindi')}`,
            type: 'video' as const,
            free: true,
            platform: 'YouTube',
            description: `Search for ${skill} tutorials in your language`,
          },
          {
            title: `${skill} courses on Skill India`,
            url: 'https://www.skillindiadigital.gov.in/courses',
            type: 'course' as const,
            free: true,
            platform: 'Skill India',
            description: 'Free government-certified courses',
          },
        ],
        estimatedTime: '1-2 weeks',
      })),
      ...matched.slice(0, 2).map((skill) => ({
        skill,
        hasSkill: true,
        resources: [
          {
            title: `Advanced ${skill}`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent('advanced ' + skill + ' tips')}`,
            type: 'video' as const,
            free: true,
            platform: 'YouTube',
            description: `Level up your existing ${skill} knowledge`,
          },
        ],
        estimatedTime: '1 week',
      })),
    ]
    const fallback: AILearningPlan = {
      resources: fallbackResources,
      quickWins: [
        'Update your HyperLocal profile with all your skills',
        `Practice ${missing[0] || 'relevant skills'} with free YouTube tutorials`,
        'Apply to similar jobs to gain experience and build your rating',
      ],
      careerPath: `Starting with ${jobTitle}, you can build expertise and move to higher-paying roles in this field. Consistent work and good ratings will unlock premium job opportunities.`,
      readinessScore: Math.round((matched.length / Math.max(jobSkills.length, 1)) * 100),
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── AI Cover Letter Generator (Agentic) ─────────────────────────────────────
// Generates a tailored cover letter / application message for a worker applying
// to a specific job, based on their profile and the job requirements.

export async function generateCoverLetter(
  jobTitle: string,
  jobDescription: string,
  jobSkills: string[],
  workerSkills: string[],
  workerExperience: string,
  workerName: string,
  userLang: SupportedLocale = 'en'
): Promise<string> {
  const cacheKey = `cover:${userLang}:${jobTitle.slice(0, 30)}:${workerName.slice(0, 20)}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const langName = LANG_NAMES[userLang]
  const matched = workerSkills.filter((s) =>
    jobSkills.map((j) => j.toLowerCase()).includes(s.toLowerCase())
  )

  const prompt = `You are writing a job application message for a worker on HyperLocal (India's hyperlocal job platform).

Job: "${jobTitle}"
Job description: ${jobDescription.slice(0, 300)}
Required skills: ${jobSkills.join(', ')}
Worker name: ${workerName}
Worker skills: ${workerSkills.join(', ') || 'general experience'}
Matching skills: ${matched.join(', ') || 'general background'}
Experience: ${workerExperience || 'not specified'}

Write a SHORT, professional application message (${langName}, 60-100 words) that:
- Is warm and confident, not generic
- Highlights specific matching skills
- Shows enthusiasm for the role
- Mentions availability and willingness to learn
- Sounds natural, NOT like a template
Do NOT include subject lines, "Dear Sir/Madam", or formal letter formatting.
Just write the message text directly.`

  try {
    const result = (await _callModel(prompt, 'flash', 256)).trim()
    setCached(cacheKey, result, TTL.SUMMARY)
    return result
  } catch {
    const fallback = userLang === 'hi'
      ? `नमस्ते, मैं ${workerName} हूं। मुझे "${jobTitle}" पद में रुचि है। मेरे पास ${matched.length > 0 ? matched.join(', ') + ' में अनुभव है' : 'संबंधित अनुभव है'}। मैं तुरंत शुरू कर सकता/सकती हूं और नई चीजें सीखने को तैयार हूं।`
      : `Hi, I'm ${workerName}. I'm interested in the "${jobTitle}" position. ${matched.length > 0 ? `I have experience in ${matched.join(', ')}` : 'I have relevant experience'} and I'm available to start immediately. I'm a quick learner and committed to delivering quality work.`
    setCached(cacheKey, fallback, TTL.SUMMARY)
    return fallback
  }
}

// ── AI Interview Prep (Agentic) ─────────────────────────────────────────────
// Generates likely interview questions + tips for a specific job, tailored to
// the worker's profile. Helps blue-collar workers prepare confidently.

export interface InterviewPrepResult {
  questions: Array<{
    question: string
    sampleAnswer: string
    tip: string
  }>
  generalTips: string[]
  dresscode: string
  whatToBring: string[]
}

export async function generateInterviewPrep(
  jobTitle: string,
  jobCategory: string,
  jobSkills: string[],
  workerSkills: string[],
  userLang: SupportedLocale = 'en'
): Promise<InterviewPrepResult> {
  const cacheKey = `interview:${userLang}:${jobTitle.slice(0, 30)}:${jobCategory}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* fall through */ }
  }

  const langName = LANG_NAMES[userLang]
  const prompt = `You are an AI interview coach for HyperLocal, India's hyperlocal job platform (primarily blue-collar and gig economy).

Job: "${jobTitle}" (Category: ${jobCategory})
Required skills: ${jobSkills.join(', ')}
Worker's skills: ${workerSkills.join(', ') || 'general'}

Generate interview preparation material in ${langName}. Respond with ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "question": "likely interview question",
      "sampleAnswer": "a good sample answer the worker can adapt",
      "tip": "pro tip for answering this"
    }
  ],
  "generalTips": ["5 general interview tips relevant to this type of job"],
  "dresscode": "what to wear for this type of job interview",
  "whatToBring": ["list of documents/items to bring"]
}

Rules:
- Include 5 questions: 2 about skills, 1 about experience, 1 about availability, 1 behavioral
- Keep language simple and encouraging — many workers may be first-time interviewees
- Tips should be practical for Indian blue-collar/gig context
- Sample answers should sound natural, not robotic`

  try {
    const raw = (await _callModel(prompt, 'flash', 768)).trim()
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result: InterviewPrepResult = JSON.parse(cleaned)
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    const fallback: InterviewPrepResult = {
      questions: [
        { question: `What experience do you have related to ${jobTitle}?`, sampleAnswer: `I have worked on similar tasks and have skills in ${workerSkills.slice(0, 3).join(', ') || 'this area'}.`, tip: 'Be specific about past work, even informal experience counts.' },
        { question: 'Why do you want this job?', sampleAnswer: `I am looking for steady work and this role matches my skills well. I am reliable and available immediately.`, tip: 'Show enthusiasm and mention your availability.' },
        { question: 'How do you handle difficult situations at work?', sampleAnswer: 'I stay calm, ask for help if needed, and focus on solving the problem step by step.', tip: 'Give a real example if you can.' },
        { question: 'Are you available to start immediately?', sampleAnswer: 'Yes, I can start right away and am flexible with timings.', tip: 'Employers value availability — be honest about your schedule.' },
        { question: 'Do you have any questions for us?', sampleAnswer: 'Yes, I would like to know about the work timings and payment schedule.', tip: 'Always ask at least one question — it shows interest.' },
      ],
      generalTips: [
        'Arrive 10-15 minutes early',
        'Bring your Aadhaar card and any skill certificates',
        'Make eye contact and speak clearly',
        'Be honest about what you know and what you are willing to learn',
        'Follow up with a thank-you message after the interview',
      ],
      dresscode: 'Clean, neat clothes appropriate for the work environment. For office jobs, wear formal clothes. For field/manual jobs, clean casual clothes are fine.',
      whatToBring: ['Aadhaar Card / ID proof', 'Any skill certificates', 'Phone with HyperLocal profile', 'Pen and small notebook'],
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── Agentic AI: Smart Candidate Ranking for Employers ────────────────────────
// Given a job and multiple applicant profiles, ranks them with reasoning.

export interface CandidateRanking {
  rankings: Array<{
    workerId: string
    rank: number
    score: number
    reasoning: string
    strengths: string[]
    concerns: string[]
  }>
  summary: string
}

export async function rankCandidates(
  jobTitle: string,
  jobSkills: string[],
  jobDescription: string,
  candidates: Array<{ id: string; name: string; skills: string[]; experience: string; matchScore: number; rating: number }>
): Promise<CandidateRanking> {
  const cacheKey = `rank:${jobTitle.slice(0, 20)}:${candidates.map((c) => c.id).join(',').slice(0, 60)}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* fall through */ }
  }

  const candidateList = candidates
    .map((c, i) => `${i + 1}. ${c.name} — Skills: ${c.skills.join(', ') || 'N/A'}, Experience: ${c.experience || 'N/A'}, Match: ${c.matchScore}%, Rating: ${c.rating}/5`)
    .join('\n')

  const prompt = `You are an AI hiring assistant for HyperLocal, India's hyperlocal job platform.

Job: "${jobTitle}"
Required skills: ${jobSkills.join(', ')}
Description: ${jobDescription.slice(0, 200)}

Candidates:
${candidateList}

Rank ALL candidates from best to worst fit. Respond with ONLY valid JSON (no markdown):
{
  "rankings": [
    {
      "workerId": "candidate id",
      "rank": 1,
      "score": 92,
      "reasoning": "one sentence why this rank",
      "strengths": ["key strength 1", "key strength 2"],
      "concerns": ["potential concern"] or []
    }
  ],
  "summary": "Brief hiring recommendation sentence"
}

Rules:
- Score 0-100 based on skill match, experience, and rating
- Be fair and objective
- Highlight both strengths and concerns
- Summary should be actionable`

  try {
    const raw = (await _callModel(prompt, 'flash', 768)).trim()
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result: CandidateRanking = JSON.parse(cleaned)
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    // Deterministic fallback — sort by matchScore * rating
    const sorted = [...candidates].sort((a, b) => (b.matchScore * b.rating) - (a.matchScore * a.rating))
    const fallback: CandidateRanking = {
      rankings: sorted.map((c, i) => ({
        workerId: c.id,
        rank: i + 1,
        score: c.matchScore,
        reasoning: `Ranked #${i + 1} based on ${c.matchScore}% skill match and ${c.rating}/5 rating.`,
        strengths: c.skills.slice(0, 2),
        concerns: c.matchScore < 50 ? ['Low skill match — may need training'] : [],
      })),
      summary: `${sorted[0]?.name || 'Top candidate'} appears to be the strongest fit based on skill match and ratings.`,
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── AI Job Description Generator ─────────────────────────────────────────────

export interface GeneratedJobContent {
  description: string
  requirements: string
  benefits: string
  suggestedSkills: string[]
  suggestedPay: { min: number; max: number; type: 'hourly' | 'fixed' }
}

export async function generateJobDescription(
  title: string,
  category: string,
  location: string,
  jobMode: 'local' | 'remote',
  experienceLevel: 'entry' | 'intermediate' | 'expert',
  duration: string,
): Promise<GeneratedJobContent> {
  const cacheKey = `jd_${title}_${category}_${jobMode}_${experienceLevel}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) as GeneratedJobContent } catch { /* regenerate */ }
  }

  const prompt = `You are an expert Indian job-posting writer for a hyperlocal blue-collar / gig-work platform.
Generate a compelling, concise job post for:
  Title: "${title}"
  Category: ${category}
  Location: ${location || 'Not specified'}
  Mode: ${jobMode}
  Experience: ${experienceLevel}
  Duration: ${duration || 'Not specified'}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "description": "A 3-5 sentence engaging description. Use simple language suitable for Indian blue-collar workers. Mention what the work involves.",
  "requirements": "Bullet-pointed specific requirements (separated by newlines). Include tools, timing, physical requirements if relevant.",
  "benefits": "Bullet-pointed benefits (separated by newlines). Include realistic perks like tea/lunch, travel allowance, bonus, flexible hours.",
  "suggestedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "suggestedPay": { "min": 300, "max": 500, "type": "hourly" }
}

Pay guideline: Entry ₹200-400/hr, Intermediate ₹400-700/hr, Expert ₹700-1500/hr for hourly. For fixed, scale by typical daily rate × duration. Use realistic Indian market rates.`

  try {
    const raw = await _callModel(prompt, 'flash')
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result = JSON.parse(cleaned) as GeneratedJobContent
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    const fallback: GeneratedJobContent = {
      description: `Looking for a skilled ${category} professional for ${title}. ${jobMode === 'remote' ? 'This is a remote position.' : `Work will be at ${location || 'the specified location'}.`} ${experienceLevel === 'entry' ? 'Freshers are welcome to apply.' : experienceLevel === 'expert' ? 'We need someone with significant hands-on experience.' : 'Some prior experience is preferred.'}`,
      requirements: `• Must be available for ${duration || 'the required duration'}\n• ${jobMode === 'local' ? 'Must be able to commute to the work location' : 'Must have a reliable internet connection'}\n• Punctual and professional attitude\n• Own tools/equipment preferred`,
      benefits: `• Timely payment via secure escrow\n• Tea/snacks provided during work hours\n• Bonus for early completion\n• Good review helps get more jobs`,
      suggestedSkills: [category, 'Punctuality', 'Communication', 'Problem Solving'],
      suggestedPay: {
        min: experienceLevel === 'entry' ? 250 : experienceLevel === 'intermediate' ? 450 : 750,
        max: experienceLevel === 'entry' ? 400 : experienceLevel === 'intermediate' ? 700 : 1500,
        type: 'hourly',
      },
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── AI Smart Salary Estimator ────────────────────────────────────────────────

export interface SalaryEstimate {
  minPay: number
  maxPay: number
  avgPay: number
  payType: 'hourly' | 'fixed'
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
  marketTrend: 'rising' | 'stable' | 'declining'
}

export async function estimateSalary(
  title: string,
  category: string,
  location: string,
  experienceLevel: 'entry' | 'intermediate' | 'expert',
  skills: string[],
): Promise<SalaryEstimate> {
  const cacheKey = `sal_${title}_${category}_${experienceLevel}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) as SalaryEstimate } catch { /* regenerate */ }
  }

  const prompt = `You are an Indian labour market salary analyst. Estimate fair compensation for:
  Job: "${title}"
  Category: ${category}
  Location: ${location || 'Urban India'}
  Experience Level: ${experienceLevel}
  Required Skills: ${skills.join(', ') || 'General'}

Return ONLY a valid JSON object (no markdown, no code fences):
{
  "minPay": <number in INR>,
  "maxPay": <number in INR>,
  "avgPay": <number in INR>,
  "payType": "hourly" or "fixed",
  "confidence": "low" | "medium" | "high",
  "reasoning": "1-2 sentence explanation of the estimate based on Indian market rates",
  "marketTrend": "rising" | "stable" | "declining"
}

Use realistic Indian hyperlocal/gig-work rates. Entry: ₹200-400/hr, Intermediate: ₹400-700/hr, Expert: ₹700-1500/hr. For technical roles, rates can be higher.`

  try {
    const raw = await _callModel(prompt, 'lite')
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result = JSON.parse(cleaned) as SalaryEstimate
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    const baseMin = experienceLevel === 'entry' ? 250 : experienceLevel === 'intermediate' ? 450 : 750
    const baseMax = experienceLevel === 'entry' ? 400 : experienceLevel === 'intermediate' ? 700 : 1500
    const fallback: SalaryEstimate = {
      minPay: baseMin,
      maxPay: baseMax,
      avgPay: Math.round((baseMin + baseMax) / 2),
      payType: 'hourly',
      confidence: 'medium',
      reasoning: `Based on average ${experienceLevel}-level ${category} rates in India.`,
      marketTrend: 'stable',
    }
    setCached(cacheKey, JSON.stringify(fallback), TTL.SUMMARY)
    return fallback
  }
}

// ── AI Chat Message Translation ──────────────────────────────────────────────

export async function translateChatMessage(
  message: string,
  targetLang: SupportedLocale,
): Promise<string> {
  if (targetLang === 'en') {
    if (isLikelyEnglish(message)) return message
  }
  const langNames: Record<SupportedLocale, string> = { en: 'English', hi: 'Hindi', te: 'Telugu' }
  const cacheKey = `chat_tr_${message.slice(0, 60)}_${targetLang}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const prompt = `Translate the following message to ${langNames[targetLang]}. Keep it natural, informal, and suitable for chat between a worker and employer. If it's already in ${langNames[targetLang]}, return as-is. Return ONLY the translated text, no quotes or explanation.

Message: "${message}"`

  try {
    const result = await _callModel(prompt, 'lite')
    const cleaned = result.replace(/^["']|["']$/g, '').trim()
    setCached(cacheKey, cleaned, TTL.TRANSLATION)
    return cleaned
  } catch {
    return message
  }
}

// ── AI Dashboard Insights ────────────────────────────────────────────────────

export interface DashboardInsight {
  title: string
  message: string
  type: 'tip' | 'alert' | 'achievement' | 'opportunity'
  icon: string
  actionLabel?: string
  actionHref?: string
}

export async function generateDashboardInsights(
  role: 'worker' | 'employer',
  stats: {
    totalJobs?: number
    activeJobs?: number
    completedJobs?: number
    totalEarnings?: number
    avgRating?: number
    skills?: string[]
    pendingApplications?: number
    hireRate?: number
  },
): Promise<DashboardInsight[]> {
  const cacheKey = `dash_${role}_${JSON.stringify(stats).slice(0, 80)}`
  const cached = getCached(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) as DashboardInsight[] } catch { /* regenerate */ }
  }

  const prompt = `You are a career/business coach for an Indian hyperlocal gig-work platform.
Generate 3-4 personalized, actionable dashboard insights for a ${role}.

Stats: ${JSON.stringify(stats)}

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "title": "Short catchy title (3-5 words)",
    "message": "1-2 sentence actionable insight. Be specific, encouraging, and practical.",
    "type": "tip" | "alert" | "achievement" | "opportunity",
    "icon": "one of: star, trophy, target, trending-up, alert-triangle, lightbulb, rocket, heart"
  }
]

Rules:
- For workers: focus on profile optimization, skill improvement, earning tips, job match advice
- For employers: focus on hiring efficiency, better job descriptions, candidate management
- Be culturally relevant to India
- At least 1 should be an achievement/positive reinforcement if stats are decent`

  try {
    const raw = await _callModel(prompt, 'lite')
    const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
    const result = JSON.parse(cleaned) as DashboardInsight[]
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  } catch {
    const workerFallback: DashboardInsight[] = [
      { title: 'Complete Your Profile', message: 'Workers with complete profiles get 3x more job offers. Add your skills and experience!', type: 'tip', icon: 'target' },
      { title: 'Stay Active', message: 'Apply to at least 2 jobs daily to stay visible to employers.', type: 'opportunity', icon: 'rocket' },
      { title: 'Keep It Up!', message: `You have ${stats.completedJobs || 0} completed jobs — great work! Each completed job builds your reputation.`, type: 'achievement', icon: 'trophy' },
    ]
    const employerFallback: DashboardInsight[] = [
      { title: 'Write Better Descriptions', message: 'Jobs with detailed descriptions get 40% more qualified applicants. Use our AI assistant!', type: 'tip', icon: 'lightbulb' },
      { title: 'Respond Quickly', message: 'Employers who respond within 24 hours hire 2x faster. Check your pending applications!', type: 'alert', icon: 'alert-triangle' },
      { title: 'Growing Network', message: `You've posted ${stats.totalJobs || 0} jobs — keep building your reputation for reliable work.`, type: 'achievement', icon: 'star' },
    ]
    const result = role === 'worker' ? workerFallback : employerFallback
    setCached(cacheKey, JSON.stringify(result), TTL.SUMMARY)
    return result
  }
}
