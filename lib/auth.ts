// Mock authentication service
import { User, UserRole } from './types';
import { mockUserOps, mockWorkerProfileOps, mockEmployerProfileOps } from './mockDb';
import { getSupabaseBrowserClient } from './supabase/client';
import { mapUser } from './supabase/mappers';

const useSupabaseBackend =
  typeof globalThis !== 'undefined' &&
  (globalThis as any)?.process?.env?.NEXT_PUBLIC_USE_SUPABASE === 'true';

// Simulated OTP storage (in real app, this would be server-side)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Generate random OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (mock implementation)
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(phoneNumber, { otp, expiresAt });

  // In real app, send via SMS gateway
  console.log(`OTP for ${phoneNumber}: ${otp}`);

  return {
    success: true,
    message: `OTP sent to ${phoneNumber}. For demo, OTP is: ${otp}`,
  };
}

// Verify OTP
export async function verifyOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const stored = otpStore.get(phoneNumber);

  if (!stored) {
    return { success: false, message: 'OTP not found or expired' };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phoneNumber);
    return { success: false, message: 'OTP expired' };
  }

  if (stored.otp !== otp) {
    return { success: false, message: 'Invalid OTP' };
  }

  otpStore.delete(phoneNumber);
  return { success: true, message: 'OTP verified successfully' };
}

// Register new user
export async function registerUser(data: {
  fullName: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
  businessName?: string;
  organizationName?: string;
}): Promise<{ success: boolean; user?: User; message: string }> {
  if (useSupabaseBackend) {
    try {
      const supabase = getSupabaseBrowserClient();

      const { data: existing, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', data.phoneNumber)
        .maybeSingle();

      if (findError) throw findError;
      if (existing) {
        return { success: false, message: 'Phone number already registered' };
      }

      const { data: created, error } = await supabase
        .from('users')
        .insert({
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          role: data.role,
          password_hash: data.password,
          profile_completed: false,
          trust_score: 50,
          trust_level: 'basic',
          is_verified: true,
          company_name: data.role === 'employer' ? data.businessName || null : null,
        })
        .select('*')
        .single();

      if (error) throw error;

      if (data.role === 'worker') {
        const { error: profileError } = await supabase.from('worker_profiles').insert({
          user_id: created.id,
          skills: [],
          availability: '',
          categories: [],
        });

        if (profileError) throw profileError;
      }

      if (data.role === 'employer') {
        const { error: profileError } = await supabase.from('employer_profiles').insert({
          user_id: created.id,
          business_name: data.businessName || '',
          organization_name: data.organizationName || null,
        });

        if (profileError) throw profileError;
      }

      return {
        success: true,
        user: mapUser(created),
        message: 'Registration successful',
      };
    } catch {
      return { success: false, message: 'Registration failed' };
    }
  }

  // Check if user already exists
  const existing = await mockUserOps.findByPhone(data.phoneNumber);
  if (existing) {
    return { success: false, message: 'Phone number already registered' };
  }

  // Create user
  const newUser = await mockUserOps.create({
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    role: data.role,
    profileCompleted: false,
    trustScore: 50,
    trustLevel: 'basic',
    isVerified: true,
  });

  // Create profile based on role
  if (data.role === 'worker') {
    await mockWorkerProfileOps.create({
      userId: newUser.id,
      skills: [],
      availability: '',
      categories: [],
    });
  } else if (data.role === 'employer') {
    await mockEmployerProfileOps.create({
      userId: newUser.id,
      businessName: data.businessName || '',
      organizationName: data.organizationName,
    });
  }

  // In real app, hash password and store securely
  // For mock, we'll store in localStorage on client side

  return {
    success: true,
    user: newUser,
    message: 'Registration successful',
  };
}

// Login user
export async function loginUser(
  phoneNumber: string,
  password: string
): Promise<{ success: boolean; user?: User; message: string }> {
  if (useSupabaseBackend) {
    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.password_hash !== password) {
        return { success: false, message: 'Invalid phone number or password' };
      }

      return {
        success: true,
        user: mapUser(data),
        message: 'Login successful',
      };
    } catch {
      return { success: false, message: 'Login failed' };
    }
  }

  await new Promise(resolve => setTimeout(resolve, 400));

  const user = await mockUserOps.findByPhone(phoneNumber);

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // In real app, verify hashed password
  // For mock, we'll check against localStorage on client side

  return {
    success: true,
    user,
    message: 'Login successful',
  };
}

// Password reset
export async function resetPassword(
  phoneNumber: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const user = await mockUserOps.findByPhone(phoneNumber);

  if (!user) {
    return { success: false, message: 'User not found' };
  }

  // In real app, hash and update password
  // For mock, we'll update in localStorage on client side

  return {
    success: true,
    message: 'Password reset successful',
  };
}

// Get current user from session
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  const userJson = localStorage.getItem('currentUser');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

// Set current user in session
export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;

  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
}

// Logout
export function logout(): void {
  setCurrentUser(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userPassword');
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Get user password (for mock auth)
export function getUserPassword(phoneNumber: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`pwd_${phoneNumber}`);
}

// Set user password (for mock auth)
export function setUserPassword(phoneNumber: string, password: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`pwd_${phoneNumber}`, password);
}
