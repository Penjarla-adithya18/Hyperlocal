import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth, requireRole } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const roleError = requireRole(auth.user, ['admin'])
    if (roleError) return roleError

    if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

    if (type === 'stats') {
      const [
        { count: totalUsers },
        { count: totalWorkers },
        { count: totalEmployers },
        { count: totalJobs },
        { count: activeJobs },
        { count: completedJobs },
        { count: totalApplications },
        { count: pendingApplications },
        { count: totalReports },
        { count: unhandledReports },
        { data: allEscrow },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('escrow_transactions').select('amount, status'),
      ])

      const escrowRows = allEscrow || []
      const totalEscrow = escrowRows.reduce((sum: number, t: Record<string, number>) => sum + Number(t.amount || 0), 0)
      const heldEscrow = escrowRows
        .filter((t: Record<string, string>) => t.status === 'held')
        .reduce((sum: number, t: Record<string, number>) => sum + Number(t.amount || 0), 0)

      return jsonResponse({
        data: {
          totalUsers: totalUsers || 0,
          totalWorkers: totalWorkers || 0,
          totalEmployers: totalEmployers || 0,
          totalJobs: totalJobs || 0,
          activeJobs: activeJobs || 0,
          completedJobs: completedJobs || 0,
          totalApplications: totalApplications || 0,
          pendingApplications: pendingApplications || 0,
          totalReports: totalReports || 0,
          unhandledReports: unhandledReports || 0,
          totalEscrow,
          heldEscrow,
        },
      })
    }

    return errorResponse('Unknown type', 400)
  } catch (err) {
    console.error('admin function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})
