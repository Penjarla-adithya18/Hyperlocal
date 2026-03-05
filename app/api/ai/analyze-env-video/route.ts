import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { downloadMedia } from '@/lib/whisper'

export const maxDuration = 45
export const dynamic = 'force-dynamic'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '',
})

export interface EnvVideoAnalysis {
  suspicionScore: number           // 0–100 (100 = highly suspicious)
  flags: string[]
  details: {
    phoneDetected: boolean
    multiplePersons: boolean
    cheatSheetDetected: boolean
    secondScreenDetected: boolean
    normalEnvironment: boolean
  }
  summary: string
}

/**
 * POST /api/ai/analyze-env-video
 * Analyzes the environment (secondary) camera video using Gemini Vision.
 * Detects: phones, cheat sheets, second person, notes on desk, second screen.
 */
export async function POST(req: NextRequest) {
  try {
    const { envVideoUrl, session, skill } = await req.json()

    if (!envVideoUrl) {
      return NextResponse.json({ error: 'envVideoUrl is required' }, { status: 400 })
    }

    console.log(`[analyze-env-video] Analyzing environment video for session ${session}, skill: ${skill}`)

    // Download video
    let videoBuffer: Buffer
    let mimeType: string
    try {
      const media = await downloadMedia(envVideoUrl)
      videoBuffer = media.buffer
      mimeType = media.mimeType
      console.log(`[analyze-env-video] Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB`)
    } catch (e) {
      console.error('[analyze-env-video] Download failed:', e)
      return NextResponse.json({ error: 'Failed to download environment video' }, { status: 500 })
    }

    // Extract frames as base64 for Gemini (sample 3 frames from the video)
    const videoBase64 = videoBuffer.toString('base64')

    const prompt = `You are an AI exam proctoring system analyzing an ENVIRONMENT camera video from a skill assessment.
The secondary camera is placed beside or behind the worker to monitor their workspace during the assessment.

Analyze this video carefully and detect ANY of the following suspicious activities:

1. PHONE: Is there a mobile phone visible on the desk or in the worker's hands (other than the phone running the assessment)?
2. MULTIPLE PERSONS: Is there more than one person visible at any point?
3. CHEAT SHEET: Are there any papers, notes, notebooks, or printed materials on the desk that the worker could be reading?
4. SECOND SCREEN: Is there another monitor, laptop, tablet, or screen visible that could show reference material?
5. NORMAL ENVIRONMENT: Does this look like a normal, clean workspace appropriate for taking an assessment?

Respond ONLY in this exact JSON format:
{
  "phoneDetected": true/false,
  "multiplePersons": true/false,
  "cheatSheetDetected": true/false,
  "secondScreenDetected": true/false,
  "normalEnvironment": true/false,
  "suspicionScore": 0-100,
  "flags": ["list", "of", "detected", "issues"],
  "summary": "One sentence summary of what you observed in the environment"
}

suspicionScore guide:
- 0-20: Clean environment, no concerns
- 21-50: Minor concerns (cluttered desk, hard to see clearly)
- 51-80: Suspicious (phone visible, papers present)
- 81-100: Clear plagiarism indicators (cheat sheet, second person, second screen actively used)

Be conservative — only flag things you can clearly see. If the video is too dark or blurry, note that in flags.`

    let analysis: EnvVideoAnalysis
    try {
      const { text } = await generateText({
        model: google('gemini-1.5-flash'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'file',
                data: videoBase64,
                mediaType: (mimeType as 'video/webm' | 'video/mp4'),
              },
            ],
          },
        ],
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = JSON.parse(jsonMatch[0])
      analysis = {
        suspicionScore: Number(parsed.suspicionScore) || 0,
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        details: {
          phoneDetected: Boolean(parsed.phoneDetected),
          multiplePersons: Boolean(parsed.multiplePersons),
          cheatSheetDetected: Boolean(parsed.cheatSheetDetected),
          secondScreenDetected: Boolean(parsed.secondScreenDetected),
          normalEnvironment: Boolean(parsed.normalEnvironment),
        },
        summary: parsed.summary || 'Environment analyzed.',
      }
    } catch (e) {
      console.error('[analyze-env-video] Gemini error:', e)
      // Fail open — don't block the assessment if AI fails
      analysis = {
        suspicionScore: 0,
        flags: ['Environment video analysis failed — needs manual review'],
        details: {
          phoneDetected: false,
          multiplePersons: false,
          cheatSheetDetected: false,
          secondScreenDetected: false,
          normalEnvironment: true,
        },
        summary: 'AI analysis failed. Manual review required.',
      }
    }

    console.log(`[analyze-env-video] Score: ${analysis.suspicionScore}, flags: ${analysis.flags.length}`)
    return NextResponse.json({ success: true, analysis })
  } catch (e) {
    console.error('[analyze-env-video]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
