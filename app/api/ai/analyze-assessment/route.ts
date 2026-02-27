import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, downloadMedia } from '@/lib/whisper'
import { fetchWithRetry, isRetryableError } from '@/lib/fetchRetry'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

/**
 * POST /api/ai/analyze-assessment
 *
 * Complete video assessment analysis pipeline with AUTO-DECISION:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. Analyze client-side audio metrics (volume, silence, peaks) │
 * │  2. Download video → Whisper transcription (multilingual)      │
 * │  3. AI SDK (Gemini): plagiarism / originality check on transcribed text │
 * │  4. If original → AI SDK (Gemini): answer correctness check             │
 * │  5. AUTO-DECISION:                                             │
 * │     ✅ Original + correct (≥50)  → status = approved           │
 * │     ❌ Plagiarism/AI/read        → status = rejected           │
 * │     ❌ Incorrect (any score)     → status = rejected           │
 * │     ⏳ Correct but 40-49         → status = pending (review)   │
 * │  6. Update skill_assessments with analysis + status + reason   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Called synchronously from /api/ai/skill-video-submit.
 * Returns the analysis + auto-decision to the client immediately.
 */

// ── Provider configuration (AI SDK — Gemini primary, Ollama fallback) ─────────
const GEMINI_KEYS = (process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? '')
  .split(',').map(k => k.trim()).filter(Boolean)
let _keyIdx = 0
function nextGeminiKey(): string | undefined {
  if (GEMINI_KEYS.length === 0) return undefined
  const k = GEMINI_KEYS[_keyIdx % GEMINI_KEYS.length]
  _keyIdx++
  return k
}
const OLLAMA_URL   = process.env.OLLAMA_URL   ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://yecelpnlaruavifzxunw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllY2VscG5sYXJ1YXZpZnp4dW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Njk5MTksImV4cCI6MjA4NzI0NTkxOX0.MaoAJIec30GfrQolYQKJ4dnvmIxTW7t0DbM_tS8xYVk'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? SUPABASE_ANON_KEY

// ── Types ─────────────────────────────────────────────────────────────────────

interface AudioMetrics {
  avgVolume: number
  volumeVariance: number
  silenceRatio: number
  peakCount: number
  zeroCrossings: number
  speechRateVariance: number
}

interface OriginalityResult {
  is_original: boolean
  confidence: number
  reasoning: string
  speech_pattern: 'natural' | 'scripted' | 'memorized' | 'ai_generated'
}

interface CorrectnessResult {
  is_correct: boolean
  score: number
  matched_points: string[]
  missed_points: string[]
  summary: string
}

type AutoDecision = 'approved' | 'rejected' | 'pending'

interface AnalysisResult {
  confidence_score: number
  is_reading: boolean
  is_ai_voice: boolean
  tone_natural: boolean
  flags: string[]
  details: string
  audio_metrics?: AudioMetrics
  transcribed_text?: string
  transcription_language?: string
  originality_check?: OriginalityResult
  answer_check?: CorrectnessResult
  // ── Auto-decision fields ──
  auto_decision: AutoDecision
  auto_decision_reason: string
}

// ── AI Call Helper (AI SDK — Gemini → Ollama fallback) ────────────────────────

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const geminiKey = nextGeminiKey()
  if (geminiKey) {
    try {
      const google = createGoogleGenerativeAI({ apiKey: geminiKey })
      const { text } = await generateText({
        model: google('gemini-2.0-flash'),
        system: systemPrompt,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 1000,
      })
      return text ?? ''
    } catch { /* fall through to Ollama */ }
  }

  // Ollama fallback via OpenAI-compatible provider
  const ollama = createOpenAI({ baseURL: `${OLLAMA_URL}/v1`, apiKey: 'ollama' })
  const { text } = await generateText({
    model: ollama(OLLAMA_MODEL),
    system: systemPrompt,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1000,
  })
  return text ?? ''
}

/** Safely parse JSON from AI output (handles markdown code blocks) */
function parseJsonSafe<T>(text: string, fallback: T): T {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const clean = jsonMatch ? jsonMatch[1].trim() : text.trim()
    return JSON.parse(clean) as T
  } catch {
    return fallback
  }
}

// ── Audio Metrics Analysis ────────────────────────────────────────────────────

