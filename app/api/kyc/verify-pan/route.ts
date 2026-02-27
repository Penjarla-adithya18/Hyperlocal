import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/kyc/verify-pan
 *
 * Verifies a PAN card number via the Sandbox.co.in API and checks
 * whether the registered name on the PAN matches the name the user
 * provided at signup.
 *
 * Body: { pan: string, fullName: string }
 * Returns: { verified, panName, nameMatch, category, message }
 */

const SANDBOX_BASE = 'https://api.sandbox.co.in'
const API_KEY = process.env.SANDBOX_API_KEY ?? ''
const API_SECRET = process.env.SANDBOX_API_SECRET ?? ''

// Simple Levenshtein-based similarity (0-1) for fuzzy name matching
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim()
  const s2 = b.toLowerCase().trim()
  if (s1 === s2) return 1

  const len1 = s1.length
  const len2 = s2.length
  const matrix: number[][] = Array.from({ length: len1 + 1 }, (_, i) =>
    Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  const maxLen = Math.max(len1, len2)
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen
}

// Normalise Indian names for comparison — strip titles, extra spaces, etc.
function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|shri|smt|dr|prof)\b\.?/gi, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pan, fullName } = body as { pan?: string; fullName?: string }

    // ── Validate inputs ────────────────────────────────────────────────
    if (!pan || !fullName) {
      return NextResponse.json(
        { verified: false, message: 'PAN number and full name are required' },
        { status: 400 },
      )
    }

    const panUpper = pan.toUpperCase().trim()
    // Indian PAN format: 5 letters, 4 digits, 1 letter  e.g. ABCDE1234F
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panUpper)) {
      return NextResponse.json(
        { verified: false, message: 'Invalid PAN format. Expected format: ABCDE1234F' },
        { status: 400 },
      )
    }

    if (!API_KEY || !API_SECRET) {
      return NextResponse.json(
        { verified: false, message: 'KYC service is not configured. Contact admin.' },
        { status: 500 },
      )
    }

    // ── Call Sandbox PAN Verification API ──────────────────────────────
    const res = await fetch(`${SANDBOX_BASE}/pans/${panUpper}/verify`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': API_KEY,
        'x-api-secret': API_SECRET,
        'x-api-version': '2.0',
      },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`Sandbox PAN API error (${res.status}):`, errText)

      if (res.status === 404) {
        return NextResponse.json(
          { verified: false, message: 'PAN number not found. Please check and try again.' },
          { status: 200 },
        )
      }
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          { verified: false, message: 'KYC service authentication failed. Contact admin.' },
          { status: 500 },
        )
      }

      return NextResponse.json(
        { verified: false, message: 'PAN verification service unavailable. Try again later.' },
        { status: 502 },
      )
    }

    const json = await res.json()
    const data = json?.data

    if (!data || !data.full_name) {
      return NextResponse.json(
        { verified: false, message: 'Unable to retrieve PAN details. Try again later.' },
        { status: 200 },
      )
    }

    // ── Compare names ──────────────────────────────────────────────────
    const panName = data.full_name as string
    const normPan = normaliseName(panName)
    const normUser = normaliseName(fullName)

    // Match if ≥ 75% similar OR if one name fully contains the other
    const sim = similarity(normPan, normUser)
    const contains = normPan.includes(normUser) || normUser.includes(normPan)
    const nameMatch = sim >= 0.75 || contains

    return NextResponse.json({
      verified: true,
      pan: panUpper,
      panName,
      nameMatch,
      similarity: Math.round(sim * 100),
      category: data.category ?? 'Unknown',       // Individual / Company etc.
      message: nameMatch
        ? 'PAN verified successfully. Name matches.'
        : `Name mismatch. PAN is registered to "${panName}". Please enter your name exactly as on PAN card.`,
    })
  } catch (err) {
    console.error('PAN KYC verification error:', err)
    return NextResponse.json(
      { verified: false, message: 'Internal server error during KYC verification.' },
      { status: 500 },
    )
  }
}
