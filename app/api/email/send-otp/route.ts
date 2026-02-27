/**
 * POST /api/email/send-otp
 * Generates a 6-digit OTP, stores it in memory (5 min TTL), and emails it.
 * Body: { email: string, purpose?: 'signup'|'login'|'phone-change'|'forgot-password' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email'

// ── In-memory OTP store (per email address) ───────────────────────────────────
//    For production with multiple instances, swap this for a Redis / Supabase KV store.
interface OtpEntry { otp: string; expiresAt: number; attempts: number }
const otpStore = new Map<string, OtpEntry>()

const OTP_TTL_MS   = 10 * 60 * 1000  // 10 minutes
const MAX_ATTEMPTS = 5

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email   = typeof body?.email   === 'string' ? body.email.trim().toLowerCase()   : ''
    const purpose = typeof body?.purpose === 'string' ? body.purpose : 'signup'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email address.' }, { status: 400 })
    }

    const otp       = generateOtp()
    const expiresAt = Date.now() + OTP_TTL_MS
    otpStore.set(email, { otp, expiresAt, attempts: 0 })

    const result = await sendOtpEmail(email, otp, purpose as Parameters<typeof sendOtpEmail>[2])

    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Failed to send OTP email. Please try again.' }, { status: 500 })
    }

    // In dev, return the OTP so you can test without a real SMTP server
    const devOtp = process.env.NODE_ENV !== 'production' ? otp : undefined

    return NextResponse.json({ success: true, message: `OTP sent to ${email}`, ...(devOtp && { otp: devOtp }) })
  } catch (err) {
    console.error('[email/send-otp]', err)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}

// ── Verify endpoint (same file, separate export) ──────────────────────────────
// Call:  POST /api/email/send-otp  with body { action: 'verify', email, otp }

export async function PUT(req: NextRequest) {
  try {
    const body  = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code  = typeof body?.otp   === 'string' ? body.otp.trim()                : ''

    if (!email || !code) {
      return NextResponse.json({ success: false, message: 'email and otp are required.' }, { status: 400 })
    }

    const entry = otpStore.get(email)
    if (!entry) {
      return NextResponse.json({ success: false, message: 'No OTP found for this email. Please request a new one.' }, { status: 400 })
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email)
      return NextResponse.json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 400 })
    }

    entry.attempts += 1
    if (entry.attempts > MAX_ATTEMPTS) {
      otpStore.delete(email)
      return NextResponse.json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' }, { status: 429 })
    }

    if (entry.otp !== code) {
      return NextResponse.json({ success: false, message: `Incorrect OTP. ${MAX_ATTEMPTS - entry.attempts} attempts remaining.` }, { status: 400 })
    }

    otpStore.delete(email)
    return NextResponse.json({ success: true, message: 'Email verified successfully.' })
  } catch (err) {
    console.error('[email/verify-otp]', err)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
