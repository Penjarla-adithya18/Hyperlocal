import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/supabase/mappers'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    if (error) throw error

    return NextResponse.json({ data: data ? mapUser(data) : null })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseServerClient()
    const { id } = await params
    const body = await request.json()

    const payload = {
      full_name: body.fullName,
      email: body.email,
      phone: body.phone,
      phone_number: body.phoneNumber,
      role: body.role,
      profile_completed: body.profileCompleted,
      trust_score: body.trustScore,
      trust_level: body.trustLevel,
      is_verified: body.isVerified,
      company_name: body.companyName,
      company_description: body.companyDescription,
      skills: body.skills,
    }

    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const { data, error } = await supabase
      .from('users')
      .update(sanitizedPayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ data: data ? mapUser(data) : null })
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
