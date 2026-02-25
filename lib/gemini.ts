/**
 * Gemini AI integration with:
 *  - Round-robin API key rotation (multiple keys = parallel quota)
 *  - Model tiering: 2.5 Flash-Lite (lite/cheap) for simple tasks, 2.5 Flash for complex ones
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

function getNextKey(): string {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured. Set NEXT_PUBLIC_GEMINI_API_KEYS in .env.local')
  }
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length]
  _keyIndex++
  return key
}

// ── Model endpoints ───────────────────────────────────────────────────────────
// LITE  (gemini-2.5-flash-lite): cheaper — used for language detection,
//        simple translations, short prompts (< 200 token output)
// FLASH (gemini-2.5-flash):      standard — used for intent extraction, summaries,
//        longer explanations
const ENDPOINT = {
  lite:  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
} as const

export type GeminiModelTier = keyof typeof ENDPOINT

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

async function _callModel(prompt: string, tier: GeminiModelTier, maxTokens = 512): Promise<string> {
  const url = ENDPOINT[tier]
  const key = getNextKey()

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
  })

  const res = await fetch(`${url}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!res.ok) {
    // On rate-limit (429), retry once with the next key
    if (res.status === 429) {
      const retryKey = getNextKey()
      const retry = await fetch(`${url}?key=${retryKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!retry.ok) throw new Error(`Gemini ${tier} error: ${retry.status}`)
      const d = await retry.json()
      return d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    throw new Error(`Gemini ${tier} error: ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

/**
 * Shared Gemini text-generation helper for other modules.
 * Returns null on missing keys or API failure so callers can safely fallback.
 */
export async function generateWithGemini(
  prompt: string,
  options: { tier?: GeminiModelTier; maxTokens?: number } = {}
): Promise<string | null> {
  if (GEMINI_KEYS.length === 0) return null
  const tier = options.tier ?? 'flash'
  const maxTokens = options.maxTokens ?? 512

  try {
    const text = (await _callModel(prompt, tier, maxTokens)).trim()
    return text || null
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
