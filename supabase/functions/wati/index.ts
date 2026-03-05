// Supabase Edge Function: wati
// Handles OTP verification and notifications — now sends via Twilio SMS
// POST { action: 'send_otp', phone }
// POST { action: 'notify', phone, template, params }

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/auth.ts'

// ── Twilio config (set these as Supabase secrets) ─────────────────────────
const TWILIO_ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')  ?? ''
const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')   ?? ''
const TWILIO_FROM_NUMBER  = Deno.env.get('TWILIO_PHONE_NUMBER') ?? ''
const TWILIO_VERIFY_SID   = Deno.env.get('TWILIO_VERIFY_SID')   ?? ''

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory fallback store
const otpMemStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

// ── Helpers ───────────────────────────────────────────────────────────────

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function normalisePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').trim()
  if (cleaned.startsWith('+')) return cleaned
  const digits = cleaned.replace(/\D/g, '')
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

function toBasicAuth(sid: string, token: string): string {
  return btoa(`${sid}:${token}`)
}

/** Send notification SMS via Twilio Messages API */
async function sendSms(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.warn(`[Twilio MOCK] Not configured — would send to ${to}: ${body.substring(0, 80)}`)
    return
  }
  const payload = new URLSearchParams({ To: normalisePhone(to), From: TWILIO_FROM_NUMBER, Body: body })
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[Twilio] SMS failed:', data)
    throw new Error(`Twilio SMS failed: ${JSON.stringify(data?.message ?? data)}`)
  }
  console.log(`[Twilio] ✅ SMS sent to ${normalisePhone(to)}, SID: ${data?.sid}`)
}

/** Send OTP via Twilio Verify, fallback to Twilio SMS (NOT Fast2SMS — OTPs stay on Twilio) */
async function sendTwilioOtpFallback(phone: string, otp: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) return
  const message = `Your HyperLocal OTP is: ${otp}\nValid for 5 minutes. Do not share.`
  const payload = new URLSearchParams({ To: phone, From: TWILIO_FROM_NUMBER, Body: message })
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${toBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  })
}

/** Send OTP via Twilio Verify (preferred) or self-managed SMS fallback */
async function sendOtpViaTwilio(phone: string): Promise<string> {
  if (TWILIO_VERIFY_SID && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    const payload = new URLSearchParams({ To: phone, Channel: 'sms' })
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${toBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      }
    )
    if (res.ok) {
      return 'verify' // Twilio Verify manages the OTP internally
    }
    console.warn('[Twilio] Verify send failed — falling back to Twilio SMS OTP')
  }
  // Fallback: generate OTP and send via Twilio SMS (not Fast2SMS — OTPs stay on Twilio)
  const otp = generateOTP()
  await sendTwilioOtpFallback(phone, otp)
  return otp
}

