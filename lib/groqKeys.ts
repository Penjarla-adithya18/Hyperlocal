/**
 * Groq API key round-robin manager
 *
 * Loads keys from Supabase `app_config` table at runtime so keys can be
 * rotated / added without redeployment.  Falls back to GROQ_API_KEYS env
 * var (comma-separated) if Supabase lookup fails, and finally to the legacy
 * single GROQ_API_KEY value.
 *
 * Usage:
 *   const key = await nextGroqKey()       // server-side only
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://yecelpnlaruavifzxunw.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ── In-memory cache ───────────────────────────────────────────────────────────
let _keys: string[] = []
let _idx = 0
let _lastFetch = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // refresh from Supabase every 5 minutes

// ── Load keys from Supabase app_config ───────────────────────────────────────
async function loadKeysFromSupabase(): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.groq_api_keys&select=value`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        // Do not cache at the fetch layer — we handle TTL ourselves
        cache: 'no-store',
      },
    )
    if (!res.ok) return []
    const rows = (await res.json()) as Array<{ value: string }>
    if (!rows.length || !rows[0].value) return []

    const keys = rows[0].value
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean)
    console.log(`[groqKeys] Loaded ${keys.length} key(s) from Supabase app_config`)
    return keys
  } catch (e) {
    console.warn('[groqKeys] Supabase fetch failed, using env fallback:', e)
    return []
  }
}

// ── Env-var fallback ──────────────────────────────────────────────────────────
function loadKeysFromEnv(): string[] {
  const multi = (process.env.GROQ_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (multi.length > 0) return multi

  const single = (process.env.GROQ_API_KEY ?? '').trim()
  return single ? [single] : []
}

// ── Ensure pool is populated (with TTL refresh) ───────────────────────────────
async function ensureKeys(): Promise<void> {
  const now = Date.now()
  if (_keys.length > 0 && now - _lastFetch < CACHE_TTL_MS) return

  const fromSupabase = await loadKeysFromSupabase()
  _keys = fromSupabase.length > 0 ? fromSupabase : loadKeysFromEnv()
  _lastFetch = now

  if (_keys.length === 0) {
    console.error('[groqKeys] No Groq API keys found in Supabase or env vars!')
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns the next Groq API key in round-robin order */
export async function nextGroqKey(): Promise<string | undefined> {
  await ensureKeys()
  if (_keys.length === 0) return undefined
  const key = _keys[_idx % _keys.length]
  _idx++
  return key
}

/** Returns a snapshot of the current key pool (for diagnostics) */
export async function getGroqKeyStats(): Promise<{ total: number; currentIdx: number; source: string }> {
  await ensureKeys()
  return {
    total: _keys.length,
    currentIdx: _idx % Math.max(_keys.length, 1),
    source: _keys.length > 0 ? 'loaded' : 'empty',
  }
}
