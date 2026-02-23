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

const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOTP(
  phoneNumber: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 300))
  const otp = generateOTP()
  otpStore.set(phoneNumber, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 })
  return { success: true, message: `OTP sent to ${phoneNumber}` }
}

export async function verifyOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((r) => setTimeout(r, 200))
  const stored = otpStore.get(phoneNumber)
  if (!stored) return { success: false, message: 'OTP not found or expired' }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phoneNumber)
    return { success: false, message: 'OTP expired' }
  }
  if (stored.attempts >= 5) {
    otpStore.delete(phoneNumber)
    return { success: false, message: 'OTP verification attempts exceeded' }
  }
  if (stored.otp !== otp) {
    otpStore.set(phoneNumber, { ...stored, attempts: stored.attempts + 1 })
    return { success: false, message: 'Invalid OTP' }
  }
  otpStore.delete(phoneNumber)
  return { success: true, message: 'OTP verified successfully' }
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
