import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapReport } from '@/lib/supabase/mappers'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    const payload = {
      status: body.status,
      resolution: body.resolution ?? null,
      resolved_at: body.resolvedAt ?? null,
    }

    const { data, error } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ data: data ? mapReport(data) : null })
  } catch {
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
