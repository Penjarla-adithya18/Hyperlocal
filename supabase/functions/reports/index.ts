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
      if (!isAdmin) return errorResponse('Forbidden', 403)

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapReport) })
    }

    if (method === 'POST') {
      const body = await req.json()
      if (!body.reason) return errorResponse('Reason is required', 400)
      const payload = {
        reporter_id: auth.user.id,
        reported_id: body.reportedId || body.reportedUserId || null,
        reported_user_id: body.reportedUserId || body.reportedId || null,
        reported_job_id: body.reportedJobId || null,
        type: body.type || null,
        reason: body.reason,
        description: body.description || '',
        status: 'pending',
      }
      const { data, error } = await supabase.from('reports').insert(payload).select('*').single()
      if (error) throw error
      return jsonResponse({ data: mapReport(data) })
    }

    if (method === 'PATCH' && id) {
      if (!isAdmin) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}
      if (body.status !== undefined) payload.status = body.status
      if (body.resolution !== undefined) payload.resolution = body.resolution
      if (body.reason !== undefined) payload.reason = body.reason
      if (body.description !== undefined) payload.description = body.description
      if (body.type !== undefined) payload.type = body.type
      if (body.reportedId !== undefined) payload.reported_id = body.reportedId
      if (body.reportedUserId !== undefined) payload.reported_user_id = body.reportedUserId
      if (body.reportedJobId !== undefined) payload.reported_job_id = body.reportedJobId
      if (body.resolvedAt !== undefined) payload.resolved_at = body.resolvedAt
      if (!payload.resolved_at && (body.status === 'resolved' || body.status === 'dismissed')) {
        payload.resolved_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('reports')
        .update(payload)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapReport(data) : null })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('reports function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapReport(row: Record<string, unknown>) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedId: row.reported_id || row.reported_user_id || undefined,
    reportedUserId: row.reported_user_id || row.reported_id || undefined,
    reportedJobId: row.reported_job_id || undefined,
    type: row.type || undefined,
    reason: row.reason,
    description: row.description || '',
    status: row.status,
    resolution: row.resolution || undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  }
}
