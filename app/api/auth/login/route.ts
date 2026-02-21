import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/supabase/mappers'
import { createSessionToken, getSessionExpiryDate, setSessionCookie } from '@/lib/supabase/session'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', body.phoneNumber)
      .maybeSingle()

    if (error) throw error

    if (!data || data.password_hash !== body.password) {
      return NextResponse.json({ success: false, message: 'Invalid phone number or password' }, { status: 401 })
    }

    const token = createSessionToken()
    const expiresAt = getSessionExpiryDate()

    await supabase.from('user_sessions').insert({
      user_id: data.id,
      token,
      expires_at: expiresAt.toISOString(),
    })

    const response = NextResponse.json({ success: true, user: mapUser(data), message: 'Login successful' })
    setSessionCookie(response, token, expiresAt)
    return response
  } catch {
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 })
  }
}
