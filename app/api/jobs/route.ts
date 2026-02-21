import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapJob } from '@/lib/supabase/mappers'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const employerId = request.nextUrl.searchParams.get('employerId')

    let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })
    if (employerId) query = query.eq('employer_id', employerId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapJob) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    const payload = {
      employer_id: body.employerId,
      title: body.title,
      description: body.description,
      job_type: body.jobType || (body.payType === 'fixed' ? 'gig' : 'part-time'),
      category: body.category,
      required_skills: body.requiredSkills || [],
      location: body.location,
      pay: Number(body.pay ?? body.payAmount ?? 0),
      pay_amount: Number(body.payAmount ?? body.pay ?? 0),
      pay_type: body.payType || 'hourly',
      payment_status: body.escrowRequired ? 'locked' : 'pending',
      escrow_amount: body.escrowRequired ? Number(body.payAmount ?? body.pay ?? 0) : null,
      escrow_required: !!body.escrowRequired,
      timing: body.timing || body.duration || 'Flexible',
      duration: body.duration || body.timing || 'Flexible',
      experience_required: body.experienceRequired || 'entry',
      requirements: body.requirements || null,
      benefits: body.benefits || null,
      slots: body.slots || 1,
      start_date: body.startDate || null,
      status: body.status || 'active',
      application_count: 0,
      views: 0,
    }

    const { data, error } = await supabase.from('jobs').insert(payload).select('*').single()
    if (error) throw error

    return NextResponse.json({ data: mapJob(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
