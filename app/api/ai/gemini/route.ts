import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPTS } from '@/lib/gemini'

type Tier = 'lite' | 'flash'

const ENDPOINT: Record<Tier, string> = {
  lite: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
}

let keyIndex = 0

function getGeminiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEYS ?? process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? ''
  return raw
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

function getNextKey(keys: string[]): string {
  const key = keys[keyIndex % keys.length]
  keyIndex++
  return key
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    const tier: Tier = body?.tier === 'lite' ? 'lite' : 'flash'
    const maxTokens = typeof body?.maxTokens === 'number' ? Math.min(Math.max(body.maxTokens, 16), 1024) : 512
    const systemInstruction = typeof body?.systemInstruction === 'string' && body.systemInstruction.trim()
      ? body.systemInstruction.trim()
      : SYSTEM_PROMPTS.API_PROXY_DEFAULT

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const keys = getGeminiKeys()
    if (keys.length === 0) {
      return NextResponse.json({ error: 'Gemini keys are not configured' }, { status: 500 })
    }

    const endpoint = ENDPOINT[tier]
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      systemInstruction: { parts: [{ text: systemInstruction }] },
    })

    const run = async (apiKey: string) =>
      fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })

    let response = await run(getNextKey(keys))

    if (!response.ok && response.status === 429 && keys.length > 1) {
      response = await run(getNextKey(keys))
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Gemini request failed (${response.status})` }, { status: response.status })
    }

    const data = await response.json()
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? ''

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Gemini proxy error' }, { status: 500 })
  }
}
