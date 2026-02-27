import { NextRequest, NextResponse } from 'next/server'
import type { GSTINDetails } from '@/lib/types'

/**
 * POST /api/kyc/verify-gstin
 *
 * Server-side proxy for GSTIN verification via ClearTax JSON API.
 * Avoids CORS issues by making the request from the Node.js server.
 *
 * ClearTax endpoint: https://cleartax.in/f/compliance-report/{GSTIN}/
 * Returns a JSON object with { taxpayerInfo, filing, compliance }.
 *
 * Body:    { gstin: string }
 * Returns: GSTINDetails | { error: string }
 */

// ── ClearTax JSON API ────────────────────────────────────────────────────────

interface ClearTaxAddr {
  bno?: string
  st?: string
  loc?: string
  dst?: string
  stcd?: string
  pncd?: string
  bnm?: string
  flno?: string
  city?: string
}

interface ClearTaxResponse {
  taxpayerInfo: {
    gstin: string
    lgnm: string          // legal name
    tradeNam: string      // trade name
    sts: string           // status  (Active / Cancelled / …)
    dty: string           // taxpayer type (Regular / Composition / …)
    rgdt: string          // registration date dd/mm/yyyy
    ctb: string           // constitution of business
    stj: string           // state jurisdiction
    ctj: string           // central jurisdiction
    nba: string[]         // nature of business activity
    pradr: { addr: ClearTaxAddr; ntr: string }      // principal address
    adadr?: { addr: ClearTaxAddr; ntr: string }[]    // additional addresses
    lstupdt?: string
    errorMsg?: string | null
  }
  filing?: unknown[]
  compliance?: { filingFrequency?: string }
}

async function fetchFromClearTax(gstin: string): Promise<GSTINDetails> {
  const url = `https://cleartax.in/f/compliance-report/${gstin}/`

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })

  if (res.status === 404) throw new Error('GSTIN not found. Please check the number.')
  if (!res.ok) throw new Error(`ClearTax returned HTTP ${res.status}`)

  const data = (await res.json()) as ClearTaxResponse

  const info = data.taxpayerInfo
  if (!info) throw new Error('Unexpected ClearTax response — no taxpayerInfo')
  if (info.errorMsg) throw new Error(info.errorMsg)

  const addr = info.pradr?.addr
  const address = addr
    ? [addr.bno, addr.bnm, addr.st, addr.loc, addr.dst, addr.stcd, addr.pncd]
        .filter(Boolean)
        .join(', ')
    : undefined

  return {
    tradeName: info.tradeNam || info.lgnm || '',
    legalName: info.lgnm || info.tradeNam || '',
    status: info.sts || 'Unknown',
    taxpayerType: info.dty || 'Regular',
    registeredDate: info.rgdt,
    address,
    state: addr?.stcd || '',
    verified: (info.sts || '').toLowerCase() === 'active',
    verifiedAt: new Date().toISOString(),
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { gstin } = (await req.json()) as { gstin?: string }

    if (!gstin || typeof gstin !== 'string' || gstin.trim().length !== 15) {
      return NextResponse.json({ error: 'Invalid GSTIN' }, { status: 400 })
    }

    const g = gstin.trim().toUpperCase()

    try {
      const details = await fetchFromClearTax(g)
      return NextResponse.json(details)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      console.warn(`[verify-gstin] ClearTax failed for ${g}: ${msg}`)
      return NextResponse.json({ error: msg }, { status: 422 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
