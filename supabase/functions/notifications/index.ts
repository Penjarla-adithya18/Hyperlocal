import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const method = req.method
  const id = url.searchParams.get('id')

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error
    const isAdmin = auth.user.role === 'admin'

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapNotification) })
    }

    if (method === 'POST') {
      const body = await req.json()
      const { userId, type, title, message, link } = body
      if (!userId || !type || !title || !message) {
        return errorResponse('userId, type, title, message are required', 400)
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          is_read: false,
        })
        .select('*')
        .single()
      if (error) throw error
      return jsonResponse({ data: mapNotification(data) })
    }

    if (method === 'PATCH' && id) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .select('*')
        .maybeSingle()
      if (error) throw error
      return jsonResponse({ data: data ? mapNotification(data) : null })
    }

    if (method === 'DELETE') {
      if (id) {
        // Delete a single notification
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id)
          .eq('user_id', auth.user.id)
        if (error) throw error
      } else {
        // Mark all as read (bulk "clear" — keeps history for admin/reporting)
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', auth.user.id)
        if (error) throw error
      }
      return jsonResponse({ data: { ok: true } })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('notifications function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: !!row.is_read,
    link: row.link || undefined,
    createdAt: row.created_at,
  }
}
