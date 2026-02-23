// lib/supabase/client.ts
// Lightweight Supabase browser client — used ONLY for Realtime subscriptions.
// All data operations go through lib/api.ts (Edge Functions).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton used for Realtime channel subscriptions in chat pages
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,   // Auth is handled by our own Edge Function sessions
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/** @deprecated Use named export `supabase` instead */
export function getSupabaseBrowserClient() {
  return supabase
}
