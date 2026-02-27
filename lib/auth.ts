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

// ─── Phone OTP (Twilio Verify via internal API routes) ──────────────────────

export async function sendOTP(
  phoneNumber: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber }),
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
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, otp }),
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
