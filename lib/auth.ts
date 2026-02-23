// lib/auth.ts – thin wrapper over Supabase Edge Functions
import { User, UserRole } from './types'
import {
  registerUser as apiRegister,
  loginUser as apiLogin,
  resetPassword as apiResetPassword,
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

const EDGE_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : '/functions/v1'

export async function sendOTP(
  phoneNumber: string
): Promise<{ success: boolean; message: string }> {
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
    return { success: data.success ?? false, message: data.message ?? 'OTP request sent' }
  } catch {
    return { success: false, message: 'Failed to send OTP. Please try again.' }
  }
}

export async function verifyOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
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
