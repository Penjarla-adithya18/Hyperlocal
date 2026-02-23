import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const conversationId = url.searchParams.get('conversationId')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error

    if (method === 'GET' && type === 'conversations') {
      const { data: convs, error: convErr } = await supabase
        .from('chat_conversations')
        .select('*')
        .contains('participants', [auth.user.id])
        .order('updated_at', { ascending: false })

      if (convErr) throw convErr
      if (!convs || convs.length === 0) return jsonResponse({ data: [] })

      const ids = (convs as Record<string, unknown>[]).map((c) => c.id as string)
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })

      const lastByConv = new Map<string, Record<string, unknown>>()
      for (const message of (messages || []) as Record<string, unknown>[]) {
        const key = message.conversation_id as string
        if (!lastByConv.has(key)) lastByConv.set(key, message)
      }

      const data = (convs as Record<string, unknown>[]).map((c) => ({
        id: c.id,
        participants: (c.participants as string[]) || [],
        jobId: c.job_id || undefined,
        applicationId: c.application_id || undefined,
        updatedAt: c.updated_at || c.created_at,
        lastMessage: lastByConv.has(c.id as string)
          ? (() => {
              const m = lastByConv.get(c.id as string)!
              return { id: m.id, senderId: m.sender_id, message: m.message, createdAt: m.created_at, read: !!m.read }
            })()
          : undefined,
      }))

      return jsonResponse({ data })
    }

    if (method === 'GET' && type === 'messages') {
      if (!conversationId) return jsonResponse({ data: [] })

      const { data: conversation, error: conversationError } = await supabase
        .from('chat_conversations')
        .select('participants')
        .eq('id', conversationId)
        .maybeSingle()
      if (conversationError) throw conversationError
      if (!conversation) return jsonResponse({ data: [] })

      const participants = (conversation.participants || []) as string[]
      if (!participants.includes(auth.user.id)) return errorResponse('Forbidden', 403)

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return jsonResponse({ data: (data || []).map(mapMessage) })
    }

    if (method === 'POST') {
      const body = await req.json()

      if (body.type === 'conversation') {
        const participants = (body.participants || []) as string[]
        if (!participants.includes(auth.user.id)) return errorResponse('Forbidden', 403)
        if (participants.length < 2) return errorResponse('At least two participants required', 400)

        const { data, error } = await supabase
          .from('chat_conversations')
          .insert({
            participants,
            worker_id: body.workerId || null,
            employer_id: body.employerId || null,
            job_id: body.jobId || null,
            application_id: body.applicationId || null,
          })
          .select('*')
          .single()
        if (error) throw error

        return jsonResponse({
          data: {
            id: data.id,
            participants: data.participants || [],
            jobId: data.job_id || undefined,
            applicationId: data.application_id || undefined,
            updatedAt: data.updated_at || data.created_at,
          },
        })
      }

      if (body.type === 'message' || body.conversationId) {
        const requestedSender = body.senderId as string
        if (requestedSender !== auth.user.id) return errorResponse('Forbidden', 403)

        const { data: conversation, error: conversationError } = await supabase
          .from('chat_conversations')
          .select('participants')
          .eq('id', body.conversationId)
          .maybeSingle()
        if (conversationError) throw conversationError
        if (!conversation) return errorResponse('Conversation not found', 404)

        const participants = (conversation.participants || []) as string[]
        if (!participants.includes(auth.user.id)) return errorResponse('Forbidden', 403)

        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: body.conversationId,
            sender_id: requestedSender,
            message: body.message,
            read: false,
          })
          .select('*')
          .single()
        if (error) throw error

        await supabase
          .from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', body.conversationId)

        return jsonResponse({ data: mapMessage(data) })
      }

      return errorResponse('Missing type in body', 400)
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    console.error('chat function error:', err)
    return errorResponse(err instanceof Error ? err.message : 'Internal server error')
  }
})

function mapMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sessionId: row.conversation_id,
    senderId: row.sender_id,
    message: row.message,
    createdAt: row.created_at,
    read: !!row.read,
    isRead: !!row.read,
  }
}
