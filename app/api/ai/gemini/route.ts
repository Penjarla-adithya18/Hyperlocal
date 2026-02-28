import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPTS } from '@/lib/gemini'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

// ── Provider configuration (server-side only — never sent to browser) ─────────
// Local dev  (.env.local) : OLLAMA_URL=http://localhost:11434
// Production              : NEXT_PUBLIC_GEMINI_API_KEYS=key1,key2,...
// Optional                : OLLAMA_MODEL (default: llama3.1:8b)

const GEMINI_KEYS  = (process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean)
let keyIdx = 0
function nextGeminiKey(): string {
  if (!GEMINI_KEYS.length) return ''
  const key = GEMINI_KEYS[keyIdx % GEMINI_KEYS.length]
  keyIdx++
  return key
}
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json()
    const prompt     = typeof body?.prompt    === 'string' ? body.prompt    : ''
    const maxTokens  = typeof body?.maxTokens === 'number' ? Math.min(Math.max(body.maxTokens, 16), 2048) : 512
    const systemInstruction = typeof body?.systemInstruction === 'string' && body.systemInstruction.trim()
      ? body.systemInstruction.trim()
      : SYSTEM_PROMPTS.API_PROXY_DEFAULT
    // 'ollama' forces local Ollama, skipping Groq even if a key is present
    const provider = typeof body?.provider === 'string' ? body.provider : 'auto'

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const geminiKey = nextGeminiKey()

    // ── Google Gemini via AI SDK (production) — skipped when provider==='ollama' ──
    if (geminiKey && provider !== 'ollama') {
      try {
        const google = createGoogleGenerativeAI({ apiKey: geminiKey })
        const { text } = await generateText({
          model: google('gemini-2.0-flash'),
          system: systemInstruction,
          prompt,
          maxOutputTokens: maxTokens,
          temperature: 0.2,
        })
        return NextResponse.json({ text: text ?? '' })
      } catch (geminiErr) {
        // Gemini failed (leaked/revoked keys, quota exceeded, etc.)
        // Fall through to Ollama instead of returning 500 immediately
        console.warn('[AI] Gemini failed, falling back to Ollama:', geminiErr instanceof Error ? geminiErr.message : geminiErr)
      }
    }

    // ── Ollama via AI SDK OpenAI-compatible (development / fallback) ─────────
    const ollama = createOpenAI({
      baseURL: `${OLLAMA_URL}/v1`,
      apiKey: 'ollama',
    })
    const { text } = await generateText({
      model: ollama(OLLAMA_MODEL),
      system: systemInstruction,
      prompt,
      maxOutputTokens: maxTokens,
      temperature: 0.2,
    })
    return NextResponse.json({ text: text ?? '' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI proxy error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
