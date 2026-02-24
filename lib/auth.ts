// lib/auth.ts – thin wrapper over Supabase Edge Functions
import { User, UserRole } from './types'
import {
  registerUser as apiRegister,
  loginUser as apiLogin,
  resetPassword as apiResetPassword,
  forgotPasswordReset as apiForgotPasswordReset,
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

// ─── WATI WhatsApp OTP ────────────────────────────────────────────────────────
// Calls the `wati` Supabase Edge Function which sends a WhatsApp OTP via WATI.
// Falls back gracefully (console log) when WATI credentials are not yet set.
// In demo mode the OTP is returned in the response and shown on screen.
// Client-side cache avoids stateless-isolate issues with the edge function.

const EDGE_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : '/functions/v1'

// Client-side OTP cache: phone → { otp, expiresAt }
const _otpCache = new Map<string, { otp: string; expiresAt: number }>()

export async function sendOTP(
  phoneNumber: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/wati`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({ action: 'send_otp', phone: phoneNumber }),
    })
    const data = await res.json()
    if (data.success && data.otp) {
      // Cache the OTP client-side for 5 minutes
      _otpCache.set(phoneNumber, { otp: data.otp, expiresAt: Date.now() + 5 * 60 * 1000 })
    }
    return { success: data.success ?? false, message: data.message ?? 'OTP request sent', otp: data.otp }
  } catch {
    return { success: false, message: 'Failed to send OTP. Please try again.' }
  }
}

export async function verifyOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  // Check client-side cache first (works regardless of edge function state)
  const cached = _otpCache.get(phoneNumber)
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      _otpCache.delete(phoneNumber)
      return { success: false, message: 'OTP expired. Please request a new one.' }
    }
    if (cached.otp === otp.trim()) {
      _otpCache.delete(phoneNumber)
      return { success: true, message: 'OTP verified successfully' }
    }
    return { success: false, message: 'Invalid OTP. Please try again.' }
  }

  // Fallback: try edge function (for when OTP was sent server-side via WATI)
  try {
    const res = await fetch(`${EDGE_BASE}/wati`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({ action: 'verify_otp', phone: phoneNumber, otp_code: otp }),
    })
    const data = await res.json()
    return { success: data.success ?? false, message: data.message ?? '' }
  } catch {
    return { success: false, message: 'OTP verification failed. Please try again.' }
  }
}

export async function registerUser(data: {
  fullName: string
  phoneNumber: string
  password: string
  role: UserRole
  businessName?: string
  organizationName?: string
}): Promise<{ success: boolean; user?: User; message: string }> {
  return apiRegister(data)
}

export async function loginUser(
  phoneNumber: string,
  password: string
): Promise<{ success: boolean; user?: User; message: string }> {
  return apiLogin(phoneNumber, password)
}

export async function resetPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return apiResetPassword(currentPassword, newPassword)
}

export async function forgotPassword(
  phoneNumber: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return apiForgotPasswordReset(phoneNumber, newPassword)
}
