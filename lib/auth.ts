// lib/auth.ts – thin wrapper over Supabase Edge Functions
import { User, UserRole } from './types'
import {
  registerUser as apiRegister,
  loginUser as apiLogin,
  resetPassword as apiResetPassword,
  forgotPasswordReset as apiForgotPasswordReset,
  sendOtpRequest as apiSendOtp,
  verifyOtpRequest as apiVerifyOtp,
  getCurrentUser,
  setCurrentUser,
  logout,
  isAuthenticated,
  getUserPassword,
  setUserPassword,
} from './api'

export {
  getCurrentUser,
  setCurrentUser,
  logout,
  isAuthenticated,
  getUserPassword,
  setUserPassword,
}

// ─── Internal: fire-and-forget transactional email helper ────────────────────
// Calls the Next.js /api/email/transactional route (does not block auth result).

async function fireTransactionalEmail(body: Record<string, unknown>): Promise<void> {
  try {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    await fetch(`${base}/api/email/transactional`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Non-critical — swallow silently
  }
}

// ─── Phone OTP (Twilio Verify via internal API routes) ──────────────────────

export async function sendOTP(
  phoneNumber: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  return apiSendOtp(phoneNumber)
}

export async function verifyOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  return apiVerifyOtp(phoneNumber, otp)
}

// ─── Email OTP (via /api/email/send-otp) ────────────────────────────────────

export async function sendEmailOtp(
  email: string,
  purpose: 'signup' | 'login' | 'phone-change' | 'forgot-password' = 'signup'
): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    const res = await fetch(`${base}/api/email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    })
    const data = await res.json().catch(() => ({}))
    return {
      success: !!data.success,
      message: data.message ?? 'OTP sent to your email.',
      otp: data.otp,  // only present in dev
    }
  } catch {
    return { success: false, message: 'Failed to send email OTP. Please try again.' }
  }
}

export async function verifyEmailOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  try {
    const base = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    const res = await fetch(`${base}/api/email/send-otp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    })
    const data = await res.json().catch(() => ({}))
    return {
      success: !!data.success,
      message: data.message ?? 'Email OTP verification failed.',
    }
  } catch {
    return { success: false, message: 'Failed to verify email OTP.' }
  }
}

// ─── Auth wrappers with email side-effects ───────────────────────────────────

export async function registerUser(data: {
  fullName: string
  phoneNumber: string
  password: string
  role: UserRole
  email?: string
  businessName?: string
  organizationName?: string
}): Promise<{ success: boolean; user?: User; message: string }> {
  const result = await apiRegister(data)

  // Fire welcome email if user has an email address
  if (result.success && result.user && data.email) {
    fireTransactionalEmail({
      type: 'welcome',
      to: data.email,
      fullName: data.fullName,
      role: data.role,
    })
  }

  return result
}

export async function loginUser(
  phoneNumber: string,
  password: string,
  userEmail?: string,
  userFullName?: string,
): Promise<{ success: boolean; user?: User; message: string }> {
  const result = await apiLogin(phoneNumber, password)

  // Fire login-alert email if user has an email address (non-blocking)
  if (result.success && userEmail && userFullName) {
    fireTransactionalEmail({
      type: 'login-alert',
      to: userEmail,
      fullName: userFullName,
    })
  }

  return result
}

export async function resetPassword(
  currentPassword: string,
  newPassword: string,
  userEmail?: string,
  userFullName?: string,
): Promise<{ success: boolean; message: string }> {
  const result = await apiResetPassword(currentPassword, newPassword)

  if (result.success && userEmail && userFullName) {
    fireTransactionalEmail({
      type: 'password-reset',
      to: userEmail,
      fullName: userFullName,
    })
  }

  return result
}

export async function forgotPassword(
  phoneNumber: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return apiForgotPasswordReset(phoneNumber, newPassword)
}

