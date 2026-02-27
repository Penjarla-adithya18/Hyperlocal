/**
 * POST /api/email/transactional
 * Sends templated transactional emails: welcome, login-alert, password-reset, application-status.
 *
 * Body (discriminated union):
 *   { type: 'welcome',              to, fullName, role }
 *   { type: 'login-alert',          to, fullName, ip? }
 *   { type: 'password-reset',       to, fullName }
 *   { type: 'application-status',   to, workerName, jobTitle, employerName, status: 'accepted'|'rejected' }
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendApplicationStatusEmail,
} from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, to } = body

    if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      return NextResponse.json({ success: false, message: 'Invalid or missing "to" email.' }, { status: 400 })
    }

    let result: { success: boolean; error?: string }

    switch (type) {
      case 'welcome': {
        const { fullName, role } = body
        if (!fullName || !role) return NextResponse.json({ success: false, message: 'fullName and role are required.' }, { status: 400 })
        result = await sendWelcomeEmail(to.trim(), fullName, role)
        break
      }

      case 'login-alert': {
        const { fullName, ip } = body
        if (!fullName) return NextResponse.json({ success: false, message: 'fullName is required.' }, { status: 400 })
        result = await sendLoginAlertEmail(to.trim(), fullName, ip)
        break
      }

      case 'password-reset': {
        const { fullName } = body
        if (!fullName) return NextResponse.json({ success: false, message: 'fullName is required.' }, { status: 400 })
        result = await sendPasswordResetEmail(to.trim(), fullName)
        break
      }

      case 'application-status': {
        const { workerName, jobTitle, employerName, status } = body
        if (!workerName || !jobTitle || !employerName || !status) {
          return NextResponse.json({ success: false, message: 'workerName, jobTitle, employerName, status are required.' }, { status: 400 })
        }
        result = await sendApplicationStatusEmail(to.trim(), workerName, jobTitle, employerName, status)
        break
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown email type: "${type}".` }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error ?? 'Email delivery failed.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Email sent.' })
  } catch (err) {
    console.error('[email/transactional]', err)
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
  }
}
