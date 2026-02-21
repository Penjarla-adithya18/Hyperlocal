import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapJob } from '@/lib/supabase/mappers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params

    const { data, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle()
    if (error) throw error

    return NextResponse.json({ data: data ? mapJob(data) : null })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params

    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    const payload = {
      title: body.title,
      description: body.description,
      location: body.location,
      pay: body.pay,
      pay_amount: body.payAmount,
      duration: body.duration,
      timing: body.timing,
      requirements: body.requirements,
      benefits: body.benefits,
      status: body.status,
      updated_at: new Date().toISOString(),
    }

    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const { data, error } = await supabase
      .from('jobs')
      .update(sanitizedPayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data: data ? mapJob(data) : null })
  } catch {
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
