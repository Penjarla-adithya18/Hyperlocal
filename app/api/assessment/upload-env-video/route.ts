import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://yecelpnlaruavifzxunw.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const session  = form.get('session') as string
    const workerId = form.get('workerId') as string
    const skill    = (form.get('skill') as string) || 'env'
    const videoFile = form.get('video') as File | null

    if (!videoFile || !session) {
      return NextResponse.json({ error: 'video and session are required' }, { status: 400 })
    }

    const buf = Buffer.from(await videoFile.arrayBuffer())
    const mime = videoFile.type || 'video/webm'
    const ext = mime.includes('mp4') ? 'mp4' : 'webm'
    const fileName = `env-assessments/${workerId || 'unknown'}/${session}_${skill.replace(/\s+/g, '_')}_${Date.now()}.${ext}`

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/uploads/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': mime,
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: buf,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('[upload-env-video] Storage error:', err)
      return NextResponse.json({ error: 'Upload failed', detail: err }, { status: 500 })
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/uploads/${fileName}`
    return NextResponse.json({ success: true, url })
  } catch (e) {
    console.error('[upload-env-video]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
