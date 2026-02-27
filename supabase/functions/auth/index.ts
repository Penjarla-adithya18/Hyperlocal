import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import {
  createServiceClient,
  createSessionForUser,
  requireAuth,
  revokeTokenHash,
} from '../_shared/auth.ts'
import { hashPassword, verifyPassword } from '../_shared/crypto.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()

  try {
    const body = await req.json()
    const action = body?.action

    if (action === 'register') {
      const { fullName, phoneNumber, password, role, businessName, organizationName } = body
      if (!fullName || !phoneNumber || !password || !role) {
        return errorResponse('Missing required fields', 400)
      }
      if (String(password).length < 8) {
        return errorResponse('Password must be at least 8 characters', 400)
      }

      const normalizedRole = role as 'worker' | 'employer' | 'admin'
      if (!['worker', 'employer'].includes(normalizedRole)) {
        return errorResponse('Invalid role', 400)
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle()

      if (existing) {
        return jsonResponse({ success: false, message: 'Phone number already registered' })
      }

      const passwordHash = await hashPassword(password)

      const { data: created, error } = await supabase
        .from('users')
        .insert({
          full_name: fullName,
          phone_number: phoneNumber,
          password_hash: passwordHash,
          role: normalizedRole,
          profile_completed: false,
          trust_score: 50,
          trust_level: 'basic',
          is_verified: true,
          company_name: normalizedRole === 'employer' ? (businessName || null) : null,
        })
        .select('*')
        .single()

      if (error) throw error

      if (normalizedRole === 'worker') {
        const { error: profileErr } = await supabase.from('worker_profiles').insert({
          user_id: created.id,
          skills: [],
          availability: '',
          categories: [],
        })
        if (profileErr) console.error('Failed to create worker profile:', profileErr)
      } else if (normalizedRole === 'employer') {
        const { error: profileErr } = await supabase.from('employer_profiles').insert({
          user_id: created.id,
          business_name: businessName || '',
          organization_name: organizationName || null,
        })
        if (profileErr) console.error('Failed to create employer profile:', profileErr)
      }

      const { error: trustErr } = await supabase.from('trust_scores').insert({
        user_id: created.id,
        score: 50,
        level: 'basic',
        job_completion_rate: 0,
        average_rating: 0,
        total_ratings: 0,
        complaint_count: 0,
        successful_payments: 0,
      })
      if (trustErr) console.error('Failed to create trust score:', trustErr)

      await supabase.from('user_sessions').delete().eq('user_id', created.id)
      const session = await createSessionForUser(supabase, created.id)
      return jsonResponse({
        success: true,
        user: mapUser(created),
        token: session.token,
        expiresAt: session.expiresAt,
        message: 'Registration successful',
      })
    }

    if (action === 'login') {
      const { phoneNumber, password } = body
      if (!phoneNumber || !password) {
        return errorResponse('Phone number and password are required', 400)
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle()

      if (error) throw error
      if (!data) return jsonResponse({ success: false, message: 'User not found' })

      const validPassword = await verifyPassword(password, data.password_hash)
      if (!validPassword) {
        return jsonResponse({ success: false, message: 'Invalid phone number or password' })
      }

      await supabase.from('user_sessions').delete().eq('user_id', data.id)
      const session = await createSessionForUser(supabase, data.id)
      return jsonResponse({
        success: true,
        user: mapUser(data),
        token: session.token,
        expiresAt: session.expiresAt,
        message: 'Login successful',
      })
    }

    if (action === 'reset-password') {
      const auth = await requireAuth(req, supabase)
      if ('error' in auth) return auth.error

      const { currentPassword, newPassword } = body
      if (!currentPassword || !newPassword) {
        return errorResponse('Current and new password are required', 400)
      }
      if (String(newPassword).length < 8) {
        return errorResponse('New password must be at least 8 characters', 400)
      }

      const { data: row, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', auth.user.id)
        .maybeSingle()

      if (error || !row) {
        return errorResponse('User not found', 404)
      }

      const validCurrentPassword = await verifyPassword(currentPassword, row.password_hash)
      if (!validCurrentPassword) {
        return jsonResponse({ success: false, message: 'Current password is incorrect' })
      }

      const newHash = await hashPassword(newPassword)
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', auth.user.id)

      if (updateError) throw updateError
      await supabase.from('user_sessions').delete().eq('user_id', auth.user.id)
      return jsonResponse({ success: true, message: 'Password reset successful' })
    }

    if (action === 'logout') {
      const auth = await requireAuth(req, supabase)
      if ('error' in auth) return auth.error

      await revokeTokenHash(supabase, auth.tokenHash)
      return jsonResponse({ success: true, message: 'Logged out' })
    }

    if (action === 'refresh-session') {
      const auth = await requireAuth(req, supabase)
      if ('error' in auth) return auth.error

      await revokeTokenHash(supabase, auth.tokenHash)
      const session = await createSessionForUser(supabase, auth.user.id)

      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', auth.user.id)
        .maybeSingle()

      if (userErr || !userRow) return errorResponse('Unauthorized', 401)

      return jsonResponse({
        success: true,
        user: mapUser(userRow),
        token: session.token,
        expiresAt: session.expiresAt,
        message: 'Session refreshed',
      })
    }

    // Unauthenticated password reset after OTP verification
    if (action === 'forgot-password') {
      const { phoneNumber, newPassword } = body
      if (!phoneNumber || !newPassword) {
        return errorResponse('phoneNumber and newPassword are required', 400)
      }
      if (String(newPassword).length < 8) {
        return errorResponse('Password must be at least 8 characters', 400)
      }
      const { data: userRow, error: findErr } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle()
      if (findErr || !userRow) return errorResponse('No account found with this phone number', 404)

      const newHash = await hashPassword(newPassword)
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', userRow.id)
      if (updateErr) throw updateErr
      // Invalidate all sessions for this user
      await supabase.from('user_sessions').delete().eq('user_id', userRow.id)
      return jsonResponse({ success: true, message: 'Password reset successful. Please log in.' })
    }

    if (action === 'get-user-by-phone') {
      const auth = await requireAuth(req, supabase)
      if ('error' in auth) return auth.error
      if (auth.user.role !== 'admin') return errorResponse('Forbidden', 403)

      const { phoneNumber } = body
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle()

      if (error) throw error
      return jsonResponse({ data: data ? mapUser(data) : null })
    }

    return errorResponse('Unknown action', 400)
  } catch (err) {
    console.error('auth function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || undefined,
    phone: row.phone_number,
    phoneNumber: row.phone_number,
    role: row.role,
    createdAt: row.created_at,
    profileCompleted: !!row.profile_completed,
    trustScore: Number(row.trust_score ?? 50),
    trustLevel: row.trust_level ?? 'basic',
    isVerified: !!row.is_verified,
    companyName: row.company_name || undefined,
    companyDescription: row.company_description || undefined,
    skills: row.skills || [],
  }
}
