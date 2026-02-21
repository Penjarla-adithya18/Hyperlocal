import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapReport } from '@/lib/supabase/mappers'

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapReport) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
