/**
 * GSTIN Verification Service
 *
 * All external API calls are made server-side through /api/kyc/verify-gstin
 * to avoid CORS issues. The route tries (in order):
 *  1. Sandbox.co.in GST API
 *  2. ClearTax compliance-report HTML scrape
 *  3. GSTprime public JSON API
 *
 * Client-side responsibilities:
 *  - Validate GSTIN format locally (no network call)
 *  - Cache results in sessionStorage
 */

import type { GSTINDetails } from './types'

// ── GSTIN format validation ──────────────────────────────────────────────────
// GSTIN: 2-digit state code + 10-char PAN + 1-digit entity + Z + 1-check digit
// Example: 29ABCDE1234F1Z5
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

/**
 * Validates GSTIN format locally (no API call).
 * Returns null if valid, error string if invalid.
 */
export function validateGSTINFormat(gstin: string): string | null {
  if (!gstin || gstin.trim().length === 0) return 'GSTIN is required'
  const cleaned = gstin.trim().toUpperCase()
  if (cleaned.length !== 15) return 'GSTIN must be exactly 15 characters'
  if (!GSTIN_REGEX.test(cleaned)) return 'Invalid GSTIN format'
  return null
}

// ── Session cache ────────────────────────────────────────────────────────────

function getCachedGSTIN(gstin: string): GSTINDetails | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`gstin:${gstin}`)
    if (!raw) return null
    return JSON.parse(raw) as GSTINDetails
  } catch { return null }
}

function setCachedGSTIN(gstin: string, details: GSTINDetails): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.setItem(`gstin:${gstin}`, JSON.stringify(details)) } catch { /* quota */ }
}

// ── Server-side proxy call ───────────────────────────────────────────────────

/**
 * Verify a GSTIN via the server-side proxy at /api/kyc/verify-gstin.
 * The proxy handles all external requests (Sandbox, ClearTax, GSTprime),
 * so there are no CORS issues in the browser.
 *
 * Returns GSTINDetails on success, or throws an error with a user-friendly message.
 */
export async function verifyGSTIN(gstinInput: string): Promise<GSTINDetails> {
  const gstin = gstinInput.trim().toUpperCase()

  // 1. Local format check — no network call
  const formatError = validateGSTINFormat(gstin)
  if (formatError) throw new Error(formatError)

  // 2. Session cache hit
  const cached = getCachedGSTIN(gstin)
  if (cached) return cached

  // 3. Call server-side proxy (avoids CORS)
  const res = await fetch('/api/kyc/verify-gstin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gstin }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' })) as { error?: string }
    throw new Error(err.error ?? 'GSTIN verification failed')
  }

  const details = await res.json() as GSTINDetails
  setCachedGSTIN(gstin, details)
  return details
}

/**
 * Quick check: is this GSTIN active?
 * Returns true/false without throwing.
 */
export async function isGSTINActive(gstin: string): Promise<boolean> {
  try {
    const details = await verifyGSTIN(gstin)
    return details.status.toLowerCase() === 'active'
  } catch {
    return false
  }
}
