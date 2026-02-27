import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, requireAuth } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const conversationId = url.searchParams.get('conversationId')
  const applicationId = url.searchParams.get('applicationId')
  const method = req.method

  try {
    const auth = await requireAuth(req, supabase)
    if ('error' in auth) return auth.error

    if (method === 'GET' && type === 'conversations') {
      let query = supabase
        .from('chat_conversations')
        .select('*')
        .contains('participants', [auth.user.id])
        .order('updated_at', { ascending: false })

      if (applicationId) {
        query = query.eq('application_id', applicationId)
      }

      const { data: convs, error: convErr } = await query

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

      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', auth.user.id)
        .eq('read', false)

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
        if (!body.conversationId) return errorResponse('Conversation ID is required', 400)

        const message = typeof body.message === 'string' ? body.message.trim() : ''
        if (!message && !body.attachmentUrl) return errorResponse('Message or attachment is required', 400)
        if (message && message.length > 2000) return errorResponse('Message is too long', 400)

        if (message) {
          const blockedReason = getBlockedMessageReason(message)
          if (blockedReason) return errorResponse(blockedReason, 400)
        }

        const { data: conversation, error: conversationError } = await supabase
          .from('chat_conversations')
          .select('participants')
          .eq('id', body.conversationId)
          .maybeSingle()
        if (conversationError) throw conversationError
        if (!conversation) return errorResponse('Conversation not found', 404)

        const participants = (conversation.participants || []) as string[]
        if (!participants.includes(auth.user.id)) return errorResponse('Forbidden', 403)

        const messageData: Record<string, unknown> = {
          conversation_id: body.conversationId,
          sender_id: requestedSender,
          message: message || '',
          read: false,
        }

        // Add attachment fields if present
        if (body.attachmentUrl) {
          messageData.attachment_url = body.attachmentUrl
          messageData.attachment_name = body.attachmentName || null
          messageData.attachment_type = body.attachmentType || null
          messageData.attachment_size = body.attachmentSize || null
        }

        const { data, error } = await supabase
          .from('chat_messages')
          .insert(messageData)
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
    attachmentUrl: row.attachment_url || undefined,
    attachmentName: row.attachment_name || undefined,
    attachmentType: row.attachment_type || undefined,
    attachmentSize: row.attachment_size ? Number(row.attachment_size) : undefined,
  }
}

function getBlockedMessageReason(message: string): string | null {
  const emailPattern = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i
  if (emailPattern.test(message)) {
    return 'Email addresses cannot be shared in chat'
  }

  const phonePatterns = [
    /\+91\s*[6-9]\d{9}/,
    /\b0?[6-9]\d{9}\b/,
    /\b91[6-9]\d{9}\b/,
    // Only block 10+ consecutive digits (with optional separators) to avoid false positives
    /(?:\d[\s\-.]?){10,}/,
  ]
  for (const pattern of phonePatterns) {
    if (pattern.test(message)) {
      return 'Phone numbers cannot be shared in chat'
    }
  }

  const offPlatformPattern = /\b(whatsapp|wa\.me|telegram|signal|wechat)\b/i
  if (offPlatformPattern.test(message)) {
    return 'External contact sharing is not allowed'
  }

  return null
}
