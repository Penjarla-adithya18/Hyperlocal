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
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET') {
      let query = supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!isAdmin) {
        query = query.or(`employer_id.eq.${auth.user.id},worker_id.eq.${auth.user.id}`)
      }

      const { data, error } = await query
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapEscrow) })
    }

    if (method === 'POST') {
      const body = await req.json()
      if (!body.jobId || !body.employerId || !body.workerId) {
        return errorResponse('jobId, employerId and workerId are required', 400)
      }
      if (!isAdmin && body.employerId !== auth.user.id) return errorResponse('Forbidden', 403)

      const payload = {
        job_id: body.jobId,
        employer_id: body.employerId,
        worker_id: body.workerId,
        amount: Number(body.amount),
        status: body.status || 'pending',
      }
      const { data, error } = await supabase.from('escrow_transactions').insert(payload).select('*').single()
      if (error) throw error
      return jsonResponse({ data: mapEscrow(data) })
    }

    if (method === 'PATCH' && id) {
      const { data: existing, error: findError } = await supabase
        .from('escrow_transactions')
        .select('id, employer_id, worker_id')
        .eq('id', id)
        .maybeSingle()
      if (findError) throw findError
      if (!existing) return jsonResponse({ data: null })

      const canUpdate = isAdmin || existing.employer_id === auth.user.id || existing.worker_id === auth.user.id
      if (!canUpdate) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}
      if (body.status !== undefined) payload.status = body.status
      if (body.status === 'released') payload.released_at = new Date().toISOString()
      if (body.status === 'refunded') payload.refunded_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('escrow_transactions')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapEscrow(data) : null })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('escrow function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapEscrow(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobId: row.job_id,
    employerId: row.employer_id,
    workerId: row.worker_id,
    amount: Number(row.amount || 0),
    status: row.status,
    createdAt: row.created_at,
    releasedAt: row.released_at || undefined,
    refundedAt: row.refunded_at || undefined,
  }
}
