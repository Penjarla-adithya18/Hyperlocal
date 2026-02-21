import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { clearSessionCookie, readSessionToken } from '@/lib/supabase/session'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  try {
    const token = readSessionToken(request)
    if (token) {
      const supabase = getSupabaseServerClient()
      await supabase.from('user_sessions').delete().eq('token', token)
    }
  } catch {
  }

  clearSessionCookie(response)
  return response
}
