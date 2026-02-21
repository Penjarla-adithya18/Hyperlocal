import { createClient } from '@supabase/supabase-js'

function getEnv(name: string): string {
  const value = (globalThis as any)?.process?.env?.[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

export function getSupabaseServerClient() {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const env = (globalThis as any)?.process?.env || {}
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
