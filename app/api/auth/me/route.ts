import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/supabase/mappers'
import { readSessionToken } from '@/lib/supabase/session'

export async function GET(request: NextRequest) {
  try {
    const token = readSessionToken(request)
    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 })
    }

    const supabase = getSupabaseServerClient()
    const nowIso = new Date().toISOString()

    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .gt('expires_at', nowIso)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user_id)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 })
    }

    return NextResponse.json({ success: true, user: mapUser(user) })
  } catch {
    return NextResponse.json({ success: false, user: null }, { status: 500 })
  }
}
