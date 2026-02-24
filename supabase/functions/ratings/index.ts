import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const method = req.method
  const userId = url.searchParams.get('userId')

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error

    if (method === 'POST') {
      const body = await req.json()
      const { jobId, applicationId, toUserId, rating, feedback } = body

      if (!jobId || !applicationId || !toUserId || rating === undefined) {
        return errorResponse('jobId, applicationId, toUserId, rating are required', 400)
      }

      const numericRating = Number(rating)
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return errorResponse('rating must be between 1 and 5', 400)
      }

      const { data: existing, error: existingError } = await supabase
        .from('ratings')
        .select('id')
        .eq('job_id', jobId)
        .eq('application_id', applicationId)
        .eq('from_user_id', auth.user.id)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) return errorResponse('Already rated for this application', 409)

      const { data, error } = await supabase
        .from('ratings')
        .insert({
          job_id: jobId,
          application_id: applicationId,
          from_user_id: auth.user.id,
          to_user_id: toUserId,
          rating: numericRating,
          feedback: feedback || null,
        })
        .select('*')
        .single()
      if (error) throw error

      await updateTrustScore(supabase, toUserId)

      return jsonResponse({
        data: {
          id: data.id,
          jobId: data.job_id,
          applicationId: data.application_id,
          fromUserId: data.from_user_id,
          toUserId: data.to_user_id,
          rating: Number(data.rating),
          feedback: data.feedback || undefined,
          createdAt: data.created_at,
        },
      })
    }

    if (method === 'GET') {
      if (!userId) return errorResponse('userId is required', 400)

      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error

      return jsonResponse({
        data: (data || []).map((row: Record<string, unknown>) => ({
          id: row.id,
          jobId: row.job_id,
          applicationId: row.application_id,
          fromUserId: row.from_user_id,
          toUserId: row.to_user_id,
          rating: Number(row.rating),
          feedback: row.feedback || undefined,
          createdAt: row.created_at,
        })),
      })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('ratings function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

async function updateTrustScore(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('to_user_id', userId)
  if (error || !ratings || ratings.length === 0) return

  const totalRatings = ratings.length
  const avgRating =
    ratings.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.rating || 0), 0) / totalRatings

  const ratingScore = ((avgRating - 1) / 4) * 30
  const completionBonus = Math.min(totalRatings * 2, 20)
  const trustScore = Math.min(Math.round(50 + ratingScore + completionBonus), 100)
  const trustLevel = trustScore >= 80 ? 'trusted' : trustScore >= 60 ? 'active' : 'basic'

  await supabase
    .from('trust_scores')
    .upsert(
      {
        user_id: userId,
        score: trustScore,
        level: trustLevel,
        average_rating: Math.round(avgRating * 10) / 10,
        total_ratings: totalRatings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  await supabase
    .from('users')
    .update({
      trust_score: trustScore,
      trust_level: trustLevel,
    })
    .eq('id', userId)
}
