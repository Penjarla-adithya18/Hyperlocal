import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/supabase/mappers'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const id = request.nextUrl.searchParams.get('id')

    if (id) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return NextResponse.json({ data: data ? mapUser(data) : null })
    }

    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapUser) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
