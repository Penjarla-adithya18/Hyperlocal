import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET' && userId) {
      if (!isAdmin && userId !== auth.user.id) return errorResponse('Forbidden', 403)

      const { data, error } = await supabase
        .from('trust_scores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapTrustScore(data) : null })
    }

    if (method === 'PATCH' && userId) {
      if (!isAdmin) return errorResponse('Forbidden', 403)

      const body = await req.json()
      const payload: Record<string, unknown> = {}
      if (body.score !== undefined) payload.score = body.score
      if (body.level !== undefined) payload.level = body.level
      if (body.jobCompletionRate !== undefined) payload.job_completion_rate = body.jobCompletionRate
      if (body.averageRating !== undefined) payload.average_rating = body.averageRating
      if (body.totalRatings !== undefined) payload.total_ratings = body.totalRatings
      if (body.complaintCount !== undefined) payload.complaint_count = body.complaintCount
      if (body.successfulPayments !== undefined) payload.successful_payments = body.successfulPayments
      payload.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('trust_scores')
        .update(payload)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapTrustScore(data) : null })
    }

    return errorResponse('Method not allowed or missing userId', 405)
  } catch (err) {
    console.error('trust-scores function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapTrustScore(row: Record<string, unknown>) {
  return {
    userId: row.user_id,
    score: Number(row.score ?? 50),
    level: row.level ?? 'basic',
    jobCompletionRate: Number(row.job_completion_rate ?? 0),
    averageRating: Number(row.average_rating ?? 0),
    totalRatings: Number(row.total_ratings ?? 0),
    complaintCount: Number(row.complaint_count ?? 0),
    successfulPayments: Number(row.successful_payments ?? 0),
    updatedAt: row.updated_at,
  }
}