function analyzeAudioMetrics(metrics: AudioMetrics | null): {
  flags: string[]
  isReading: boolean
  isAiVoice: boolean
  toneNatural: boolean
  score: number
} {
  const flags: string[] = []
  let score = 80

  if (!metrics) {
    return { flags: ['No audio metrics available'], isReading: false, isAiVoice: false, toneNatural: true, score: 50 }
  }

  if (metrics.volumeVariance < 0.05) {
    flags.push('Very low volume variance — monotone (possible AI voice)')
    score -= 20
  } else if (metrics.volumeVariance < 0.1) {
    flags.push('Low volume variance — speech may be rehearsed')
    score -= 10
  }

  if (metrics.silenceRatio < 0.08) {
    flags.push('Almost no pauses — unnaturally fluent (possible AI voice)')
    score -= 15
  } else if (metrics.silenceRatio > 0.5) {
    flags.push('Excessive silence — possible reading with long pauses')
    score -= 10
  }

  if (metrics.peakCount < 10) {
    flags.push('Very few audio peaks — flat delivery (AI voice signature)')
    score -= 15
  } else if (metrics.peakCount < 20) {
    flags.push('Low emphasis variation — possibly reading from text')
    score -= 8
  }

  if (metrics.zeroCrossings > 0 && metrics.speechRateVariance < 0.02) {
    flags.push('Extremely consistent speech rate — unnatural cadence')
    score -= 15
  }

  if (metrics.speechRateVariance < 0.05) {
    flags.push('Constant speech rate — possible reading or AI generation')
    score -= 10
  }

  return {
    flags,
    isReading: metrics.volumeVariance < 0.1 && metrics.speechRateVariance < 0.08,
    isAiVoice: metrics.volumeVariance < 0.05 && metrics.silenceRatio < 0.1 && metrics.peakCount < 15,
    toneNatural: score >= 60,
    score: Math.max(0, Math.min(100, score)),
  }
}

// ── DB Update ─────────────────────────────────────────────────────────────────

