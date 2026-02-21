import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapApplication } from '@/lib/supabase/mappers'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const workerId = request.nextUrl.searchParams.get('workerId')
    const jobId = request.nextUrl.searchParams.get('jobId')

    let query = supabase.from('applications').select('*').order('created_at', { ascending: false })
    if (workerId) query = query.eq('worker_id', workerId)
    if (jobId) query = query.eq('job_id', jobId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapApplication) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    const payload = {
      job_id: body.jobId,
      worker_id: body.workerId,
      status: body.status || 'pending',
      match_score: body.matchScore || 0,
      cover_message: body.coverMessage || body.coverLetter || null,
      cover_letter: body.coverLetter || null,
    }

    const { data, error } = await supabase.from('applications').insert(payload).select('*').single()
    if (error) throw error

    return NextResponse.json({ data: mapApplication(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
  }
}
