/**
 * GSTIN Verification Service
 *
 * Uses the ClearTax compliance-report endpoint to fetch GSTIN business details.
 * URL pattern: https://cleartax.in/f/compliance-report/{GSTIN}/
 *
 * Strategy:
 *  - Validate GSTIN format locally (15-char regex) before hitting the API
 *  - Scrape the ClearTax HTML or use their JSON endpoint
 *  - Cache results in sessionStorage to avoid repeated calls
 *  - Return a structured GSTINDetails object
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

// ── ClearTax API fetch ───────────────────────────────────────────────────────

/**
 * Verify a GSTIN via the ClearTax compliance-report endpoint.
 *
 * Returns GSTINDetails on success, or throws an error with a user-friendly message.
 *
 * Note: ClearTax may block CORS from the browser. In that case, we proxy
 * through a CORS-anywhere endpoint or our own edge function. For now,
 * we attempt a direct fetch and fall back to a simulated response.
 */
export async function verifyGSTIN(gstinInput: string): Promise<GSTINDetails> {
  const gstin = gstinInput.trim().toUpperCase()

  // 1. Local format check
  const formatError = validateGSTINFormat(gstin)
  if (formatError) throw new Error(formatError)

  // 2. Session cache hit
  const cached = getCachedGSTIN(gstin)
  if (cached) return cached

  // 3. Try fetching from ClearTax (via our proxy to handle CORS)
  try {
    const details = await fetchFromClearTax(gstin)
    setCachedGSTIN(gstin, details)
    return details
  } catch (err) {
    // If API fails, try the backup GST search API
    try {
      const details = await fetchFromGSTSearchAPI(gstin)
      setCachedGSTIN(gstin, details)
      return details
    } catch {
      throw err // propagate the original ClearTax error
    }
  }
}

/**
 * Fetches GSTIN details from ClearTax.
 * ClearTax returns an HTML page; we try to get their internal JSON API first.
 */
async function fetchFromClearTax(gstin: string): Promise<GSTINDetails> {
  // ClearTax has an internal API that returns JSON for compliance reports
  const url = `https://cleartax.in/f/compliance-report/${gstin}/`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/json',
      'User-Agent': 'HyperLocalJobs/1.0',
    },
  })

  if (!res.ok) {
    if (res.status === 404) throw new Error('GSTIN not found. Please check the number.')
    throw new Error(`ClearTax verification failed (HTTP ${res.status})`)
  }

  const html = await res.text()
  return parseGSTINFromHTML(html, gstin)
}

/**
 * Parse GSTIN details from ClearTax HTML response.
 * Falls back to extracting data from embedded JSON or structured HTML.
 */
function parseGSTINFromHTML(html: string, gstin: string): GSTINDetails {
  // Try to find JSON-LD or script data in the HTML
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1])
      if (data.name || data.legalName) {
        return {
          tradeName: data.name || data.alternateName || '',
          legalName: data.legalName || data.name || '',
          status: 'Active',
          taxpayerType: data.additionalType || 'Regular',
          registeredDate: data.foundingDate,
          address: typeof data.address === 'string' ? data.address : data.address?.streetAddress,
          state: data.address?.addressRegion,
          verified: true,
          verifiedAt: new Date().toISOString(),
        }
      }
    } catch { /* continue to fallback parsing */ }
  }

  // Try to extract trade name from HTML patterns
  const tradeNameMatch = html.match(/Trade\s*Name[^:]*:\s*<[^>]*>([^<]+)/i)
    || html.match(/trade[_-]?name['"]*\s*[:=]\s*['"]*([^'"<,\n]+)/i)
  const legalNameMatch = html.match(/Legal\s*Name[^:]*:\s*<[^>]*>([^<]+)/i)
    || html.match(/legal[_-]?name['"]*\s*[:=]\s*['"]*([^'"<,\n]+)/i)
  const statusMatch = html.match(/Status[^:]*:\s*<[^>]*>([^<]+)/i)
    || html.match(/status['"]*\s*[:=]\s*['"]*([^'"<,\n]+)/i)
  const taxpayerMatch = html.match(/Taxpayer\s*Type[^:]*:\s*<[^>]*>([^<]+)/i)
    || html.match(/taxpayer[_-]?type['"]*\s*[:=]\s*['"]*([^'"<,\n]+)/i)

  const tradeName = tradeNameMatch?.[1]?.trim() || ''
  const legalName = legalNameMatch?.[1]?.trim() || ''

  if (!tradeName && !legalName) {
    // If we can't parse anything meaningful, the GSTIN might not exist
    if (html.includes('not found') || html.includes('invalid') || html.length < 500) {
      throw new Error('GSTIN not found or invalid. Please verify the number.')
    }
    // If the page loaded but we couldn't parse — return minimal info
    return {
      tradeName: `Business (${gstin})`,
      legalName: '',
      status: 'Unknown',
      taxpayerType: 'Unknown',
      verified: false,
      verifiedAt: new Date().toISOString(),
    }
  }

  return {
    tradeName,
    legalName,
    status: statusMatch?.[1]?.trim() || 'Active',
    taxpayerType: taxpayerMatch?.[1]?.trim() || 'Regular',
    verified: true,
    verifiedAt: new Date().toISOString(),
  }
}

/**
 * Alternative GST Search API (backup if ClearTax is blocked by CORS).
 * Uses a public GST verification endpoint.
 */
async function fetchFromGSTSearchAPI(gstin: string): Promise<GSTINDetails> {
  // Public GST API endpoint (no auth required)
  const url = `https://sheet.gstprime.com/gstapi/?gstin=${gstin}`

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`GST verification failed (HTTP ${res.status})`)
  }

  const data = await res.json()

  if (data.flag === false || data.error) {
    throw new Error(data.message || 'GSTIN not found')
  }

  return {
    tradeName: data.tradeNam || data.tradeName || '',
    legalName: data.legalNam || data.legalName || '',
    status: data.sts || data.status || 'Unknown',
    taxpayerType: data.dty || data.taxpayerType || 'Regular',
    registeredDate: data.rgdt || data.registrationDate,
    address: [data.stj, data.pradr?.addr?.bno, data.pradr?.addr?.st, data.pradr?.addr?.loc]
      .filter(Boolean).join(', ') || undefined,
    state: data.pradr?.addr?.stcd || undefined,
    verified: (data.sts || '').toLowerCase() === 'active',
    verifiedAt: new Date().toISOString(),
  }
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
