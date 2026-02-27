import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const role = url.searchParams.get('role') as 'worker' | 'employer' | null
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET' && userId && role) {
      const table = role === 'worker' ? 'worker_profiles' : 'employer_profiles'
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data) return jsonResponse({ data: null })

      if (!isAdmin && auth.user.id !== userId) {
        return jsonResponse({ data: mapPublicProfile(data, role) })
      }

      return jsonResponse({ data: mapProfile(data, role) })
    }

    if (method === 'POST') {
      const body = await req.json()
      const profileRole = body.role as 'worker' | 'employer'
      if (!['worker', 'employer'].includes(profileRole)) {
        return errorResponse('Invalid role', 400)
      }

      const targetUserId = body.userId as string
      if (!isAdmin && targetUserId !== auth.user.id) return errorResponse('Forbidden', 403)

      const table = profileRole === 'worker' ? 'worker_profiles' : 'employer_profiles'
      const payload =
        profileRole === 'worker'
          ? {
              user_id: targetUserId,
              skills: body.skills || [],
              availability: body.availability || '',
              categories: body.categories || [],
              experience: body.experience || null,
              location: body.location || null,
              profile_picture_url: body.profilePictureUrl || null,
              bio: body.bio || null,
              resume_url: body.resumeUrl || null,
              resume_text: body.resumeText || null,
              resume_parsed: body.resumeParsed || null,
              profile_completed: body.profileCompleted || false,
            }
          : {
              user_id: targetUserId,
              business_name: body.businessName || '',
              organization_name: body.organizationName || null,
              location: body.location || null,
              business_type: body.businessType || null,
              description: body.description || null,
            }

      const { data, error } = await supabase.from(table).insert(payload).select('*').single()
      if (error) throw error
      return jsonResponse({ data: mapProfile(data, profileRole) })
    }

    if (method === 'PATCH' && userId && role) {
      if (!isAdmin && userId !== auth.user.id) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const table = role === 'worker' ? 'worker_profiles' : 'employer_profiles'
      const payload: Record<string, unknown> = {}

      if (role === 'worker') {
        if (body.skills !== undefined) payload.skills = body.skills
        if (body.availability !== undefined) payload.availability = body.availability
        if (body.categories !== undefined) payload.categories = body.categories
        if (body.experience !== undefined) payload.experience = body.experience
        if (body.location !== undefined) payload.location = body.location
        if (body.profilePictureUrl !== undefined) payload.profile_picture_url = body.profilePictureUrl
        if (body.bio !== undefined) payload.bio = body.bio
        if (body.resumeUrl !== undefined) payload.resume_url = body.resumeUrl
        if (body.resumeText !== undefined) payload.resume_text = body.resumeText
        if (body.resumeParsed !== undefined) payload.resume_parsed = body.resumeParsed
        if (body.profileCompleted !== undefined) payload.profile_completed = body.profileCompleted
      } else {
        if (body.businessName !== undefined) payload.business_name = body.businessName
        if (body.organizationName !== undefined) payload.organization_name = body.organizationName
        if (body.location !== undefined) payload.location = body.location
        if (body.businessType !== undefined) payload.business_type = body.businessType
        if (body.description !== undefined) payload.description = body.description
      }

      payload.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapProfile(data, role) : null })
    }

    return errorResponse('Method not allowed or missing params', 405)
  } catch (err) {
    console.error('profiles function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapPublicProfile(row: Record<string, unknown>, role: 'worker' | 'employer') {
  if (role === 'worker') {
    return {
      userId: row.user_id,
      skills: row.skills || [],
      categories: row.categories || [],
      experience: row.experience || undefined,
      location: row.location || undefined,
      bio: row.bio || undefined,
    }
  }
  return {
    userId: row.user_id,
    businessName: row.business_name || '',
    location: row.location || undefined,
    businessType: row.business_type || undefined,
    description: row.description || undefined,
  }
}

function mapProfile(row: Record<string, unknown>, role: 'worker' | 'employer') {
  if (role === 'worker') {
    return {
      userId: row.user_id,
      skills: row.skills || [],
      availability: row.availability || '',
      categories: row.categories || [],
      experience: row.experience || undefined,
      location: row.location || undefined,
      profilePictureUrl: row.profile_picture_url || undefined,
      bio: row.bio || undefined,
      resumeUrl: row.resume_url || undefined,
      resumeText: row.resume_text || undefined,
      resumeParsed: row.resume_parsed || undefined,
      profileCompleted: row.profile_completed || false,
    }
  }
  return {
    userId: row.user_id,
    businessName: row.business_name || '',
    organizationName: row.organization_name || undefined,
    location: row.location || undefined,
    businessType: row.business_type || undefined,
    description: row.description || undefined,
  }
}
