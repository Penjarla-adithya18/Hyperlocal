import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, downloadMedia } from '@/lib/whisper'

/**
 * POST /api/ai/transcribe-audio
 *
 * Standalone speech-to-text transcription using OpenAI Whisper (via Groq).
 * Accepts a video/audio URL or base64-encoded data.
 *
 * Body: { videoUrl?: string, videoBase64?: string }
 * Returns: { success, text, language, duration, segments }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { videoUrl, videoBase64 } = body

    if (!videoUrl && !videoBase64) {
      return NextResponse.json(
        { error: 'Either videoUrl or videoBase64 is required' },
        { status: 400 },
      )
    }

    let buffer: Buffer
    let mimeType = 'video/webm'

    if (videoBase64) {
      // Accept raw base64 or data URL
      const match = videoBase64.match(/^data:([\w/+.-]+);base64,(.+)$/)
      if (match) {
        mimeType = match[1]
        buffer = Buffer.from(match[2], 'base64')
      } else {
        buffer = Buffer.from(videoBase64, 'base64')
      }
    } else {
      const media = await downloadMedia(videoUrl)
      buffer = media.buffer
      mimeType = media.mimeType
    }

    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const result = await transcribeAudio(buffer, `recording.${ext}`, mimeType)

    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
    })
  } catch (error) {
    console.error('[transcribe-audio] Error:', error)
    return NextResponse.json(
      { error: 'Transcription failed', details: String(error) },
      { status: 500 },
    )
  }
}
