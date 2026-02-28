/**
 * Supabase Edge Function: email
 *
 * Sends transactional emails using nodemailer.
 * All SMTP credentials are stored as Supabase secrets — never in Next.js env.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   SMTP_HOST        e.g. smtp.gmail.com
 *   SMTP_PORT        e.g. 587
 *   SMTP_USER        sender email address
 *   SMTP_PASS        app password / API key
 *   EMAIL_FROM_NAME  optional, defaults to "HyperLocal Jobs"
 *   SUPABASE_SERVICE_ROLE_KEY  (auto-injected by Supabase)
 *
 * Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Request body:
 *   { to: string, subject: string, html: string, text?: string }
 */

// @ts-ignore — Deno npm: specifier
import nodemailer from 'npm:nodemailer@6'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  // ── Auth: service role key only (server-to-server) ──────────────────────────
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

  if (!serviceKey || bearerToken !== serviceKey) {
    return errorResponse('Unauthorized', 401)
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { to?: unknown; subject?: unknown; html?: unknown; text?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const to      = typeof body?.to      === 'string' ? body.to.trim()      : ''
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const html    = typeof body?.html    === 'string' ? body.html           : ''
  const text    = typeof body?.text    === 'string' ? body.text           : undefined

  if (!to || !subject || !html) {
    return errorResponse('to, subject, and html are required', 400)
  }

  // ── SMTP config from Supabase secrets ────────────────────────────────────────
  const smtpHost = Deno.env.get('SMTP_HOST')?.trim() ?? ''
  const smtpPort = parseInt(Deno.env.get('SMTP_PORT')?.trim() ?? '587', 10)
  const smtpUser = Deno.env.get('SMTP_USER')?.trim() ?? ''
  const smtpPass = Deno.env.get('SMTP_PASS')?.trim() ?? ''
  const fromName = Deno.env.get('EMAIL_FROM_NAME')?.trim() || 'HyperLocal Jobs'

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error('[email] SMTP secrets not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS')
    return errorResponse('Email service not configured', 503)
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  try {
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    const from = `"${fromName}" <${smtpUser}>`

    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })

    console.log(`[email] Sent to ${to} | subject: ${subject} | messageId: ${info.messageId}`)
    return jsonResponse({ success: true, messageId: info.messageId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send failed:', message)
    return errorResponse(`Send failed: ${message}`, 500)
  }
})
