import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error

    if (method === 'GET' && !id) {
      if (auth.user.role !== 'admin') return errorResponse('Forbidden', 403)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapUser) })
    }

    if (method === 'GET' && id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return jsonResponse({ data: null })

      if (auth.user.role !== 'admin' && auth.user.id !== id) {
        return jsonResponse({ data: mapPublicUser(data) })
      }

      return jsonResponse({ data: mapUser(data) })
    }

    if (method === 'PATCH' && id) {
      const isSelf = auth.user.id === id
      const isAdmin = auth.user.role === 'admin'
      if (!isSelf && !isAdmin) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}

      if (body.fullName !== undefined) payload.full_name = body.fullName
      if (body.phoneNumber !== undefined) payload.phone_number = body.phoneNumber
      if (body.companyName !== undefined) payload.company_name = body.companyName
      if (body.companyDescription !== undefined) payload.company_description = body.companyDescription
      if (body.skills !== undefined) payload.skills = body.skills
      if (body.email !== undefined) payload.email = body.email
      if (body.profileCompleted !== undefined) payload.profile_completed = body.profileCompleted

      if (isAdmin) {
        if (body.role !== undefined) payload.role = body.role
        if (body.trustScore !== undefined) payload.trust_score = body.trustScore
        if (body.trustLevel !== undefined) payload.trust_level = body.trustLevel
        if (body.isVerified !== undefined) payload.is_verified = body.isVerified
      }

      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapUser(data) : null })
    }

    if (method === 'DELETE' && id) {
      const isSelf = auth.user.id === id
      const isAdmin = auth.user.role === 'admin'
      if (!isSelf && !isAdmin) return errorResponse('Forbidden', 403)

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('users function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapPublicUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: undefined,
    phone: undefined,
    phoneNumber: '',
    role: row.role,
    createdAt: row.created_at || new Date().toISOString(),
    profileCompleted: !!row.profile_completed,
    trustScore: Number(row.trust_score ?? 50),
    trustLevel: row.trust_level ?? 'basic',
    isVerified: !!row.is_verified,
    companyName: row.company_name || undefined,
    companyDescription: row.company_description || undefined,
    skills: row.skills || [],
  }
}

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || undefined,
    phone: row.phone_number,
    phoneNumber: row.phone_number,
    role: row.role,
    createdAt: row.created_at,
    profileCompleted: !!row.profile_completed,
    trustScore: Number(row.trust_score ?? 50),
    trustLevel: row.trust_level ?? 'basic',
    isVerified: !!row.is_verified,
    companyName: row.company_name || undefined,
    companyDescription: row.company_description || undefined,
    skills: row.skills || [],
  }
}
