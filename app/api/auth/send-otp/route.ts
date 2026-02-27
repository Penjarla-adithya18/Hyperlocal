import { NextRequest, NextResponse } from 'next/server'

const VERIFY_BASE_URL = 'https://verify.twilio.com/v2'

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? ''
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? ''
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? ''
  const defaultCountryCode = process.env.OTP_DEFAULT_COUNTRY_CODE?.trim() || '+91'

  return { accountSid, authToken, serviceSid, defaultCountryCode }
}

function normalizePhone(rawPhone: string, defaultCountryCode: string): string {
  const cleaned = rawPhone.replace(/\s+/g, '').trim()
  if (!cleaned) return ''
  if (cleaned.startsWith('+')) return cleaned
  const digits = cleaned.replace(/\D/g, '')
  if (!digits) return ''
  return `${defaultCountryCode}${digits}`
}

function toBasicAuth(accountSid: string, authToken: string): string {
  return Buffer.from(`${accountSid}:${authToken}`).toString('base64')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : ''

    const { accountSid, authToken, serviceSid, defaultCountryCode } = getTwilioConfig()
    if (!accountSid || !authToken || !serviceSid) {
      return NextResponse.json(
        { success: false, message: 'OTP service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const to = normalizePhone(phone, defaultCountryCode)
    if (!to) {
      return NextResponse.json({ success: false, message: 'Invalid phone number.' }, { status: 400 })
    }

    const endpoint = `${VERIFY_BASE_URL}/Services/${serviceSid}/Verifications`
    const payload = new URLSearchParams({
      To: to,
      Channel: 'sms',
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${toBasicAuth(accountSid, authToken)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = typeof data?.message === 'string' ? data.message : 'Failed to send OTP. Please try again.'
      return NextResponse.json({ success: false, message }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully.',
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to send OTP. Please try again.' }, { status: 500 })
  }
}
