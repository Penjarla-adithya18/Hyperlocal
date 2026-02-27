/**
 * Admin penalize route — runs server-side with service role key (bypasses RLS).
 * No edge function deployment required.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function getServiceClient() {
  // Service role key bypasses all RLS — safe because this is server-side only.
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY || ANON_KEY)
}

/** Replicate the edge function's SHA-256 base64url hashing */
function sha256Base64Url(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('base64url')
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? ''
  const [scheme, value] = auth.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null
  return value.trim()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient()

    // ── Validate admin session (mirrors edge function requireAuth) ──────────
    const rawToken = extractToken(req)
    if (!rawToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokenHash = sha256Base64Url(rawToken)

    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', tokenHash)
      .maybeSingle()

    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', session.user_id)
      .maybeSingle()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json()
    const reportId: string = body.reportId ?? ''
    const penalty: number = Number(body.penalty ?? 0)
    const resolution: string =
      (body.resolution as string | undefined)?.trim() ||
      (penalty >= 9999
        ? 'Account suspended by admin.'
        : `Trust score penalized by ${penalty} points by admin.`)

    if (!reportId || penalty <= 0) {
      return NextResponse.json({ error: 'reportId and penalty are required' }, { status: 400 })
    }

    // ── Get reported user from report ───────────────────────────────────────
    const { data: report } = await supabase
      .from('reports')
      .select('reported_id, reported_user_id')
      .eq('id', reportId)
      .maybeSingle()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const reportedUserId: string = report.reported_id || report.reported_user_id || ''
    if (!reportedUserId) {
      return NextResponse.json({ error: 'No reported user on this report' }, { status: 400 })
    }

    // ── Get current trust score ─────────────────────────────────────────────
    const { data: ts } = await supabase
      .from('trust_scores')
      .select('score, complaint_count, job_completion_rate, average_rating, total_ratings, successful_payments')
      .eq('user_id', reportedUserId)
      .maybeSingle()

    const currentScore = ts ? Number(ts.score) : 50
    const currentComplaints = ts ? Number(ts.complaint_count) : 0
    const newScore = penalty >= 9999 ? 0 : Math.max(0, currentScore - penalty)
    const newLevel = newScore >= 80 ? 'trusted' : newScore >= 60 ? 'active' : 'basic'
    const newComplaintCount = currentComplaints + 1

    // ── Upsert trust_scores ─────────────────────────────────────────────────
    await supabase.from('trust_scores').upsert(
      {
        user_id: reportedUserId,
        score: newScore,
        level: newLevel,
        complaint_count: newComplaintCount,
        job_completion_rate: ts?.job_completion_rate ?? 0,
        average_rating: ts?.average_rating ?? 0,
        total_ratings: ts?.total_ratings ?? 0,
        successful_payments: ts?.successful_payments ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    // ── Update users table ──────────────────────────────────────────────────
    await supabase
      .from('users')
      .update({ trust_score: newScore, trust_level: newLevel })
      .eq('id', reportedUserId)

    // ── Resolve the report ──────────────────────────────────────────────────
    await supabase
      .from('reports')
      .update({ status: 'resolved', resolution, resolved_at: new Date().toISOString() })
      .eq('id', reportId)

    // ── Notify the penalized user ───────────────────────────────────────────
    const penaltyLabel =
      penalty >= 9999
        ? 'Your account has been suspended due to a serious violation.'
        : `Your trust score has been reduced by ${penalty} points due to a reported violation.`

    await supabase.from('notifications').insert({
      user_id: reportedUserId,
      type: 'system',
      title: penalty >= 9999 ? 'Account Suspended' : 'Trust Score Penalty',
      message: `${penaltyLabel} New score: ${newScore}/100. Contact support if you believe this is an error.`,
      is_read: false,
      link: '/settings',
    })

    return NextResponse.json({ data: { newScore, newLevel, newComplaintCount } })
  } catch (err) {
    console.error('[penalize] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}


