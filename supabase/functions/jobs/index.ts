import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const employerId = url.searchParams.get('employerId')
  const status = url.searchParams.get('status')
  const category = url.searchParams.get('category')
  const location = url.searchParams.get('location')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET' && id) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapJob(data) : null })
    }

    if (method === 'GET') {
      if (!isAdmin && employerId && employerId !== auth.user.id) {
        return errorResponse('Forbidden', 403)
      }

      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })
      if (employerId) {
        // Employer fetching their own jobs — show all statuses
        query = query.eq('employer_id', employerId)
      } else {
        // Public browse (workers) — only show active + escrow locked jobs
        query = query.eq('status', 'active').eq('payment_status', 'locked')
      }
      if (status) query = query.eq('status', status)
      if (category) query = query.eq('category', category)
      if (location) query = query.ilike('location', `%${location}%`)

      const { data, error } = await query
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapJob) })
    }

    if (method === 'POST') {
      if (!['employer', 'admin'].includes(auth.user.role)) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const requestedEmployerId = body.employerId as string
      if (!requestedEmployerId) return errorResponse('employerId is required', 400)
      if (!isAdmin && requestedEmployerId !== auth.user.id) {
        return errorResponse('Forbidden', 403)
      }

      // Posting limit for new (basic-trust) employers — max 3 active jobs
      const { data: employerRow, error: employerError } = await supabase
        .from('users')
        .select('trust_level')
        .eq('id', requestedEmployerId)
        .maybeSingle()
      if (employerError) throw employerError

      if (!isAdmin && (employerRow?.trust_level ?? 'basic') === 'basic') {
        const { count, error: countError } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('employer_id', requestedEmployerId)
          .eq('status', 'active')
        if (!countError && (count ?? 0) >= 3) {
          return errorResponse(
            'New accounts are limited to 3 active job postings. Complete jobs and earn reviews to unlock more.',
            403
          )
        }
      }

      const pay = Number(body.payAmount ?? body.pay ?? 0)

      // Fraud keyword detection
      const FRAUD_KEYWORDS = [
        'registration fee', 'deposit required', 'pay to apply', 'advance payment',
        'training fee', 'security deposit', 'upfront payment', 'send money',
        'guaranteed income', 'get rich quick', 'no experience needed high pay',
      ]
      const textToCheck = `${body.title ?? ''} ${body.description ?? ''}`.toLowerCase()
      const foundFraud = FRAUD_KEYWORDS.filter(kw => textToCheck.includes(kw))
      if (foundFraud.length >= 2) {
        return errorResponse(`Job blocked by fraud filter: suspicious keywords detected (${foundFraud.join(', ')})`, 422)
      }

      const payload = {
        employer_id: requestedEmployerId,
        title: body.title,
        description: body.description,
        job_type: body.jobType ?? (body.payType === 'fixed' ? 'gig' : 'part-time'),
        category: body.category || 'Other',
        required_skills: body.requiredSkills || [],
        location: body.location || '',
        pay,
        pay_amount: pay,
        pay_type: body.payType || 'hourly',
        payment_status: body.escrowRequired ? 'locked' : 'pending',
        escrow_amount: body.escrowRequired ? pay : null,
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
      return jsonResponse({ data: mapJob(data) })
    }

    if (method === 'PATCH' && id) {
      const { data: existing, error: findError } = await supabase
        .from('jobs')
        .select('id, employer_id')
        .eq('id', id)
        .maybeSingle()
      if (findError) throw findError
      if (!existing) return jsonResponse({ data: null })
      if (!isAdmin && existing.employer_id !== auth.user.id) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}
      if (body.title !== undefined) payload.title = body.title
      if (body.description !== undefined) payload.description = body.description
      if (body.jobType !== undefined) payload.job_type = body.jobType
      if (body.category !== undefined) payload.category = body.category
      if (body.requiredSkills !== undefined) payload.required_skills = body.requiredSkills
      if (body.location !== undefined) payload.location = body.location
      if (body.pay !== undefined) payload.pay = body.pay
      if (body.payAmount !== undefined) payload.pay_amount = body.payAmount
      if (body.payType !== undefined) payload.pay_type = body.payType
      if (body.paymentStatus !== undefined) payload.payment_status = body.paymentStatus
      if (body.escrowAmount !== undefined) payload.escrow_amount = body.escrowAmount
      if (body.escrowRequired !== undefined) payload.escrow_required = body.escrowRequired
      if (body.timing !== undefined) payload.timing = body.timing
      if (body.duration !== undefined) payload.duration = body.duration
      if (body.experienceRequired !== undefined) payload.experience_required = body.experienceRequired
      if (body.requirements !== undefined) payload.requirements = body.requirements
      if (body.benefits !== undefined) payload.benefits = body.benefits
      if (body.slots !== undefined) payload.slots = body.slots
      if (body.startDate !== undefined) payload.start_date = body.startDate
      if (body.status !== undefined) payload.status = body.status
      payload.updated_at = new Date().toISOString()

      const { data, error } = await supabase.from('jobs').update(payload).eq('id', id).select('*').maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapJob(data) : null })
    }

    if (method === 'DELETE' && id) {
      const { data: existing, error: findError } = await supabase
        .from('jobs')
        .select('id, employer_id')
        .eq('id', id)
        .maybeSingle()
      if (findError) throw findError
      if (!existing) return jsonResponse({ success: true })
      if (!isAdmin && existing.employer_id !== auth.user.id) return errorResponse('Forbidden', 403)

      const { error } = await supabase.from('jobs').delete().eq('id', id)
      if (error) throw error
      return jsonResponse({ success: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('jobs function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapJob(row: Record<string, unknown>) {
  const pay = Number((row.pay as number) ?? (row.pay_amount as number) ?? 0)
  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    jobType: row.job_type,
    category: row.category,
    requiredSkills: row.required_skills || [],
    location: row.location,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    pay,
    payAmount: Number(row.pay_amount ?? pay),
    payType: row.pay_type || 'hourly',
    paymentStatus: row.payment_status || 'pending',
    escrowAmount: row.escrow_amount || undefined,
    escrowRequired: !!row.escrow_required,
    timing: row.timing || row.duration || 'Flexible',
    duration: row.duration || row.timing || 'Flexible',
    experienceRequired: row.experience_required || 'entry',
    requirements: row.requirements || undefined,
    benefits: row.benefits || undefined,
    slots: row.slots || undefined,
    startDate: row.start_date || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    applicationCount: Number(row.application_count || 0),
    views: Number(row.views || 0),
  }
}
