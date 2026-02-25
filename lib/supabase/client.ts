import { createClient } from '@supabase/supabase-js'

let browserClient: any = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const env = (globalThis as any)?.process?.env || {}
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey) as any
  return browserClient
}
