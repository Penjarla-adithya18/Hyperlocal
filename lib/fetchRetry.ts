/**
 * Network-resilient fetch wrapper with automatic retry on transient errors.
 *
 * Retries on: ETIMEDOUT, ENOTFOUND, ECONNRESET, ECONNREFUSED, UND_ERR_CONNECT_TIMEOUT
 * Uses exponential backoff: 1s → 2s → 4s (default 3 attempts)
 */

const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'EAI_AGAIN',       // DNS temporary failure
  'ENETUNREACH',     // Network unreachable
  'EHOSTUNREACH',    // Host unreachable
])

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  // Check direct code
  const code = (err as { code?: string }).code
  if (code && RETRYABLE_CODES.has(code)) return true

  // Check cause chain (Node.js fetch wraps errors)
  const cause = (err as { cause?: unknown }).cause
  if (cause && typeof cause === 'object') {
    const causeCode = (cause as { code?: string }).code
    if (causeCode && RETRYABLE_CODES.has(causeCode)) return true
    // AggregateError (multiple connection attempts)
    const errors = (cause as { errors?: unknown[] }).errors
    if (Array.isArray(errors)) {
      return errors.some(e => isRetryableError(e))
    }
  }

  // Check error message as last resort
  const msg = String((err as { message?: string }).message ?? '')
  return /ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|getaddrinfo|connect ETIMEDOUT|fetch failed/i.test(msg)
}

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number
  /** Base delay in ms before first retry (default: 1000) */
  baseDelayMs?: number
  /** Label for console logs (e.g., 'Whisper', 'Supabase') */
  label?: string
}

/**
 * Fetch with automatic retry on transient network errors.
 * Same signature as global fetch() + retry options.
 */
export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  opts?: RetryOptions,
): Promise<Response> {
  const maxAttempts = opts?.maxAttempts ?? 3
  const baseDelay = opts?.baseDelayMs ?? 1000
  const label = opts?.label ?? 'fetch'

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init)
      return res
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts && isRetryableError(err)) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // 1s, 2s, 4s
        console.warn(
          `[${label}] Network error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms...`,
          (err as { code?: string }).code ?? (err as Error).message?.substring(0, 80),
        )
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }

  throw lastError
}

export { isRetryableError }
