import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapMessage } from '@/lib/supabase/mappers'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const conversationId = request.nextUrl.searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapMessage) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    const payload = {
      conversation_id: body.conversationId,
      sender_id: body.senderId,
      message: body.message,
      read: false,
    }

    const { data, error } = await supabase.from('chat_messages').insert(payload).select('*').single()
    if (error) throw error

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.conversationId)

    return NextResponse.json({ data: mapMessage(data) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
