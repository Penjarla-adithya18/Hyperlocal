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
        // Allow employer who owns the job OR the worker filtering their own applications
        const isJobOwner = job.employer_id === auth.user.id
        const isWorkerSelf = workerId && workerId === auth.user.id
        if (!isAdmin && !isJobOwner && !isWorkerSelf) return errorResponse('Forbidden', 403)
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

      const { error: incrementError } = await supabase.rpc('increment_application_count', { job_id: body.jobId })
      if (incrementError) {
        const { data: job, error: jobReadError } = await supabase
          .from('jobs')
          .select('application_count')
          .eq('id', body.jobId)
          .maybeSingle()

        if (!jobReadError && job) {
          await supabase
            .from('jobs')
            .update({ application_count: Number(job.application_count || 0) + 1 })
            .eq('id', body.jobId)
        }
      }

      // ── WhatsApp: notify employer about new application (fire-and-forget) ──
      notifyEmployerOnNewApplication(supabase, requestedWorkerId, body.jobId as string, Number(body.matchScore || 0)).catch((e: unknown) => {
        console.error('[applications] WhatsApp new-app notify error:', e)
      })

      return jsonResponse({ data: mapApplication(data) })
    }

    if (method === 'PATCH' && id) {
      const { data: existing, error: findError } = await supabase
        .from('applications')
        .select('id, worker_id, job_id, status')
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

      // ── WhatsApp notification on status change (fire-and-forget) ──────────
      const oldStatus = existing.status as string
      const newStatus = body.status as string | undefined
      if (newStatus && newStatus !== oldStatus && (newStatus === 'accepted' || newStatus === 'rejected')) {
        notifyWorkerOnStatusChange(supabase, existing.worker_id, existing.job_id, newStatus).catch((e: unknown) => {
          console.error('[applications] WhatsApp status notify error:', e)
        })
      }

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

// ── WhatsApp Notification Helpers — route through the central /wati edge fn ──

/**
 * Call the central /wati edge function to send a WhatsApp notification.
 * Phone normalisation, template rendering, and WATI API credentials all live
 * inside the wati function — we just pass template + params.
 */
async function callWatiFunction(template: string, phone: string, params: string[]): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceKey) {
    console.error('[WATI-APP] Cannot call /wati — SUPABASE_URL or SERVICE_ROLE_KEY missing')
    return
  }

  const endpoint = `${supabaseUrl}/functions/v1/wati`
  console.log(`[WATI-APP] → /wati  template=${template}  phone=${phone}  params=${JSON.stringify(params)}`)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ action: 'notify', phone, template, params }),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`[WATI-APP] /wati returned ${res.status}: ${text.substring(0, 300)}`)
    throw new Error(`/wati failed: ${res.status} ${text.substring(0, 100)}`)
  }
  console.log(`[WATI-APP] ✅ /wati success: ${text.substring(0, 200)}`)
}

/**
 * When a worker applies to a job → notify the employer via WhatsApp.
 */
async function notifyEmployerOnNewApplication(
  supabase: ReturnType<typeof createServiceClient>,
  workerId: string,
  jobId: string,
  matchScore: number,
): Promise<void> {
  console.log(`[WATI-APP] notifyEmployerOnNewApplication: workerId=${workerId}, jobId=${jobId}, matchScore=${matchScore}`)

  const [workerRes, jobRes] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', workerId).maybeSingle(),
    supabase.from('jobs').select('title, employer_id').eq('id', jobId).maybeSingle(),
  ])

  if (workerRes.error) console.error('[WATI-APP] Worker lookup error:', workerRes.error.message)
  if (jobRes.error) console.error('[WATI-APP] Job lookup error:', jobRes.error.message)

  const workerName = workerRes.data?.full_name || 'A worker'
  const jobTitle = jobRes.data?.title || 'your job'
  const employerId = jobRes.data?.employer_id
  if (!employerId) {
    console.warn('[WATI-APP] No employer_id found for job', jobId)
    return
  }

  const { data: employer, error: empError } = await supabase
    .from('users')
    .select('full_name, phone_number')
    .eq('id', employerId)
    .maybeSingle()

  if (empError) console.error('[WATI-APP] Employer lookup error:', empError.message)

  if (!employer?.phone_number) {
    console.warn(`[WATI-APP] Employer ${employerId} has no phone_number — cannot send WhatsApp`)
    return
  }

  const employerName = employer.full_name || 'Employer'
  console.log(`[WATI-APP] Sending new_application WhatsApp to employer ${employerId} at ${employer.phone_number}`)
  await callWatiFunction('new_application', employer.phone_number, [employerName, workerName, jobTitle])
}

/**
 * When employer accepts/rejects an application → notify the worker via WhatsApp.
 */
async function notifyWorkerOnStatusChange(
  supabase: ReturnType<typeof createServiceClient>,
  workerId: string,
  jobId: string,
  newStatus: 'accepted' | 'rejected',
): Promise<void> {
  console.log(`[WATI-APP] notifyWorkerOnStatusChange: workerId=${workerId}, jobId=${jobId}, status=${newStatus}`)

  const [workerRes, jobRes] = await Promise.all([
    supabase.from('users').select('full_name, phone_number').eq('id', workerId).maybeSingle(),
    supabase.from('jobs').select('title, employer_id').eq('id', jobId).maybeSingle(),
  ])

  if (workerRes.error) console.error('[WATI-APP] Worker lookup error:', workerRes.error.message)
  if (jobRes.error) console.error('[WATI-APP] Job lookup error:', jobRes.error.message)

  const workerName = workerRes.data?.full_name || 'Worker'
  const workerPhone = workerRes.data?.phone_number
  if (!workerPhone) {
    console.warn(`[WATI-APP] Worker ${workerId} has no phone_number — cannot send WhatsApp`)
    return
  }

  const jobTitle = jobRes.data?.title || 'the job'

  if (newStatus === 'accepted') {
    let employerName = 'The employer'
    if (jobRes.data?.employer_id) {
      const { data: emp } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', jobRes.data.employer_id)
        .maybeSingle()
      employerName = emp?.full_name || employerName
    }
    console.log(`[WATI-APP] Sending application_accepted to worker ${workerId} at ${workerPhone}`)
    await callWatiFunction('application_accepted', workerPhone, [workerName, jobTitle, employerName])
  } else {
    console.log(`[WATI-APP] Sending application_rejected to worker ${workerId} at ${workerPhone}`)
    await callWatiFunction('application_rejected', workerPhone, [workerName, jobTitle])
  }
}
