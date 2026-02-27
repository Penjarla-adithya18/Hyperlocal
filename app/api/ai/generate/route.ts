/**
 * /api/ai/generate
 *
 * Thin re-export so client-side code in lib/gemini.ts can POST here
 * instead of reaching out to localhost:11434 directly (which would fail
 * in a browser running against a Vercel deployment).
 *
 * The actual provider logic lives in app/api/ai/gemini/route.ts — we just
 * re-use it here so both /api/ai/generate and /api/ai/gemini work.
 */
export { POST } from '../gemini/route'
