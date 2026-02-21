import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mapConversation } from '@/lib/supabase/mappers'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ data: [] })
    }

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data: (data || []).map(mapConversation) })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
