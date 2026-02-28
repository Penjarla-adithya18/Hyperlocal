/**
 * Email service for HyperLocal Jobs
 * Powered by a Supabase edge function (supabase/functions/email/index.ts).
 *
 * SMTP credentials live exclusively in Supabase secrets — never in Next.js env.
 * Set them once via:
 *   supabase secrets set SMTP_HOST=smtp.gmail.com
 *   supabase secrets set SMTP_PORT=587
 *   supabase secrets set SMTP_USER=you@gmail.com
 *   supabase secrets set SMTP_PASS=your-app-password
 *   supabase secrets set EMAIL_FROM_NAME="HyperLocal Jobs"
 *
 * The only key needed locally / in Vercel env:
 *   SUPABASE_SERVICE_ROLE_KEY  — authenticates the server→edge-function call
 */

// ── Shared HTML shell ─────────────────────────────────────────────────────────

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width:560px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#10b981,#3b82f6); padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px; }
    .header p  { color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:13px; }
    .body   { padding:32px; }
    .body p { color:#374151; font-size:15px; line-height:1.6; margin:0 0 16px; }
    .otp-box { background:#f0fdf4; border:2px dashed #10b981; border-radius:10px; text-align:center; padding:20px; margin:24px 0; }
    .otp-box .code { font-size:38px; font-weight:800; letter-spacing:8px; color:#10b981; font-family:monospace; }
    .otp-box .expiry { color:#6b7280; font-size:13px; margin-top:8px; }
    .cta { display:block; background:linear-gradient(135deg,#10b981,#3b82f6); color:#fff!important; text-decoration:none; text-align:center; padding:14px 24px; border-radius:8px; font-size:15px; font-weight:600; margin:24px 0 0; }
    .divider { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
    .footer { background:#f9fafb; text-align:center; padding:16px 32px; color:#9ca3af; font-size:12px; }
    .alert { background:#fff7ed; border-left:4px solid #f59e0b; border-radius:4px; padding:12px 16px; color:#92400e; font-size:13px; margin:16px 0; }
    .badge { display:inline-block; background:#ecfdf5; color:#065f46; border-radius:999px; padding:3px 10px; font-size:12px; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🏙️ HyperLocal Jobs</h1>
      <p>Connecting local talent with local opportunity</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} HyperLocal Jobs &bull; India &bull;
      <a href="#" style="color:#9ca3af;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`
}

// ── Email templates ───────────────────────────────────────────────────────────

export function otpEmailHtml(otp: string, purpose: 'signup' | 'login' | 'phone-change' | 'forgot-password' = 'signup'): string {
  const purposeLabel: Record<typeof purpose, string> = {
    signup: 'verify your phone number during sign-up',
    login: 'complete your login via email OTP',
    'phone-change': 'verify your new phone number',
    'forgot-password': 'reset your password',
  }
  return wrapEmail('Your OTP Code', `
    <p>Hi there 👋</p>
    <p>Use the code below to ${purposeLabel[purpose]}:</p>
    <div class="otp-box">
      <div class="code">${otp}</div>
      <div class="expiry">Expires in <strong>10 minutes</strong></div>
    </div>
    <div class="alert">
      🔒 <strong>Never share this code.</strong> HyperLocal Jobs will never ask for it via call or chat.
    </div>
    <hr class="divider" />
    <p style="font-size:13px;color:#9ca3af;">If you didn't request this code, you can safely ignore this email.</p>
  `)
}

export function welcomeEmailHtml(fullName: string, role: 'worker' | 'employer'): string {
  const roleLabel = role === 'worker' ? 'Worker' : 'Employer'
  const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hyperlocalJobs.in'}/${role}/dashboard`
  const nextSteps = role === 'worker'
    ? `<ul style="color:#374151;font-size:14px;line-height:2;padding-left:18px;">
        <li>Complete your profile &amp; upload your resume</li>
        <li>Browse local job listings near you</li>
        <li>Apply with one tap and chat with employers</li>
        <li>Get paid securely via escrow</li>
      </ul>`
    : `<ul style="color:#374151;font-size:14px;line-height:2;padding-left:18px;">
        <li>Post your first job listing (free)</li>
        <li>AI-match candidates to your requirements</li>
        <li>Chat with applicants directly</li>
        <li>Release payment once job is done</li>
      </ul>`
  return wrapEmail('Welcome to HyperLocal Jobs!', `
    <p>Hi <strong>${fullName}</strong> 🎉</p>
    <p>Welcome aboard! Your <span class="badge">${roleLabel}</span> account has been created successfully.</p>
    <p>Here's what you can do next:</p>
    ${nextSteps}
    <a class="cta" href="${ctaUrl}">Go to Dashboard →</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#6b7280;">Need help? Reply to this email or visit our support page.</p>
  `)
}

export function loginAlertEmailHtml(fullName: string, ipHint?: string): string {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  return wrapEmail('New Login to Your Account', `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>A new login was detected on your HyperLocal Jobs account:</p>
    <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td><strong>${time} IST</strong></td></tr>
      ${ipHint ? `<tr><td style="padding:6px 0;color:#6b7280;">IP</td><td><strong>${ipHint}</strong></td></tr>` : ''}
    </table>
    <div class="alert">
      If this wasn't you, <strong>immediately change your password</strong> via the app settings.
    </div>
  `)
}

export function passwordResetEmailHtml(fullName: string): string {
  return wrapEmail('Password Reset Successful', `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Your HyperLocal Jobs account password was successfully reset.</p>
    <div class="alert">
      If you did not perform this action, please contact support immediately and secure your account.
    </div>
  `)
}

export function applicationStatusEmailHtml(
  workerName: string,
  jobTitle: string,
  employerName: string,
  status: 'accepted' | 'rejected'
): string {
  if (status === 'accepted') {
    const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hyperlocalJobs.in'}/worker/chat`
    return wrapEmail('Application Accepted! 🎉', `
      <p>Hi <strong>${workerName}</strong> 🎉</p>
      <p>Great news! <strong>${employerName}</strong> has accepted your application for:</p>
      <p style="font-size:18px;font-weight:700;color:#10b981;margin:16px 0;">${jobTitle}</p>
      <p>Open the app to chat with the employer and confirm your start date.</p>
      <a class="cta" href="${ctaUrl}">Open Chat →</a>
    `)
  }
  return wrapEmail('Application Update', `
    <p>Hi <strong>${workerName}</strong>,</p>
    <p>Thank you for applying to <strong>${jobTitle}</strong>.</p>
    <p>Unfortunately, the employer has moved forward with other candidates this time.</p>
    <p>Don't be discouraged — new jobs are posted every day on HyperLocal Jobs!</p>
    <a class="cta" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hyperlocalJobs.in'}/worker/jobs">Browse More Jobs →</a>
  `)
}

// ── Core send function ────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string   // plain-text fallback (auto-stripped from HTML if not provided)
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  // Dev fallback: if not configured, log to console and treat as success
  if (!supabaseUrl || !serviceKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL DEV] To: ${payload.to} | Subject: ${payload.subject}`)
      console.log('[EMAIL DEV] Set SUPABASE_SERVICE_ROLE_KEY in .env.local to send real emails.')
    }
    return { success: true, messageId: 'dev-mock' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to:      payload.to,
        subject: payload.subject,
        html:    payload.html,
        text:    payload.text,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      const error = body.error ?? `Edge function responded with ${res.status}`
      console.error('[EMAIL] Edge function error:', error)
      return { success: false, error }
    }

    const data = await res.json() as { success: boolean; messageId?: string }
    return { success: data.success, messageId: data.messageId }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error('[EMAIL] Send failed:', error)
    return { success: false, error }
  }
}

// ── High-level helpers ────────────────────────────────────────────────────────

/** Send an OTP email for phone verification / password reset */
export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: Parameters<typeof otpEmailHtml>[1] = 'signup'
) {
  return sendEmail({
    to,
    subject: `${otp} is your HyperLocal Jobs OTP`,
    html: otpEmailHtml(otp, purpose),
  })
}

/** Send welcome email after successful registration */
export async function sendWelcomeEmail(to: string, fullName: string, role: 'worker' | 'employer') {
  return sendEmail({
    to,
    subject: `Welcome to HyperLocal Jobs, ${fullName}! 🎉`,
    html: welcomeEmailHtml(fullName, role),
  })
}

/** Send login alert email */
export async function sendLoginAlertEmail(to: string, fullName: string, ip?: string) {
  return sendEmail({
    to,
    subject: 'New login to your HyperLocal Jobs account',
    html: loginAlertEmailHtml(fullName, ip),
  })
}

/** Send password reset confirmation */
export async function sendPasswordResetEmail(to: string, fullName: string) {
  return sendEmail({
    to,
    subject: 'Your HyperLocal Jobs password was reset',
    html: passwordResetEmailHtml(fullName),
  })
}

/** Send application status update */
export async function sendApplicationStatusEmail(
  to: string,
  workerName: string,
  jobTitle: string,
  employerName: string,
  status: 'accepted' | 'rejected'
) {
  const subject = status === 'accepted'
    ? `✅ Application accepted for ${jobTitle}`
    : `Application update for ${jobTitle}`
  return sendEmail({
    to,
    subject,
    html: applicationStatusEmailHtml(workerName, jobTitle, employerName, status),
  })
}
