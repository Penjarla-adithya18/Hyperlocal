import { NextRequest, NextResponse } from 'next/server'

// ── Provider configuration ────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'

const SYSTEM_PROMPT = `You are a technical interview expert for HyperLocal, India's blue-collar job platform.

Your task: Generate ONE deep, knowledge-testing question that requires the worker to EXPLAIN HOW THEY WOULD SOLVE A SPECIFIC TECHNICAL PROBLEM in detail.

STRICT RULES:
1. Ask the worker to EXPLAIN THEIR SOLUTION to a specific problem — NOT describe a past scenario or experience
2. The question must test DEPTH OF KNOWLEDGE: root cause understanding, step-by-step solution, why each step matters
3. Questions must be something ONLY a genuinely experienced worker can answer correctly — a beginner would fail
4. Must have a CLEAR, VERIFIABLE correct answer with 4-6 specific technical points
5. NO “tell me about a time” or “describe a situation” — ask for their technical explanation/solution process
6. Use simple conversational language (workers may not have formal education)
7. The answer should take 45-90 seconds to explain properly

QUESTION FORMATS (use one of these):
- “A [specific problem] has occurred. Walk me through exactly how you would diagnose and fix it, step by step.”
- “Explain in detail: when [problem X] happens, what causes it and what is the correct way to solve it?”
- “How do you correctly [perform technical task]? Explain each step and what can go wrong if done incorrectly.”
- “What is the right way to handle [specific technical situation]? Explain why each step matters.”
- “If [specific failure/defect] occurs during your work, what are the possible causes and how do you fix each one?”

EXPECTED ANSWER RULES:
- 4-6 specific, verifiable technical points
- Include the ROOT CAUSE understanding, not just the fix
- Include what happens if done INCORRECTLY (consequences)
- At least one safety or quality point
- Knowledge that ONLY someone with real hands-on experience would know

GOOD QUESTION EXAMPLES:
- For ReactJS: “Explain how you would fix a React app where a list re-renders on every keystroke in a search input, even when the data hasn’t changed. What causes this and what is the exact solution?”
- For Plumbing: “A pipe joint is leaking even after you replaced the washer. Explain exactly how you would diagnose the real cause and fix it properly, step by step.”
- For Electrician: “A circuit breaker keeps tripping every 2-3 hours under normal load. Walk me through how you would find the exact cause and resolve it.”

BAD QUESTION EXAMPLES (NEVER use these):
- “Tell me about your experience with ReactJS”
- “Describe a situation where you solved a problem”
- “What do you know about plumbing?”

Return ONLY valid JSON (no markdown, no code fences):
{
  "question": {
    "en": "English question asking them to explain their problem-solving process",
    "hi": "Hindi translation in Devanagari script",
    "te": "Telugu translation in Telugu script"
  },
  "expected_answer": "1) root cause explanation 2) step 1 with reason 3) step 2 with reason 4) what goes wrong if done incorrectly 5) quality/safety check",
  "difficulty": "medium",
  "estimated_answer_time_seconds": 75
}`

async function callAI(prompt: string): Promise<string> {
  // Try Groq first (faster, cloud)
  if (GROQ_API_KEY) {
    try {
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
          temperature: 0.5,
          max_tokens: 1500,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return (data.choices?.[0]?.message?.content as string) ?? ''
      }
    } catch { /* fall through to Ollama */ }
  }

  // Fallback: Ollama local
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `${SYSTEM_PROMPT}\n\nUser: ${prompt}`,
      stream: false,
      options: { temperature: 0.5, num_predict: 1500 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}`)
  const data = await res.json()
  return (data.response as string) ?? ''
}

function extractJSON(text: string): unknown | null {
  // Try direct parse
  try { return JSON.parse(text) } catch { /* continue */ }
  // Try extracting JSON object from text
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch { /* continue */ }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const skill = body.skill as string

    if (!skill?.trim()) {
      return NextResponse.json({ error: 'skill is required' }, { status: 400 })
    }

    const prompt = `Generate a deep, knowledge-testing question for the skill: "${skill}"

The question must ask the worker to EXPLAIN HOW THEY WOULD SOLVE a specific technical problem related to "${skill}".

Focus on:
- Problems that require real hands-on knowledge to solve
- Step-by-step technical reasoning, not just listing steps
- Root cause understanding — why the problem occurs and why each fix works
- What a skilled worker does that a beginner would miss

Example of correct question type for "${skill}":
Instead of: "Tell me about your experience with ${skill}"
Ask: "Explain exactly how you would diagnose and fix [a specific technical problem in ${skill}]"

Generate one specific, deep technical question where the worker must explain their complete problem-solving process.
The expected_answer must have 4-6 specific technical points that only a genuinely experienced ${skill} worker would know.`

    const raw = await callAI(prompt)
    const parsed = extractJSON(raw)

    if (
      parsed &&
      typeof parsed === 'object' &&
      'question' in (parsed as Record<string, unknown>) &&
      'expected_answer' in (parsed as Record<string, unknown>)
    ) {
      const result = parsed as {
        question: { en: string; hi: string; te: string }
        expected_answer: string
        difficulty?: string
        estimated_answer_time_seconds?: number
      }

      // Ensure all language keys exist with fallbacks
      if (!result.question.hi) result.question.hi = result.question.en
      if (!result.question.te) result.question.te = result.question.en

      return NextResponse.json({
        question: result.question,
        expected_answer: result.expected_answer,
        difficulty: result.difficulty ?? 'medium',
        estimated_answer_time_seconds: result.estimated_answer_time_seconds ?? 60,
      })
    }

    // Fallback: construct a generic question if AI didn't return proper JSON
    const fallbackQuestion = {
      en: `Describe a situation where you used your ${skill} skill to solve a real problem at work. What was the problem, what did you do, and what was the result?`,
      hi: `एक ऐसी स्थिति बताएं जहां आपने काम पर एक वास्तविक समस्या को हल करने के लिए अपने ${skill} कौशल का उपयोग किया। समस्या क्या थी, आपने क्या किया, और परिणाम क्या हुआ?`,
      te: `మీరు పనిలో నిజమైన సమస్యను పరిష్కరించడానికి మీ ${skill} నైపుణ్యాన్ని ఉపయోగించిన పరిస్థితిని వివరించండి. సమస్య ఏమిటి, మీరు ఏమి చేశారు, ఫలితం ఏమిటి?`,
    }

    return NextResponse.json({
      question: fallbackQuestion,
      expected_answer: `Worker should describe: 1) A specific situation related to ${skill}, 2) The actions they took using their expertise, 3) The outcome and what they learned`,
      difficulty: 'medium',
      estimated_answer_time_seconds: 60,
    })
  } catch (error) {
    console.error('[skill-question] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 },
    )
  }
}
