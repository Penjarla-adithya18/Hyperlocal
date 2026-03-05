/**
 * POST /api/notifications/job-match
 *
 * Called (fire-and-forget from the client) when a new job goes active.
 * Fetches all worker profiles, scores each against the job, and sends
 * an SMS via Twilio to every worker who scores >= MATCH_THRESHOLD.
 *
 * All work is done synchronously before responding so Vercel's serverless
 * runtime does not terminate the function mid-execution.
 * The calling client already fire-and-forgets this request.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMatchScore } from '@/lib/aiMatching'
import { Job, WorkerProfile } from '@/lib/types'

const MATCH_THRESHOLD = 25
const MAX_SMS_BATCH   = 100
const TWILIO_BASE     = 'https://api.twilio.com/2010-04-01'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
           ?? ''
  return createClient(url, key)
}

function getTwilio() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? '',
    authToken:  process.env.TWILIO_AUTH_TOKEN?.trim() ?? '',
    from:       process.env.TWILIO_PHONE_NUMBER?.trim() ?? '',
  }
}

function toBasicAuth(sid: string, token: string) {
  return Buffer.from(`${sid}:${token}`).toString('base64')
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith('+')) return raw.replace(/\s/g, '')
  return `+${digits}`
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  try {
    const { accountSid, authToken, from } = getTwilio()
    if (!accountSid || !authToken || !from) {
      console.warn('[job-match] Twilio not configured — skipping SMS')
      return false
    }
    const payload = new URLSearchParams({ To: toE164(phone), From: from, Body: message })
    const res = await fetch(`${TWILIO_BASE}/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBasicAuth(accountSid, authToken)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[job-match] Twilio error ${res.status}:`, text.substring(0, 200))
    } else {
      console.log(`[job-match] Twilio sent to ${toE164(phone)}`)
    }
    return res.ok
  } catch (err) {
    console.error('[job-match] sendSms threw:', err)
    return false
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const job = body?.job as Job | undefined

    if (!job?.id) {
      return NextResponse.json({ success: false, message: 'Job data required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Step 1: fetch all worker profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('worker_profiles')
      .select('user_id, skills, categories, location, availability, experience')
      .limit(500)

    if (profilesError) {
      console.error('[job-match] worker_profiles fetch error:', profilesError)
      return NextResponse.json({ success: false, message: 'DB error' }, { status: 500 })
    }

    console.log(`[job-match] fetched ${profiles?.length ?? 0} worker profiles for job "${job.title}"`)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No worker profiles found', sent: 0 })
    }
    const matches: { userId: string; score: number }[] = []
    for (const row of profiles) {
      const profile: WorkerProfile = {
        userId:       row.user_id,
        skills:       row.skills ?? [],
        categories:   row.categories ?? [],
        location:     row.location ?? '',
        availability: row.availability ?? '',
        experience:   row.experience ?? '',
      }
      const score = calculateMatchScore(profile, job)
      if (score >= MATCH_THRESHOLD) {
        matches.push({ userId: row.user_id, score })
      }
    }

    console.log(`[job-match] ${matches.length} workers scored >= ${MATCH_THRESHOLD}`)

    if (matches.length === 0) {
      return NextResponse.json({ success: true, message: 'No matching workers', sent: 0 })
    }

    // Step 3: fetch phone numbers for matched workers only
    const userIds = matches.slice(0, MAX_SMS_BATCH).map(m => m.userId)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, phone_number')
      .in('id', userIds)

    if (usersError) {
      console.error('[job-match] users fetch error:', usersError)
      return NextResponse.json({ success: false, message: 'DB error fetching users' }, { status: 500 })
    }

    console.log(`[job-match] fetched ${users?.length ?? 0} user records`)

    const userMap = new Map((users ?? []).map(u => [u.id, u]))

    // Step 4: send SMS to each matched worker
    let sent = 0
    for (const { userId, score } of matches.slice(0, MAX_SMS_BATCH)) {
      const user = userMap.get(userId)
      if (!user?.phone_number) {
        console.warn(`[job-match] no phone for userId=${userId}`)
        continue
      }

      const name = user.full_name ?? 'there'
      const pay = job.payAmount ? `Rs.${job.payAmount}` : ''
      const loc = job.location ? ` in ${job.location}` : ''

      const message =
        `Hi ${name}! Great news — a new job that suits your profile has just been posted on HyperLocal.\n` +
        `Job: "${job.title}"${loc}\n` +
        `${pay ? `Pay: ${pay}\n` : ''}` +
        `Match Score: ${Math.round(score)}% - This job is suitable for you!\n` +
        `Don't miss out — open HyperLocal and apply before the slots are filled. - HyperLocal Jobs`

      const ok = await sendSms(user.phone_number, message)
      if (ok) {
        sent++
      }
    }

    console.log(`[job-match] Done — ${sent}/${matches.length} SMS sent for job "${job.title}"`)
    return NextResponse.json({ success: true, sent, matched: matches.length })

  } catch (err) {
    console.error('[job-match] unhandled error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
