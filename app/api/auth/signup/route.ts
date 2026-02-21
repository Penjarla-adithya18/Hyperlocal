import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/supabase/mappers'
import { createSessionToken, getSessionExpiryDate, setSessionCookie } from '@/lib/supabase/session'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    const existing = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', body.phoneNumber)
      .maybeSingle()

    if (existing.data?.id) {
      return NextResponse.json({ success: false, message: 'Phone number already registered' }, { status: 409 })
    }

    const insertPayload = {
      full_name: body.fullName,
      phone_number: body.phoneNumber,
      role: body.role,
      profile_completed: false,
      trust_score: 50,
      trust_level: 'basic',
      is_verified: true,
      company_name: body.businessName || null,
      email: body.email || null,
      password_hash: body.password,
    }

    const { data, error } = await supabase.from('users').insert(insertPayload).select('*').single()
    if (error) throw error

    if (body.role === 'worker') {
      await supabase.from('worker_profiles').insert({
        user_id: data.id,
        skills: [],
        availability: '',
        categories: [],
      })
    }

    if (body.role === 'employer') {
      await supabase.from('employer_profiles').insert({
        user_id: data.id,
        business_name: body.businessName || '',
        organization_name: body.organizationName || null,
      })
    }

    const token = createSessionToken()
    const expiresAt = getSessionExpiryDate()

    await supabase.from('user_sessions').insert({
      user_id: data.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

    const response = NextResponse.json({ success: true, user: mapUser(data), message: 'Registration successful' })
    setSessionCookie(response, token, expiresAt)
    return response
  } catch {
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 })
  }
}
