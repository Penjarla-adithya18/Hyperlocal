// lib/supabase/client.ts
// Lightweight Supabase browser client — used ONLY for Realtime subscriptions.
// All data operations go through lib/api.ts (Edge Functions).
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yecelpnlaruavifzxunw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllY2VscG5sYXJ1YXZpZnp4dW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Njk5MTksImV4cCI6MjA4NzI0NTkxOX0.MaoAJIec30GfrQolYQKJ4dnvmIxTW7t0DbM_tS8xYVk'

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