async function updateAssessmentWithDecision(
  assessmentId: string,
  analysis: AnalysisResult,
  status: AutoDecision,
  reviewNotes: string,
) {
  try {
    await fetchWithRetry(`${SUPABASE_URL}/rest/v1/skill_assessments?id=eq.${assessmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        analysis,
        status,
        reviewed_by: null, // auto-decision — no admin
        review_notes: `[AUTO] ${reviewNotes}`,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    }, { maxAttempts: 3, baseDelayMs: 1500, label: 'SupabaseUpdate' })
  } catch (e) {
    console.error('[analyze-assessment] DB update failed:', e)
  }
}

// ── Storage Cleanup ───────────────────────────────────────────────────────────

/**
 * Delete a video file from Supabase Storage after analysis is complete.
 * URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
 */
async function deleteStorageFile(fileUrl: string): Promise<void> {
  try {
    const match = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (!match) {
      console.warn('[analyze-assessment] Cannot parse storage URL for deletion:', fileUrl.substring(0, 80))
      return
    }
    const [, bucket, filePath] = match
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`
    const res = await fetchWithRetry(deleteUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }, { maxAttempts: 2, baseDelayMs: 1000, label: 'StorageDelete' })
    if (res.ok) {
      console.log(`[analyze-assessment] 🗑 Storage file deleted: ${bucket}/${filePath}`)
    } else {
      const err = await res.text()
      console.warn(`[analyze-assessment] Storage delete failed (${res.status}): ${err.substring(0, 100)}`)
    }
  } catch (e) {
    console.warn('[analyze-assessment] Storage delete error (non-critical):', e)
  }
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assessmentId, videoUrl, skill, expectedAnswer, audioMetrics, question, language } = body
    // Worker's chosen UI language (en/hi/te) — used as Whisper language hint
    const whisperLang: string | undefined = typeof language === 'string' && language !== 'en' ? language : undefined

    console.log(`[analyze-assessment] ▶ Pipeline start — assessment ${assessmentId}, skill: ${skill}, lang: ${language ?? 'en'}`)

    // ── Step 1: Analyze client-side audio metrics ───────────────────────────
    const audioAnalysis = analyzeAudioMetrics(audioMetrics as AudioMetrics | null)
    console.log(`[analyze-assessment] Step 1 ✓ Audio metrics — score=${audioAnalysis.score}, flags=${audioAnalysis.flags.length}`)

    // ── Step 2: Download video & transcribe with Whisper ────────────────────
    let transcribedText = ''
    let transcriptionLanguage = ''
    let transcriptionNetworkError = false // Track if failure was due to network

    if (videoUrl) {
      try {
        console.log('[analyze-assessment] Step 2a: Downloading video...')
        const { buffer, mimeType } = await downloadMedia(videoUrl)
        console.log(`[analyze-assessment] Step 2a ✓ Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB (${mimeType})`)

        console.log(`[analyze-assessment] Step 2b: Transcribing with Whisper${whisperLang ? ` (hint: ${whisperLang})` : ' (auto-detect)'}...`)
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const transcription = await transcribeAudio(buffer, `assessment.${ext}`, mimeType, whisperLang)
        transcribedText = transcription.text
        transcriptionLanguage = transcription.language
        console.log(`[analyze-assessment] Step 2b ✓ Transcribed (${transcriptionLanguage}): "${transcribedText.substring(0, 150)}..."`)
      } catch (e) {
        console.warn('[analyze-assessment] Step 2 ✗ Transcription failed:', e)
        // Distinguish network errors from legitimate transcription failures
        if (isRetryableError(e)) {
          transcriptionNetworkError = true
          audioAnalysis.flags.push('Whisper transcription failed due to network error — will retry or need manual review')
        } else {
          audioAnalysis.flags.push('Whisper transcription failed — could not extract speech')
        }
      }
    } else {
      audioAnalysis.flags.push('No video URL provided — cannot transcribe')
    }

    // ── Step 3: Originality / plagiarism check via Ollama ───────────────────
    let originalityCheck: OriginalityResult | undefined

    if (transcribedText.trim().length > 10) {
      try {
        console.log('[analyze-assessment] Step 3: Originality check...')

        // Build question context in all languages for the AI
        const questionContext = typeof question === 'object' && question !== null
          ? Object.entries(question as Record<string, string>)
              .map(([lang, text]) => `[${lang}] ${text}`)
              .join('\n')
          : (question || skill)

        const originalityPrompt = `Analyze this transcribed speech from a skill assessment VIDEO RECORDING.

Skill being tested: "${skill}"
Question asked (may be in multiple languages):
${questionContext}

Worker's transcribed verbal answer (Whisper detected language: ${transcriptionLanguage}):
"${transcribedText}"

The worker may answer in English, Hindi, Telugu, or a mix of languages. This is NORMAL for Indian workers.

Determine whether:
1. READING: Speech was read from a written source — formal language, no natural markers (um, uh, self-corrections), textbook-like, perfect grammar
2. MEMORIZED/COPIED: Rehearsed textbook phrases, too perfect structure, copied from internet
3. AI-GENERATED: Generated by AI tools like Parrot.ai — perfectly fluent, no filler words, unnatural precision, robotic cadence
4. NATURAL & SPONTANEOUS: Informal, self-corrections, thinking pauses, personal experience, filler words (bilingual fillers like "matlab", "basically", "na" are natural)

Key indicators of reading/AI (any language):
- Perfect grammar and sentence structure throughout
- No self-corrections, restarts, or filler words
- Textbook definitions instead of practical examples
- Unnaturally complete sentences

Key indicators of genuine spontaneous speech:
- Self-corrections, restarts, filler words (um, uh, matlab, basically, like)
- Personal anecdotes or examples
- Incomplete sentences or restarts
- Practical/hands-on descriptions
- Language mixing (Hindi-English, Telugu-English) is a STRONG indicator of natural speech

Return ONLY valid JSON (no markdown):
{"is_original": true, "confidence": 75, "reasoning": "brief explanation", "speech_pattern": "natural"}`

        const response = await callAI(
          originalityPrompt,
          'You are an expert linguist specializing in detecting scripted vs spontaneous speech across English, Hindi, and Telugu. Analyze transcribed audio carefully. Return ONLY JSON.',
        )

        originalityCheck = parseJsonSafe<OriginalityResult>(response, {
          is_original: true,
          confidence: 50,
          reasoning: 'Could not determine originality.',
          speech_pattern: 'natural',
        })
        console.log(`[analyze-assessment] Step 3 ✓ Originality: original=${originalityCheck.is_original}, pattern=${originalityCheck.speech_pattern}`)

        if (!originalityCheck.is_original) {
          audioAnalysis.flags.push(`NLP: Speech appears ${originalityCheck.speech_pattern} — ${originalityCheck.reasoning}`)
          audioAnalysis.score = Math.max(0, audioAnalysis.score - 20)
        }
        if (originalityCheck.speech_pattern === 'ai_generated') {
          audioAnalysis.flags.push('NLP: Response likely generated by AI tool (Parrot.ai or similar)')
          audioAnalysis.score = Math.max(0, audioAnalysis.score - 25)
        }
        if (originalityCheck.speech_pattern === 'scripted') {
          audioAnalysis.flags.push('NLP: Speech consistent with reading from a script/screen')
          audioAnalysis.score = Math.max(0, audioAnalysis.score - 15)
        }
      } catch (e) {
        console.warn('[analyze-assessment] Step 3 ✗ Originality check failed:', e)
      }
    } else if (transcribedText.trim().length === 0 && videoUrl) {
      audioAnalysis.flags.push('No speech detected in the recording — silent or inaudible')
      audioAnalysis.score = Math.max(0, audioAnalysis.score - 30)
    }

    // ── Step 4: Answer correctness check via Ollama ─────────────────────────
    let answerCheck: CorrectnessResult | undefined

    const isNotOriginal =
      originalityCheck &&
      !originalityCheck.is_original &&
      originalityCheck.confidence >= 70

    if (transcribedText.trim().length > 10 && expectedAnswer && !isNotOriginal) {
      try {
        console.log('[analyze-assessment] Step 4: Answer correctness check...')

        // Build multilingual question text
        let questionText = skill
        if (typeof question === 'object' && question !== null) {
          const q = question as Record<string, string>
          questionText = q.en || q.hi || q.te || JSON.stringify(question)
        } else if (typeof question === 'string') {
          questionText = question
        }

        const correctnessPrompt = `You are an expert skill assessor for blue-collar and service jobs in India.

Question asked (in English):
"${questionText}"

Expected correct answer (key points):
"${expectedAnswer}"

Worker's verbal answer (transcribed from video — may be in English, Hindi, Telugu, or mixed):
"${transcribedText}"

Whisper detected language: ${transcriptionLanguage}

IMPORTANT:
- The worker may answer in ANY language (Hindi, Telugu, English, or mixed). Evaluate the CONTENT regardless of language.
- Focus on whether they demonstrate REAL PRACTICAL KNOWLEDGE, not language perficiency.
- Simple language, broken sentences, or mixed-language responses are fine — judge the substance.
- Partial credit: if they get some key points right, give proportional score.
- A score of 50+ means the worker has basic understanding. 70+ means solid knowledge.
- Be lenient with exact wording — practical understanding matters more than textbook answers.

Return ONLY valid JSON (no markdown):
{"is_correct": true, "score": 72, "matched_points": ["point 1", "point 2"], "missed_points": ["missed point"], "summary": "brief 1-2 sentence assessment"}`

        const response = await callAI(
          correctnessPrompt,
          'You are a practical skill assessor for workers in India. You understand English, Hindi, and Telugu. Judge answers on demonstration of real knowledge across any language. Return ONLY JSON.',
        )

        answerCheck = parseJsonSafe<CorrectnessResult>(response, {
          is_correct: false,
          score: 0,
          matched_points: [],
          missed_points: ['Could not evaluate answer'],
          summary: 'Automated answer check failed.',
        })
        console.log(`[analyze-assessment] Step 4 ✓ Correctness: correct=${answerCheck.is_correct}, score=${answerCheck.score}`)
      } catch (e) {
        console.warn('[analyze-assessment] Step 4 ✗ Correctness check failed:', e)
      }
    } else if (isNotOriginal) {
      console.log('[analyze-assessment] Step 4 ⊘ Skipped — answer flagged as not original')
      answerCheck = {
        is_correct: false,
        score: 0,
        matched_points: [],
        missed_points: ['Answer flagged as not original — correctness not evaluated'],
        summary: 'Answer flagged as non-original (likely read or AI-generated). Correctness not evaluated.',
      }
    }

    // ── Step 5: AUTO-DECISION ───────────────────────────────────────────────
    let autoDecision: AutoDecision = 'pending'
    let autoDecisionReason = ''

    // Case 0: Network error during transcription — don't penalize the worker
    if (transcriptionNetworkError) {
      autoDecision = 'pending'
      autoDecisionReason = 'Transcription failed due to network error. Assessment saved for retry when connection is restored.'
    }
    // Case 1: No speech detected (genuine silence, NOT network failure)
    else if (transcribedText.trim().length === 0 && videoUrl) {
      autoDecision = 'rejected'
      autoDecisionReason = 'No speech detected in the recording. The video was silent or inaudible.'
    }
    // Case 2: Plagiarism / reading / AI-generated detected
    else if (isNotOriginal) {
      autoDecision = 'rejected'
      const patternLabel = originalityCheck!.speech_pattern === 'ai_generated'
        ? 'AI-generated voice (e.g., Parrot.ai)'
        : originalityCheck!.speech_pattern === 'scripted'
          ? 'reading from a script or screen'
          : originalityCheck!.speech_pattern === 'memorized'
            ? 'memorized or copied content'
            : 'non-original content'
      autoDecisionReason = `Rejected: ${patternLabel} detected. ${originalityCheck!.reasoning}`
    }
    // Case 3: Original answer but INCORRECT → always reject
    else if (answerCheck && !answerCheck.is_correct) {
      autoDecision = 'rejected'
      autoDecisionReason = `Incorrect answer (score: ${answerCheck.score}/100). ${answerCheck.summary}`
    }
    // Case 4: Original + correct + good score → AUTO-APPROVE
    else if (answerCheck && answerCheck.is_correct && answerCheck.score >= 50) {
      autoDecision = 'approved'
      autoDecisionReason = `Skill verified automatically. Answer score: ${answerCheck.score}/100. ${answerCheck.summary}`
    }
    // Case 5: Correct but borderline score (40-49) → pending for admin review
    else if (answerCheck && answerCheck.is_correct && answerCheck.score >= 40 && answerCheck.score < 50) {
      autoDecision = 'pending'
      autoDecisionReason = `Borderline score (${answerCheck.score}/100). Needs admin review. ${answerCheck.summary}`
    }
    // Case 6: Transcription failed or other issues → pending
    else {
      autoDecision = 'pending'
      autoDecisionReason = 'Automated analysis could not make a confident decision. Admin review needed.'
    }

    console.log(`[analyze-assessment] Step 5 ✓ Auto-decision: ${autoDecision} — ${autoDecisionReason.substring(0, 100)}`)

    // ── Step 6: Generate details summary ────────────────────────────────────
    const summaryParts: string[] = []
    if (transcribedText) summaryParts.push(`Transcription (${transcriptionLanguage}): "${transcribedText.substring(0, 300)}"`)
    if (originalityCheck) summaryParts.push(`Originality: ${originalityCheck.speech_pattern} (${originalityCheck.confidence}%) — ${originalityCheck.reasoning}`)
    if (answerCheck) summaryParts.push(`Answer: ${answerCheck.score}/100 — ${answerCheck.summary}`)
    summaryParts.push(`Auto-decision: ${autoDecision.toUpperCase()} — ${autoDecisionReason}`)

    const details = summaryParts.join(' | ')

    // ── Step 7: Compute final score & compile analysis ──────────────────────
    const finalScore = Math.round(
      (audioAnalysis.score * 0.25) +
      ((originalityCheck ? (originalityCheck.is_original ? 80 : 25) : 50) * 0.35) +
      ((answerCheck ? answerCheck.score : 50) * 0.40),
    )

    const analysis: AnalysisResult = {
      confidence_score: Math.max(0, Math.min(100, finalScore)),
      is_reading: audioAnalysis.isReading || originalityCheck?.speech_pattern === 'scripted',
      is_ai_voice: audioAnalysis.isAiVoice || originalityCheck?.speech_pattern === 'ai_generated',
      tone_natural: audioAnalysis.toneNatural && (!originalityCheck || originalityCheck.speech_pattern === 'natural'),
      flags: audioAnalysis.flags,
      details,
      audio_metrics: (audioMetrics as AudioMetrics) ?? undefined,
      transcribed_text: transcribedText || undefined,
      transcription_language: transcriptionLanguage || undefined,
      originality_check: originalityCheck,
      answer_check: answerCheck,
      auto_decision: autoDecision,
      auto_decision_reason: autoDecisionReason,
    }

    // ── Step 8: Update DB with analysis + status ────────────────────────────
    if (assessmentId) {
      await updateAssessmentWithDecision(assessmentId, analysis, autoDecision, autoDecisionReason)
    }
    // ── Step 9: Delete video from Storage (fire-and-forget, non-blocking) ────
    // Only delete if it's a real storage URL (not an inline data: URL)
    if (videoUrl && videoUrl.startsWith('http') && videoUrl.includes('/storage/v1/object/public/')) {
      deleteStorageFile(videoUrl).catch(() => {}) // Non-critical — don't fail the response
    }
    console.log(`[analyze-assessment] ✓ Pipeline complete — score: ${finalScore}/100, decision: ${autoDecision}`)
    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[analyze-assessment] ✗ Pipeline error:', error)
    return NextResponse.json(
      { error: 'Analysis pipeline failed', details: String(error) },
      { status: 500 },
    )
  }
}
