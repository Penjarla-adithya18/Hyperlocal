/**
 * /api/ratings — Submit ratings and recalculate trust scores.
 * Uses service-role key to bypass RLS (server-side only).
 *
 * Trust score formula:
 *   base            = 50
 *   ratingBonus     = (avgRating > 0) ? ((avgRating - 1) / 4) * 30 : 0   → 0–30 pts
 *   completionBonus = completionRate * 0.25                                → 0–25 pts
 *   paymentBonus    = min(successfulPayments * 2, 15)                      → 0–15 pts
 *   complaintPenalty= complaintCount * 8                                   → −8 per complaint
 *   finalScore      = clamp(base + rating + completion + payment − penalty, 0, 100)
 *   level           = score ≥ 80 → trusted | ≥ 60 → active | else basic
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function db() {
  return createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)
}

function sha256(input: string) {
  return createHash('sha256').update(input, 'utf8').digest('base64url')
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? ''
  const [scheme, value] = auth.split(' ')
  return scheme?.toLowerCase() === 'bearer' && value ? value.trim() : null
}

async function getSessionUserId(
  supabase: ReturnType<typeof db>,
  rawToken: string
): Promise<string | null> {
  const tokenHash = sha256(rawToken)
  const { data: session } = await supabase
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('token', tokenHash)
    .maybeSingle()
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null
  return session.user_id as string
}

function computeTrustScore(params: {
  averageRating: number
  totalRatings: number
  completionRate: number
  complaintCount: number
  successfulPayments: number
}): { score: number; level: string } {
  const { averageRating, totalRatings, completionRate, complaintCount, successfulPayments } = params
  const ratingBonus = totalRatings > 0 ? ((averageRating - 1) / 4) * 30 : 0
  const completionBonus = completionRate * 0.25
  const paymentBonus = Math.min(successfulPayments * 2, 15)
  const complaintPenalty = complaintCount * 8
  const raw = 50 + ratingBonus + completionBonus + paymentBonus - complaintPenalty
  const score = Math.round(Math.min(100, Math.max(0, raw)))
  const level = score >= 80 ? 'trusted' : score >= 60 ? 'active' : 'basic'
  return { score, level }
}

// ─── POST /api/ratings ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = db()

    const rawToken = extractToken(req)
    if (!rawToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fromUserId = await getSessionUserId(supabase, rawToken)
    if (!fromUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      toUserId: string
      jobId: string
      applicationId?: string
      rating: number
      feedback?: string
    }

    const { toUserId, jobId, rating, feedback, applicationId } = body

    if (!toUserId || !jobId || !rating) {
      return NextResponse.json({ error: 'toUserId, jobId, and rating are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 })
    }

    // ── Prevent duplicate rating for same job by same person ────────────────
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', toUserId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already rated this person for this job' }, { status: 409 })
    }

    // ── Insert rating ────────────────────────────────────────────────────────
    const insertPayload: Record<string, unknown> = {
      job_id: jobId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      rating,
      feedback: feedback?.trim() || null,
    }
    if (applicationId) insertPayload.application_id = applicationId

    const { data: newRating, error: insertErr } = await supabase
      .from('ratings')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertErr) {
      console.error('[ratings] insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // ── Recalculate trust score for the rated user ───────────────────────────
    const [{ data: allRatings }, { data: existingTs }, { data: ratedUser }] = await Promise.all([
      supabase.from('ratings').select('rating').eq('to_user_id', toUserId),
      supabase.from('trust_scores').select('*').eq('user_id', toUserId).maybeSingle(),
      supabase.from('users').select('id, role').eq('id', toUserId).maybeSingle(),
    ])

    const ratings = (allRatings ?? []) as { rating: number }[]
    const totalRatings = ratings.length
    const averageRating = totalRatings > 0
      ? ratings.reduce((s, r) => s + Number(r.rating), 0) / totalRatings
      : 0

    // Completion rate (workers only): completed applications / total accepted
    let completionRate = existingTs?.job_completion_rate ?? 0
    if (ratedUser?.role === 'worker') {
      const { data: apps } = await supabase
        .from('applications')
        .select('status')
        .eq('worker_id', toUserId)
        .in('status', ['accepted', 'completed'])
      const appList = (apps ?? []) as { status: string }[]
      const total = appList.length
      const completed = appList.filter((a) => a.status === 'completed').length
      completionRate = total > 0 ? (completed / total) * 100 : 0
    }

    const complaintCount = existingTs?.complaint_count ?? 0
    const successfulPayments = existingTs?.successful_payments ?? 0

    const { score: newScore, level: newLevel } = computeTrustScore({
      averageRating,
      totalRatings,
      completionRate,
      complaintCount,
      successfulPayments,
    })

    // ── Upsert trust_scores ──────────────────────────────────────────────────
    await supabase.from('trust_scores').upsert(
      {
        user_id: toUserId,
        score: newScore,
        level: newLevel,
        average_rating: Math.round(averageRating * 100) / 100,
        total_ratings: totalRatings,
        job_completion_rate: Math.round(completionRate * 10) / 10,
        complaint_count: complaintCount,
        successful_payments: successfulPayments,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    // ── Sync users table trust columns ───────────────────────────────────────
    await supabase
      .from('users')
      .update({ trust_score: newScore, trust_level: newLevel })
      .eq('id', toUserId)

    // ── Send notification ────────────────────────────────────────────────────
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))
    await supabase.from('notifications').insert({
      user_id: toUserId,
      type: 'rating',
      title: 'New Rating Received',
      message: `You received a ${Math.round(rating)}/5 ${stars} rating.${feedback ? ` "${feedback.slice(0, 80)}${feedback.length > 80 ? '…' : ''}"` : ''}`,
      is_read: false,
      link: '/settings',
    })

    return NextResponse.json({
      data: {
        rating: {
          id: newRating.id,
          jobId,
          fromUserId,
          toUserId,
          rating,
          feedback: feedback ?? null,
          createdAt: newRating.created_at,
        },
        trustScore: { newScore, newLevel, averageRating: Math.round(averageRating * 10) / 10, totalRatings },
      },
    })
  } catch (err) {
    console.error('[ratings] POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── GET /api/ratings?userId=xxx OR ?fromUserId=xxx ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = db()
    const params = new URL(req.url).searchParams
    const userId = params.get('userId')
    const fromUserId = params.get('fromUserId')
    if (!userId && !fromUserId)
      return NextResponse.json({ error: 'userId or fromUserId is required' }, { status: 400 })

    let q = supabase
      .from('ratings')
      .select('id, job_id, from_user_id, to_user_id, rating, feedback, created_at')
    if (userId) q = q.eq('to_user_id', userId)
    if (fromUserId) q = q.eq('from_user_id', fromUserId)
    const { data, error } = await q.order('created_at', { ascending: false })

    if (error) throw error

    const mapped = (data ?? []).map((r) => ({
      id: r.id,
      jobId: r.job_id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      rating: Number(r.rating),
      feedback: r.feedback ?? undefined,
      createdAt: r.created_at,
    }))

    return NextResponse.json({ data: mapped })
  } catch (err) {
    console.error('[ratings] GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
