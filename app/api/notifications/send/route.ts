/**
 * POST /api/notifications/send
 * Sends platform notification SMS via Twilio.
 * OTPs are handled separately by /api/auth/send-otp (Twilio Verify).
 */
import { NextRequest, NextResponse } from 'next/server'

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01'

type NotificationTemplate =
  | 'application_accepted'
  | 'application_rejected'
  | 'new_application'
  | 'job_completed'
  | 'escrow_locked'
  | 'escrow_released'
  | 'trust_score_update'

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

function buildMessage(template: NotificationTemplate, params: string[]): string {
  const [p0, p1, p2, p3] = params
  switch (template) {
    case 'application_accepted':
      return `Hi ${p0 ?? 'there'}! Great news — your application for "${p1 ?? 'the job'}" has been ACCEPTED by ${p2 ?? 'the employer'}. Open HyperLocal to view details. 🎉`
    case 'application_rejected':
      return `Hi ${p0 ?? 'there'}, we regret to inform you that your application for "${p1 ?? 'the job'}" has not been shortlisted by ${p2 ?? 'the employer'} this time. Don't be discouraged — your profile is strong and new matching jobs are posted daily on HyperLocal. Keep applying and your next opportunity is just around the corner! - HyperLocal Jobs`
    case 'new_application':
      return `Hi ${p0 ?? 'Employer'}, you have a new application from ${p1 ?? 'a worker'} for your job "${p2 ?? 'your posting'}". Open HyperLocal to review it.`
    case 'job_completed':
      return `Hi ${p0 ?? 'there'}, the job "${p1 ?? 'your job'}" has been marked as completed on HyperLocal. Thank you!`
    case 'escrow_locked':
      return `Hi ${p0 ?? 'there'}, ₹${p1 ?? '0'} has been locked in escrow for your job "${p2 ?? 'the job'}". Payment is secured — complete the work to get paid!`
    case 'escrow_released':
      return `Hi ${p0 ?? 'there'}, ₹${p1 ?? '0'} has been released to your account for completing "${p2 ?? 'the job'}". Great work! 💰`
    case 'trust_score_update':
      return `Hi ${p0 ?? 'there'}, your HyperLocal Trust Score has been updated to ${p1 ?? 'N/A'} (Level: ${p2 ?? 'N/A'}). Keep up the great work!`
    default:
      return `You have a new notification from HyperLocal Jobs. Open the app for details.`
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const template = body?.template as NotificationTemplate
    const rawPhone  = typeof body?.phoneNumber === 'string' ? body.phoneNumber : ''
    const params    = Array.isArray(body?.params) ? body.params as string[] : []

    const { accountSid, authToken, from } = getTwilioConfig()

    const message = buildMessage(template, params)

    if (!accountSid || !authToken || !from) {
      console.warn('[notifications/send] Twilio not configured — skipping SMS')
      return NextResponse.json({ success: false, message: 'No SMS provider configured' }, { status: 503 })
    }

    const to = normalizePhone(rawPhone)
    if (!to || to.length < 10) {
      return NextResponse.json({ success: false, message: 'Invalid phone number' }, { status: 400 })
    }

    const payload = new URLSearchParams({ To: to, From: from, Body: message })
    const response = await fetch(`${TWILIO_BASE}/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBasicAuth(accountSid, authToken)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('[notifications/send] Twilio error:', data)
      return NextResponse.json({ success: false, message: data?.message ?? 'Failed to send SMS' }, { status: response.status })
    }
    return NextResponse.json({ success: true, provider: 'twilio', sid: data.sid })
  } catch (err) {
    console.error('[notifications/send] error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
