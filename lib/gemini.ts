/**
 * Gemini AI integration with round-robin key rotation.
 * Handles translation, user input processing, and language detection.
 *
 * Keys are loaded from NEXT_PUBLIC_GEMINI_API_KEYS (comma-separated).
 * Set this in .env.local for local dev and as a Supabase secret for edge functions.
 */

const GEMINI_KEYS: string[] = (
  process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? ''
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let _keyIndex = 0

function getNextKey(): string {
  if (GEMINI_KEYS.length === 0) {
    throw new Error(
      'No Gemini API keys configured. Set NEXT_PUBLIC_GEMINI_API_KEYS in your .env.local file.'
    )
  }
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length]
  _keyIndex++
  return key
}

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string> {
  const key = getNextKey()
  const res = await fetch(`${GEMINI_API_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!res.ok) {
    // If this key is rate-limited, try the next key once
    if (res.status === 429) {
      const fallbackKey = getNextKey()
      const retry = await fetch(`${GEMINI_API_URL}?key=${fallbackKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      })
      if (!retry.ok) throw new Error(`Gemini API error: ${retry.status}`)
      const data = await retry.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    throw new Error(`Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export type SupportedLocale = 'en' | 'hi' | 'te'

const LANG_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
}

/**
 * Translate text to the target language.
 * Returns the original text if translation fails.
 */
export async function translateText(
  text: string,
  targetLang: SupportedLocale
): Promise<string> {
  if (!text?.trim()) return text
  if (targetLang === 'en') {
    // Only translate if text is not already in English
    const detected = await detectLanguage(text)
    if (detected === 'en') return text
  }

  const langName = LANG_NAMES[targetLang]
  const prompt = `Translate the following text to ${langName}. 
Return ONLY the translated text, no explanations, no quotes, no formatting.
If the text is already in ${langName}, return it unchanged.

Text to translate:
${text}`

  try {
    const result = await callGemini(prompt)
    return result.trim() || text
  } catch {
    console.error('Translation failed, returning original')
    return text
  }
}

export interface ProcessedInput {
  /** Normalized English version of the input */
  normalizedInput: string
  /** Detected language of the original input */
  detectedLanguage: SupportedLocale
  /** Intent extracted from the input */
  intent: string
  /** Structured data extracted (e.g. job title, location, skills) */
  data: Record<string, string>
  /** Response to show the user in their language */
  response: string
}

/**
 * Process user input (e.g. job search query or chat message),
 * extracting intent/entities and generating a localized response.
 */
export async function processUserInput(
  input: string,
  userLang: SupportedLocale = 'en'
): Promise<ProcessedInput> {
  const langName = LANG_NAMES[userLang]

  const prompt = `You are an AI assistant for HyperLocal, a blue-collar job marketplace in India.
The user typed the following message (possibly in ${langName}):

"${input}"

Respond with a JSON object (no markdown, no code blocks) with these fields:
{
  "normalizedInput": "<English translation of the input>",
  "detectedLanguage": "<one of: en, hi, te>",
  "intent": "<one of: search_job, apply_job, check_application, ask_question, greeting, complaint, other>",
  "data": {
    "jobTitle": "<extracted job title if any, else empty string>",
    "location": "<extracted location if any, else empty string>",
    "skills": "<extracted skills comma-separated if any, else empty string>",
    "salary": "<extracted salary expectation if any, else empty string>"
  },
  "response": "<helpful response to the user IN ${langName}>"
}`

  try {
    const raw = await callGemini(prompt)
    // Strip any accidental markdown code blocks
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as ProcessedInput
    return parsed
  } catch {
    // Fallback — return a minimal processed input
    return {
      normalizedInput: input,
      detectedLanguage: userLang,
      intent: 'other',
      data: {},
      response:
        userLang === 'hi'
          ? 'क्षमा करें, कुछ समझ नहीं आया। कृपया फिर से प्रयास करें।'
          : userLang === 'te'
          ? 'క్షమించండి, అర్థం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.'
          : "Sorry, I couldn't understand that. Please try again.",
    }
  }
}

/**
 * Detect the language of a given text snippet.
 * Returns 'en' as fallback.
 */
export async function detectLanguage(text: string): Promise<SupportedLocale> {
  if (!text?.trim() || text.trim().length < 3) return 'en'

  const prompt = `Detect the language of the following text.
Reply with ONLY one of these codes: en, hi, te
- en = English
- hi = Hindi (Devanagari script or romanized Hindi)
- te = Telugu

Text: "${text.trim().slice(0, 200)}"`

  try {
    const result = (await callGemini(prompt)).trim().toLowerCase()
    if (result.startsWith('hi')) return 'hi'
    if (result.startsWith('te')) return 'te'
    return 'en'
  } catch {
    return 'en'
  }
}

/**
 * Translate a dynamic field (e.g. job description, notification) for display.
 * Uses cached results to avoid repeated API calls.
 */
const _translationCache = new Map<string, string>()

export async function translateDynamic(
  text: string,
  targetLang: SupportedLocale
): Promise<string> {
  if (targetLang === 'en') return text
  const cacheKey = `${targetLang}:${text.slice(0, 100)}`
  if (_translationCache.has(cacheKey)) return _translationCache.get(cacheKey)!
  const translated = await translateText(text, targetLang)
  _translationCache.set(cacheKey, translated)
  return translated
}

/**
 * Generate AI-powered job recommendations summary for a worker profile.
 */
export async function generateJobMatchSummary(
  jobTitle: string,
  workerSkills: string[],
  jobSkills: string[],
  userLang: SupportedLocale = 'en'
): Promise<string> {
  const langName = LANG_NAMES[userLang]
  const matchedSkills = workerSkills.filter((s) =>
    jobSkills.map((j) => j.toLowerCase()).includes(s.toLowerCase())
  )

  const prompt = `You are a job matching assistant for HyperLocal, an Indian blue-collar job app.
Generate a short 1-2 sentence explanation (in ${langName}) of why this worker is a good match for "${jobTitle}".
Worker's skills: ${workerSkills.join(', ') || 'Not specified'}
Job required skills: ${jobSkills.join(', ') || 'Not specified'}
Matched skills: ${matchedSkills.join(', ') || 'None yet'}

Keep it encouraging and simple. No markdown formatting.`

  try {
    return (await callGemini(prompt)).trim()
  } catch {
    return userLang === 'hi'
      ? 'आपके कौशल इस नौकरी के लिए उपयुक्त हैं।'
      : userLang === 'te'
      ? 'మీ నైపుణ్యాలు ఈ ఉద్యోగానికి సరిపోతాయి.'
      : 'Your skills are a good match for this job.'
  }
}
