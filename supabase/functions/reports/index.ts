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

    // ── Penalize: deduct trust score + resolve the report ────────────────────
    if (method === 'PATCH' && id && url.searchParams.get('action') === 'penalize') {
      if (!isAdmin) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const penalty = Number(body.penalty ?? 0)
      const resolutionNote = body.resolution as string || `Trust score penalized by ${penalty} points by admin.`

      // Get the report to find the reported user
      const { data: report, error: reportErr } = await supabase
        .from('reports')
        .select('reported_id, reported_user_id')
        .eq('id', id)
        .maybeSingle()
      if (reportErr) throw reportErr
      if (!report) return errorResponse('Report not found', 404)

      const reportedUserId: string | null = (report.reported_id || report.reported_user_id) as string | null
      if (!reportedUserId) return errorResponse('No reported user on this report', 400)

      // Get current trust score (default to 50 if missing)
      const { data: ts } = await supabase
        .from('trust_scores')
        .select('score, complaint_count')
        .eq('user_id', reportedUserId)
        .maybeSingle()

      const currentScore = ts ? Number(ts.score) : 50
      const currentComplaints = ts ? Number(ts.complaint_count) : 0
      const newScore = penalty >= 9999 ? 0 : Math.max(0, currentScore - penalty)
      const newLevel = newScore >= 80 ? 'trusted' : newScore >= 60 ? 'active' : 'basic'
      const newComplaintCount = currentComplaints + 1

      // Upsert trust_scores
      await supabase.from('trust_scores').upsert({
        user_id: reportedUserId,
        score: newScore,
        level: newLevel,
        complaint_count: newComplaintCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Update users table trust columns
      await supabase
        .from('users')
        .update({ trust_score: newScore, trust_level: newLevel })
        .eq('id', reportedUserId)

      // Resolve the report
      await supabase.from('reports').update({
        status: 'resolved',
        resolution: resolutionNote,
        resolved_at: new Date().toISOString(),
      }).eq('id', id)

      // Notify the penalized user
      const penaltyLabel = penalty >= 9999 ? 'Your account has been suspended due to a serious violation.' : `Your trust score has been reduced by ${penalty} points due to a reported violation.`
      await supabase.from('notifications').insert({
        user_id: reportedUserId,
        type: 'system',
        title: penalty >= 9999 ? 'Account Suspended' : 'Trust Score Penalty',
        message: `${penaltyLabel} New score: ${newScore}/100. If you believe this is an error, contact support.`,
        is_read: false,
        link: '/settings',
      })

      return jsonResponse({ data: { newScore, newLevel, newComplaintCount } })
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
