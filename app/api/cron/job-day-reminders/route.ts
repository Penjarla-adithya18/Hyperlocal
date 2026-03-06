/**
 * GET /api/cron/job-day-reminders
 *
 * Sends an SMS via Twilio to every accepted worker whose job starts TODAY.
 *
 * Trigger options:
 *  • Vercel Cron — add to vercel.json: { "crons": [{ "path": "/api/cron/job-day-reminders", "schedule": "0 6 * * *" }] }
 *  • Any external scheduler (cron-job.org, GitHub Actions, Supabase pg_cron, etc.)
 *
 * Security: caller must pass  Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01'

// ── helpers ──────────────────────────────────────────────────────────────────

function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() ?? '',
    authToken:  process.env.TWILIO_AUTH_TOKEN?.trim() ?? '',
    from:       process.env.TWILIO_PHONE_NUMBER?.trim() ?? '',
  }
}

function toBasicAuth(sid: string, token: string): string {
  return Buffer.from(`${sid}:${token}`).toString('base64')
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').trim()
  if (cleaned.startsWith('+')) return cleaned
  const digits = cleaned.replace(/\D/g, '')
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

function getSupabaseAdmin() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  if (!url || !svcKey) return null
  return createClient(url, svcKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

// ── cron handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── auth ──
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = req.headers.get('authorization') ?? ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { accountSid, authToken, from } = getTwilioConfig()
  if (!accountSid || !authToken || !from) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  // ── today's date as YYYY-MM-DD ──
  const today = new Date().toISOString().split('T')[0]

  // ── 1. jobs starting today ──
  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select('id, title, employer_id')
    .eq('start_date', today)
    .in('status', ['active', 'filled'])

  if (jobsErr) {
    console.error('[cron/job-day-reminders] jobs query error:', jobsErr)
    return NextResponse.json({ error: jobsErr.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No jobs starting today', sent: 0 })
  }

  const jobIds = jobs.map((j: { id: string }) => j.id)

  // ── 2. accepted applications for those jobs ──
  const { data: applications, error: appErr } = await supabase
    .from('applications')
    .select('worker_id, job_id')
    .in('job_id', jobIds)
    .eq('status', 'accepted')

  if (appErr) {
    console.error('[cron/job-day-reminders] applications query error:', appErr)
    return NextResponse.json({ error: appErr.message }, { status: 500 })
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ message: 'No accepted workers for jobs today', sent: 0 })
  }

  // ── 3. worker profiles to get phone numbers ──
  const workerIds = [...new Set(applications.map((a: { worker_id: string }) => a.worker_id))]

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name, phone_number')
    .in('id', workerIds)

  if (profileErr) {
    console.error('[cron/job-day-reminders] profiles query error:', profileErr)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  // ── 4. employer names for the message ──
  const employerIds = [...new Set(jobs.map((j: { employer_id: string }) => j.employer_id))]
  const { data: employers } = await supabase
    .from('profiles')
    .select('id, full_name, company_name')
    .in('id', employerIds)

  const employerMap: Record<string, string> = {}
  for (const emp of (employers ?? [])) {
    employerMap[emp.id] = emp.company_name || emp.full_name || 'the employer'
  }

  // ── 5. build quick-lookups ──
  const jobMap: Record<string, { title: string; employer_id: string }> = {}
  for (const j of jobs) jobMap[j.id] = j

  const profileMap: Record<string, { full_name: string; phone_number: string }> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  // ── 6. send SMS for each accepted worker ──
  const results: { workerId: string; phone: string; status: string }[] = []

  for (const app of applications) {
    const profile = profileMap[app.worker_id]
    if (!profile?.phone_number) {
      results.push({ workerId: app.worker_id, phone: '(none)', status: 'skipped — no phone' })
      continue
    }

    const job = jobMap[app.job_id]
    const workerName = profile.full_name?.split(' ')[0] ?? 'there'
    const jobTitle   = job?.title ?? 'your job'
    const employer   = employerMap[job?.employer_id] ?? 'the employer'

    const body = `📍 Hi ${workerName}! Reminder: Your job "${jobTitle}" at ${employer} is TODAY. Please report on time and give your best. Good luck! - HyperLocal Jobs`

    const to = normalizePhone(profile.phone_number)
    const payload = new URLSearchParams({ To: to, From: from, Body: body })

    try {
      const res = await fetch(`${TWILIO_BASE}/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${toBasicAuth(accountSid, authToken)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        results.push({ workerId: app.worker_id, phone: to, status: `sent (${data.sid})` })
      } else {
        console.error('[cron/job-day-reminders] Twilio error:', data)
        results.push({ workerId: app.worker_id, phone: to, status: `failed: ${data?.message}` })
      }
    } catch (e) {
      console.error('[cron/job-day-reminders] fetch error:', e)
      results.push({ workerId: app.worker_id, phone: to, status: 'error' })
    }
  }

  const sent = results.filter((r) => r.status.startsWith('sent')).length
  console.log(`[cron/job-day-reminders] date=${today} processed=${results.length} sent=${sent}`)

  return NextResponse.json({ date: today, processed: results.length, sent, results })
}
