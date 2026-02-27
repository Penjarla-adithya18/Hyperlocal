import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPTS } from '@/lib/gemini'

// ── Provider configuration (server-side only — never sent to browser) ─────────
// Local dev  (.env.local) : OLLAMA_URL=http://localhost:11434
// Vercel prod (dashboard) : GROQ_API_KEY=gsk_...
// Optional                : OLLAMA_MODEL (default: llama3.1:8b)

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
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

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // ── Groq (cloud — Vercel production) ────────────────────────────────────
    if (GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       'llama-3.1-8b-instant',
          messages:    [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens:  maxTokens,
        }),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        return NextResponse.json({ error: `Groq error (${res.status}): ${err.slice(0, 200)}` }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ text: (data.choices?.[0]?.message?.content as string) ?? '' })
    }

    // ── Ollama (local / self-hosted — development) ───────────────────────────
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:   OLLAMA_MODEL,
        prompt,
        system:  systemInstruction,
        stream:  false,
        options: { temperature: 0.2, num_predict: maxTokens },
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return NextResponse.json({ error: `Ollama error (${res.status}): ${err.slice(0, 200)}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ text: (data.response as string) ?? '' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI proxy error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
