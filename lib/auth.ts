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
