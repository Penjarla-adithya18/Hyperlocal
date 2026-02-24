// Supabase Edge Function: wati
// Handles WhatsApp notifications and OTP via WATI API
// POST { action: 'send_otp', phone }
// POST { action: 'notify', phone, template, params }

import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/auth.ts'

const WATI_API_URL  = Deno.env.get('WATI_API_URL')  ?? ''  // e.g. https://live-mt-server.wati.io/12345
const WATI_API_KEY  = Deno.env.get('WATI_API_KEY')  ?? ''  // Bearer token from WATI dashboard
const OTP_TTL_MS    = 5 * 60 * 1000                        // 5 minutes

// In-memory fallback store — used when otp_verifications table is unavailable
const otpMemStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Normalise to E.164 without + for WATI (WATI expects 91XXXXXXXXXX format)
function normalisePhone(phone: string): string {
  return phone.replace(/^\+/, '')
}

async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (!WATI_API_URL || !WATI_API_KEY) {
    console.log(`[WATI MOCK] Would send to ${phone}: ${message}`)
    return
  }

  const url = `${WATI_API_URL}/api/v1/sendSessionMessage/${normalisePhone(phone)}?messageText=${encodeURIComponent(message)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WATI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[WATI] Send failed:', res.status, text)
    throw new Error(`WATI delivery failed: ${res.status}`)
  }
}

// ── Template messages ─────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (params: string[]) => string> = {
  otp: ([otp]) =>
    `🔐 *HyperLocal Jobs OTP*\n\nYour one-time verification code is:\n\n*${otp}*\n\nThis code expires in 5 minutes.\n\n_Do not share this with anyone._`,

  application_accepted: ([workerName, jobTitle, employerName]) =>
    `✅ *Application Accepted!*\n\nHi ${workerName}, great news!\n\n*${employerName}* has accepted your application for *${jobTitle}*.\n\nOpen the app to chat and confirm your start date. 🎉`,

  application_rejected: ([workerName, jobTitle]) =>
    `📋 *Application Update*\n\nHi ${workerName}, unfortunately your application for *${jobTitle}* was not shortlisted this time.\n\nKeep applying — new jobs are posted daily on HyperLocal Jobs! 💪`,

  new_application: ([employerName, workerName, jobTitle]) =>
    `📩 *New Application Received*\n\nHi ${employerName},\n\n*${workerName}* has applied for your job: *${jobTitle}*\n\nLogin to review the application and match score. 👀`,

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

      const message = TEMPLATES.otp([otp])
      await sendWhatsAppMessage(phone, message)

      // Always return OTP in response so it can be displayed on screen in dev/demo mode
      return jsonResponse({ success: true, otp, message: `OTP generated for ${phone}` })
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
    if (action === 'notify') {
      const { template, params = [] } = body
      if (!template || !TEMPLATES[template]) {
        return errorResponse(`Unknown template: ${template}`, 400)
      }

      const message = TEMPLATES[template](params)
      await sendWhatsAppMessage(phone, message)
      return jsonResponse({ success: true, message: 'Notification sent via WhatsApp' })
    }

    return errorResponse(`Unknown action: ${action}`, 400)

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[WATI]', msg)
    return errorResponse(msg, 500)
  }
})
