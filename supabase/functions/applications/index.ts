import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const workerId = url.searchParams.get('workerId')
  const jobId = url.searchParams.get('jobId')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET') {
      if (workerId) {
        if (!isAdmin && workerId !== auth.user.id) return errorResponse('Forbidden', 403)
      }

      if (jobId) {
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('employer_id')
          .eq('id', jobId)
          .maybeSingle()
        if (jobError) throw jobError
        if (!job) return jsonResponse({ data: [] })
        if (!isAdmin && job.employer_id !== auth.user.id) return errorResponse('Forbidden', 403)
      }

      if (!workerId && !jobId && !isAdmin) return errorResponse('Forbidden', 403)

      let query = supabase.from('applications').select('*').order('created_at', { ascending: false })
      if (workerId) query = query.eq('worker_id', workerId)
      if (jobId) query = query.eq('job_id', jobId)

      const { data, error } = await query
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapApplication) })
    }

    if (method === 'POST') {
      if (!['worker', 'admin'].includes(auth.user.role)) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const requestedWorkerId = body.workerId as string
      if (!body.jobId || !requestedWorkerId) return errorResponse('jobId and workerId are required', 400)
      if (!isAdmin && requestedWorkerId !== auth.user.id) return errorResponse('Forbidden', 403)

      const payload = {
        job_id: body.jobId,
        worker_id: requestedWorkerId,
        status: body.status || 'pending',
        match_score: Number(body.matchScore || 0),
        cover_message: body.coverMessage || body.coverLetter || null,
        cover_letter: body.coverLetter || body.coverMessage || null,
      }

      const { data, error } = await supabase.from('applications').insert(payload).select('*').single()
      if (error) {
        if ((error as { code?: string }).code === '23505') {
          return jsonResponse({ success: false, message: 'Already applied to this job' })
        }
        throw error
      }

      await supabase.rpc('increment_application_count', { job_id: body.jobId }).catch(() => {
        supabase
          .from('jobs')
          .select('application_count')
          .eq('id', body.jobId)
          .single()
          .then(({ data: job }: { data: Record<string, unknown> | null }) => {
            if (job) {
              return supabase
                .from('jobs')
                .update({ application_count: ((job.application_count as number) || 0) + 1 })
                .eq('id', body.jobId)
            }
            return Promise.resolve()
          })
      })

      return jsonResponse({ data: mapApplication(data) })
    }

    if (method === 'PATCH' && id) {
      const { data: existing, error: findError } = await supabase
        .from('applications')
        .select('id, worker_id, job_id')
        .eq('id', id)
        .maybeSingle()
      if (findError) throw findError
      if (!existing) return jsonResponse({ data: null })

      let canEdit = isAdmin || existing.worker_id === auth.user.id
      if (!canEdit) {
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('employer_id')
          .eq('id', existing.job_id)
          .maybeSingle()
        if (jobError) throw jobError
        canEdit = !!job && job.employer_id === auth.user.id
      }
      if (!canEdit) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}
      if (body.status !== undefined) payload.status = body.status
      if (body.matchScore !== undefined) payload.match_score = body.matchScore
      if (body.coverMessage !== undefined) payload.cover_message = body.coverMessage
      if (body.coverLetter !== undefined) payload.cover_letter = body.coverLetter
      payload.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapApplication(data) : null })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('applications function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapApplication(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobId: row.job_id,
    workerId: row.worker_id,
    status: row.status,
    matchScore: Number(row.match_score || 0),
    coverMessage: row.cover_message || undefined,
    coverLetter: row.cover_letter || row.cover_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
