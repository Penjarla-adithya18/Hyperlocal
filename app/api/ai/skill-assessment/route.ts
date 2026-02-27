import { NextRequest, NextResponse } from 'next/server'

// ── Provider configuration ────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'

const SYSTEM_PROMPT = `You are a skill assessment question generator for HyperLocal, India's hyperlocal job platform for blue-collar and gig workers.

Generate exactly 5 multiple-choice questions (MCQs) to assess practical knowledge of the given skill.

Rules:
- Questions must be practical and relevant to real-world Indian blue-collar/gig work contexts
- Each question must have exactly 4 options labeled A, B, C, D
- Exactly one option per question must be correct
- Difficulty: 2 easy, 2 medium, 1 hard
- Questions should test PRACTICAL knowledge, not theory
- Keep language simple — the test-taker may not be highly educated

Return ONLY a valid JSON array with this exact structure, no markdown, no code fences:
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct": "A",
    "difficulty": "easy"
  }
]`

async function callAI(prompt: string): Promise<string> {
  if (GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      }),
    })
    if (!res.ok) throw new Error(`Groq error ${res.status}`)
    const data = await res.json()
    return (data.choices?.[0]?.message?.content as string) ?? ''
  }

  // Ollama fallback
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      system: SYSTEM_PROMPT,
      stream: false,
      options: { temperature: 0.4, num_predict: 1200 },
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}`)
  const data = await res.json()
  return (data.response as string) ?? ''
}

function extractJSON(text: string): unknown {
  // Try direct parse first
  try { return JSON.parse(text) } catch {}
  // Try to extract JSON array from text
  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { skill } = await req.json()
    if (!skill || typeof skill !== 'string') {
      return NextResponse.json({ error: 'skill is required' }, { status: 400 })
    }

    const prompt = `Generate 5 MCQ assessment questions for the skill: "${skill}". The worker claims to know this skill and we need to verify their knowledge. Focus on practical, hands-on knowledge that someone actually working in this area would know.`

    const raw = await callAI(prompt)
    const parsed = extractJSON(raw)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'Failed to generate valid questions' }, { status: 500 })
    }

    // Validate structure
    const questions = parsed.slice(0, 5).map((q: Record<string, unknown>, i: number) => ({
      id: i + 1,
      question: String(q.question || ''),
      options: q.options as Record<string, string>,
      correct: String(q.correct || 'A'),
      difficulty: String(q.difficulty || 'medium'),
    }))

    return NextResponse.json({ questions })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assessment generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