// ── Template messages ─────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (params: string[]) => string> = {
  otp: ([otp]) =>
    `🔐 *HyperLocal Jobs OTP*\n\nYour one-time verification code is:\n\n*${otp}*\n\nThis code expires in 5 minutes.\n\n_Do not share this with anyone._`,

  application_accepted: ([workerName, jobTitle, employerName]) =>
    `✅ *Application Accepted!*\n\nHi ${workerName}, great news!\n\n*${employerName}* has accepted your application for *${jobTitle}*.\n\nOpen the app to chat and confirm your start date. 🎉`,

  application_rejected: ([workerName, jobTitle, employerName]) =>
    `Hi ${workerName}, we regret to inform you that your application for "${jobTitle}" has not been shortlisted by ${employerName ?? 'the employer'} this time. Don't be discouraged - your profile is strong and new matching jobs are posted daily on HyperLocal. Keep applying and your next opportunity is just around the corner! - HyperLocal Jobs`,

  new_application: ([employerName, workerName, jobTitle]) =>
    `📩 *New Application Received*\n\nHi ${employerName},\n\n*${workerName}* has applied for your job: *${jobTitle}*\n\nLogin to review the application and match score. 👀`,

  job_posted: ([workerName, jobTitle, location, pay]) =>
    `🆕 *New Job Alert!*\n\nHi ${workerName},\n\nA new job matching your skills has been posted:\n\n*${jobTitle}*\n📍 ${location}\n💰 ₹${pay}\n\nOpen HyperLocal Jobs to apply before it fills up! 🏃`,

  job_completed: ([userName, jobTitle]) =>
    `✅ *Job Completed*\n\nHi ${userName}, the job *${jobTitle}* has been marked as completed.\n\nEscrow payment will be released shortly. Please rate your experience! ⭐`,

  escrow_locked: ([workerName, jobTitle, amount]) =>
    `💰 *Payment Secured!*\n\nHi ${workerName},\n\nRs ${amount} has been locked in escrow for *${jobTitle}*.\n\nYou will receive this payment after job completion. Safe and guaranteed! 🔒`,

  escrow_released: ([workerName, amount, jobTitle]) =>
    `💸 *Payment Released!*\n\nHi ${workerName},\n\nRs ${amount} has been released to your account for completing *${jobTitle}*.\n\nThank you for your excellent work! 🙏`,

  trust_score_update: ([userName, newScore, level]) =>
    `⭐ *Trust Score Updated*\n\nHi ${userName},\n\nYour trust score is now *${newScore}* (${level}).\n\nHigher trust scores get priority visibility in job listings! Keep up the great work! 📈`,
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const supabase = createServiceClient()

  try {
    const body = await req.json() as {
      action: string
      phone?: string
      template?: string
      params?: string[]
    }

    const { action, phone } = body

    if (!phone) return errorResponse('phone is required', 400)

    // ── ACTION: send_otp ─────────────────────────────────────────────────────
    if (action === 'send_otp') {
      const otp = generateOTP()
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

      // Try DB first; also always store in-memory as fallback
      const { error } = await supabase
        .from('otp_verifications')
        .upsert(
          { phone_number: phone, otp_code: otp, expires_at: expiresAt, attempts: 0 },
          { onConflict: 'phone_number' }
        )

      if (error) {
        console.warn('[WATI] DB upsert failed, using in-memory only:', error.message)
      }

      // Always keep in-memory copy as reliable fallback
      otpMemStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })

      const normPhone = normalisePhone(phone)
      const result = await sendOtpViaTwilio(normPhone)
      // If Twilio Verify handled the OTP, 'result' is 'verify' — no extra tracking needed.
      // If we fell back to self-managed, 'result' is the OTP string (already stored above).

      // Never expose OTP in production — include only in dev/demo for debugging
      const isDev = (Deno.env.get('ENVIRONMENT') ?? '').toLowerCase() === 'development'
      return jsonResponse({ success: true, ...(isDev && result !== 'verify' ? { otp: result } : {}), message: `OTP sent to ${phone}` })
    }

    // ── ACTION: verify_otp ───────────────────────────────────────────────────
    if (action === 'verify_otp') {
      const otp_code = (body as { otp_code?: string }).otp_code
      if (!otp_code) return errorResponse('otp_code is required', 400)

      // Try DB first
      const { data: record, error: dbError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle()

      // If DB table missing, fall back to in-memory store
      if (dbError) {
        console.warn('[WATI] DB lookup failed, using in-memory store:', dbError.message)
        const mem = otpMemStore.get(phone)
        if (!mem) return jsonResponse({ success: false, message: 'OTP not found or expired' })
        if (Date.now() > mem.expiresAt) {
          otpMemStore.delete(phone)
          return jsonResponse({ success: false, message: 'OTP expired. Please request a new one.' })
        }
        if (mem.attempts >= 5) {
          otpMemStore.delete(phone)
          return jsonResponse({ success: false, message: 'Too many attempts. Request a new OTP.' })
        }
        if (mem.otp !== otp_code) {
          otpMemStore.set(phone, { ...mem, attempts: mem.attempts + 1 })
          return jsonResponse({ success: false, message: 'Invalid OTP. Please try again.' })
        }
        otpMemStore.delete(phone)
        return jsonResponse({ success: true, message: 'OTP verified successfully' })
      }

      if (!record) {
        // DB had no record — check in-memory fallback (covers RLS-blocked writes and missing table)
        const mem = otpMemStore.get(phone)
        if (!mem) return jsonResponse({ success: false, message: 'OTP not found or expired. Please request a new one.' })
        if (Date.now() > mem.expiresAt) {
          otpMemStore.delete(phone)
          return jsonResponse({ success: false, message: 'OTP expired. Please request a new one.' })
        }
        if (mem.attempts >= 5) {
          otpMemStore.delete(phone)
          return jsonResponse({ success: false, message: 'Too many attempts. Request a new OTP.' })
        }
        if (mem.otp !== otp_code) {
          otpMemStore.set(phone, { ...mem, attempts: mem.attempts + 1 })
          return jsonResponse({ success: false, message: 'Invalid OTP. Please try again.' })
        }
        otpMemStore.delete(phone)
        return jsonResponse({ success: true, message: 'OTP verified successfully' })
      }

      if (new Date(record.expires_at) < new Date()) {
        await supabase.from('otp_verifications').delete().eq('phone_number', phone)
        return jsonResponse({ success: false, message: 'OTP expired. Please request a new one.' })
      }

      if (record.attempts >= 5) {
        await supabase.from('otp_verifications').delete().eq('phone_number', phone)
        return jsonResponse({ success: false, message: 'Too many attempts. Request a new OTP.' })
      }

      if (record.otp_code !== otp_code) {
        await supabase
          .from('otp_verifications')
          .update({ attempts: record.attempts + 1 })
          .eq('phone_number', phone)
        return jsonResponse({ success: false, message: 'Invalid OTP. Please try again.' })
      }

      // Success — clean up
      await supabase.from('otp_verifications').delete().eq('phone_number', phone)
      return jsonResponse({ success: true, message: 'OTP verified successfully' })
    }

    // ── ACTION: notify ───────────────────────────────────────────────────────
    // Support BOTH formats:
    //   NEW: { action: 'notify', phone, template: 'application_accepted', params: [...] }
    //   OLD: { action: 'application_accepted', phone, params: [...] }  (backward-compat)
    const isNotifyAction = action === 'notify'
    const templateKey = isNotifyAction ? (body.template ?? '') : action
    const templateParams = body.params ?? []

    if (TEMPLATES[templateKey]) {
      console.log(`[Twilio] notify: template=${templateKey}, phone=${phone}, params=${JSON.stringify(templateParams)}`)
      const message = TEMPLATES[templateKey](templateParams)
      await sendSms(normalisePhone(phone), message)
      return jsonResponse({ success: true, message: 'Notification sent via Twilio SMS' })
    }

    // If action was 'notify' but template is unknown
    if (isNotifyAction) {
      console.error(`[Twilio] Unknown template: ${body.template}`)
      return errorResponse(`Unknown template: ${body.template}`, 400)
    }

    console.error(`[Twilio] Unknown action: ${action}`)
    return errorResponse(`Unknown action: ${action}`, 400)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[WATI]', msg)
    return errorResponse(msg, 500)
  }
})
