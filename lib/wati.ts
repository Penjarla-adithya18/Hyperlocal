/**
 * WATI utility — calls the Supabase Edge Function `wati` to send
 * WhatsApp notifications and OTP messages.
 *
 * Required env vars (supabase secrets):
 *   WATI_API_URL   - e.g. https://live-mt-server.wati.io/12345
 *   WATI_API_KEY   - Bearer token from WATI dashboard
 *
 * The Edge Function is already deployed at supabase/functions/wati/index.ts
 */

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return { url, key }
}

async function callWati(body: Record<string, unknown>): Promise<{ success: boolean; message?: string }> {
  const { url, key } = getSupabaseEnv()
  if (!url || !key) return { success: false, message: 'Supabase not configured' }

  try {
    const res = await fetch(`${url}/functions/v1/wati`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { success: res.ok, message: data?.message }
  } catch (err) {
    console.error('[WATI] call failed:', err)
    return { success: false, message: String(err) }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Send OTP via WhatsApp (WATI). Returns success + server-generated OTP in dev mode. */
export async function sendWhatsAppOtp(phone: string): Promise<{ success: boolean; message?: string }> {
  return callWati({ action: 'send_otp', phone })
}

/** Verify OTP that was sent via WATI. */
export async function verifyWhatsAppOtp(phone: string, otp: string): Promise<{ success: boolean; message?: string }> {
  return callWati({ action: 'verify_otp', phone, otp })
}

/** Send a WhatsApp notification using a named template. */
export type WatiTemplate =
  | 'otp'
  | 'application_accepted'
  | 'application_rejected'
  | 'new_application'
  | 'job_completed'
  | 'escrow_locked'
  | 'escrow_released'
  | 'trust_score_update'

export async function sendWhatsAppNotification(
  phone: string,
  template: WatiTemplate,
  params: string[]
): Promise<{ success: boolean; message?: string }> {
  return callWati({ action: 'notify', phone, template, params })
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export const wati = {
  /** Worker application was accepted */
  applicationAccepted: (phone: string, workerName: string, jobTitle: string, employerName: string) =>
    sendWhatsAppNotification(phone, 'application_accepted', [workerName, jobTitle, employerName]),

  /** Worker application was rejected */
  applicationRejected: (phone: string, workerName: string, jobTitle: string) =>
    sendWhatsAppNotification(phone, 'application_rejected', [workerName, jobTitle]),

  /** Employer: new application received */
  newApplication: (phone: string, employerName: string, workerName: string, jobTitle: string) =>
    sendWhatsAppNotification(phone, 'new_application', [employerName, workerName, jobTitle]),

  /** Job marked as completed */
  jobCompleted: (phone: string, userName: string, jobTitle: string) =>
    sendWhatsAppNotification(phone, 'job_completed', [userName, jobTitle]),

  /** Escrow payment locked for worker */
  escrowLocked: (phone: string, workerName: string, jobTitle: string, amount: string) =>
    sendWhatsAppNotification(phone, 'escrow_locked', [workerName, jobTitle, amount]),

  /** Escrow payment released to worker */
  escrowReleased: (phone: string, workerName: string, amount: string, jobTitle: string) =>
    sendWhatsAppNotification(phone, 'escrow_released', [workerName, amount, jobTitle]),

  /** Trust score updated */
  trustScoreUpdate: (phone: string, userName: string, newScore: string, level: string) =>
    sendWhatsAppNotification(phone, 'trust_score_update', [userName, newScore, level]),
}
