/**
 * Whisper speech-to-text transcription utility.
 *
 * Uses Groq's hosted Whisper API (OpenAI-compatible) for fast,
 * accurate audio/video transcription.
 *
 * NOTE: This is the ONLY remaining Groq dependency in the project.
 *       All text generation has been migrated to Vercel AI SDK + Gemini.
 *       Groq Whisper is retained because AI SDK does not support audio
 *       transcription natively.
 *
 * Multilingual support (whisper-large-v3-turbo):
 *   - Telugu (te), Hindi (hi), English (en), Tamil (ta), Kannada (kn),
 *     Malayalam (ml), Marathi (mr), Gujarati (gu), Bengali (bn), and 90+ more.
 *   - If language is omitted, Whisper auto-detects from the audio.
 *   - Passing a language hint (e.g. 'te') improves accuracy for non-English speech.
 *   - Mixed-language speech (code-switching e.g. Telugu+English) is transcribed
 *     naturally — output will contain Telugu Unicode script where Telugu is spoken.
 *
 * Supported input formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
 * Max file size: 25 MB
 */

import { fetchWithRetry, isRetryableError } from './fetchRetry'

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string
  language: string
  duration: number
  segments: Array<{ start: number; end: number; text: string }>
}

// ── Transcription ─────────────────────────────────────────────────────────────

/**
 * Transcribe audio/video using Groq's Whisper API.
 * Groq hosts whisper-large-v3-turbo for fast speech-to-text.
 *
 * @param buffer   - Raw binary data of the audio/video file
 * @param filename - Filename with extension (e.g., 'recording.webm')
 * @param mimeType - MIME type (e.g., 'video/webm', 'audio/wav')
 * @param language - Optional ISO-639-1 language hint for better accuracy.
 *                   e.g. 'te' (Telugu), 'hi' (Hindi), 'en' (English).
 *                   Omit to let Whisper auto-detect the language.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename = 'recording.webm',
  mimeType = 'video/webm',
  language?: string,
): Promise<TranscriptionResult> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required for Whisper transcription')
  }

  // Groq Whisper expects multipart form-data with file + model
  const blob = new Blob([buffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, filename)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'verbose_json')
  // A language hint improves accuracy for non-English speech (e.g. 'te', 'hi').
  // Without it, Whisper auto-detects — still works well for Telugu/Hindi.
  if (language) formData.append('language', language)

  const res = await fetchWithRetry('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  }, { maxAttempts: 3, baseDelayMs: 1500, label: 'Whisper' })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Whisper API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  return {
    text: data.text ?? '',
    language: data.language ?? 'unknown',
    duration: data.duration ?? 0,
    segments: (data.segments ?? []).map((s: Record<string, unknown>) => ({
      start: s.start as number,
      end: s.end as number,
      text: s.text as string,
    })),
  }
}

// ── Media Download ────────────────────────────────────────────────────────────

/**
 * Download a media file from a URL and return as Buffer.
 * Handles both HTTP/HTTPS URLs and data: URLs (base64).
 */
export async function downloadMedia(
  url: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Handle data: URLs (base64-encoded inline video)
  const dataUrlMatch = url.match(/^data:([\w/+.-]+);base64,(.+)$/)
  if (dataUrlMatch) {
    return {
      buffer: Buffer.from(dataUrlMatch[2], 'base64'),
      mimeType: dataUrlMatch[1],
    }
  }

  // Handle HTTP(S) URLs (e.g., Supabase Storage public URL)
  const res = await fetchWithRetry(url, undefined, { maxAttempts: 3, label: 'MediaDownload' })
  if (!res.ok) {
    throw new Error(`Failed to download media: ${res.status} ${res.statusText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') ?? 'video/webm'

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType,
  }
}
