/**
 * RAG (Retrieval-Augmented Generation) Engine
 *
 * In-memory vector store for resume search.
 * Architecture:
 *  - Each indexed resume is converted to a "document" with metadata
 *  - TF-IDF–style keyword scoring + Gemini semantic re-ranking for top results
 *  - Supports natural-language queries like "resumes with data analytics experience"
 *
 * Why not embeddings?
 *  - Gemini embedding API adds latency + cost for each query
 *  - For < 10k documents, TF-IDF + keyword overlap is faster and cheaper
 *  - Gemini re-ranks only the top-K candidates (hybrid approach)
 */

import type { ResumeData } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RAGDocument {
  /** Worker user ID */
  workerId: string
  /** Worker name */
  workerName: string
  /** Raw resume text */
  text: string
  /** Parsed resume data */
  parsed: ResumeData
  /** Phone for contact */
  phone?: string
  /** Pre-computed lowercase tokens for fast matching */
  _tokens: string[]
  /** Skills lowercased for fast lookup */
  _skillsLower: string[]
  /** Index timestamp */
  indexedAt: number
}

export interface RAGSearchResult {
  workerId: string
  workerName: string
  phone?: string
  score: number
  matchedSkills: string[]
  matchedKeywords: string[]
  parsed: ResumeData
  /** AI-generated relevance explanation */
  explanation?: string
}

export interface RAGQuery {
  text: string
  /** Optional: filter by specific skills */
  skills?: string[]
  /** Optional: minimum experience years */
  minExperience?: number
  /** Max results to return */
  limit?: number
}

// ── RAG Store (singleton) ──────────────────────────────────────────────────────

class RAGStore {
  private documents: Map<string, RAGDocument> = new Map()

  /** Add or update a worker's resume in the index */
  index(doc: Omit<RAGDocument, '_tokens' | '_skillsLower' | 'indexedAt'>): void {
    const text = doc.text.toLowerCase()
    const tokens = tokenize(text)
    const skillsLower = doc.parsed.skills.map((s) => s.toLowerCase())

    this.documents.set(doc.workerId, {
      ...doc,
      _tokens: tokens,
      _skillsLower: skillsLower,
      indexedAt: Date.now(),
    })
  }

  /** Remove a worker's resume from the index */
  remove(workerId: string): void {
    this.documents.delete(workerId)
  }

  /** Get indexed document count */
  get size(): number {
    return this.documents.size
  }

  /** Search resumes using keyword + TF-IDF scoring */
  search(query: RAGQuery): RAGSearchResult[] {
    const limit = query.limit ?? 10
    const queryTokens = tokenize(query.text.toLowerCase())
    const querySkills = (query.skills ?? []).map((s) => s.toLowerCase())

    // Merge query text tokens and explicit skills
    const allQueryTerms = [...new Set([...queryTokens, ...querySkills])]

    if (allQueryTerms.length === 0 && !query.minExperience) {
      return []
    }

    const results: RAGSearchResult[] = []

    for (const [, doc] of this.documents) {
      const score = this.scoreDocument(doc, allQueryTerms, querySkills, query.minExperience)
      if (score.total > 0) {
        results.push({
          workerId: doc.workerId,
          workerName: doc.workerName,
          phone: doc.phone,
          score: score.total,
          matchedSkills: score.matchedSkills,
          matchedKeywords: score.matchedKeywords,
          parsed: doc.parsed,
        })
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }

  /** Get all indexed workers (for debugging / admin) */
  getAllDocuments(): RAGDocument[] {
    return Array.from(this.documents.values())
  }

  /** Clear the entire index */
  clear(): void {
    this.documents.clear()
  }

  // ── Scoring ──────────────────────────────────────────────────────────────

  private scoreDocument(
    doc: RAGDocument,
    queryTerms: string[],
    querySkills: string[],
    minExperience?: number
  ): { total: number; matchedSkills: string[]; matchedKeywords: string[] } {
    let score = 0
    const matchedSkills: string[] = []
    const matchedKeywords: string[] = []

    // 1. Skill match (highest weight: 5 points per skill)
    for (const skill of querySkills) {
      if (doc._skillsLower.some((s) => s.includes(skill) || skill.includes(s))) {
        score += 5
        const original = doc.parsed.skills.find((s) => s.toLowerCase().includes(skill))
        if (original) matchedSkills.push(original)
      }
    }

    // 2. Token/keyword match in resume text (1 point each)
    for (const term of queryTerms) {
      if (term.length < 3) continue // skip tiny words
      const count = countOccurrences(doc._tokens, term)
      if (count > 0) {
        score += Math.min(count, 3) // cap at 3 per term to avoid keyword stuffing
        matchedKeywords.push(term)
      }
    }

    // 3. Experience entries that mention query terms (3 points each)
    for (const exp of doc.parsed.experience) {
      const expText = `${exp.title} ${exp.company} ${exp.description}`.toLowerCase()
      for (const term of queryTerms) {
        if (term.length >= 3 && expText.includes(term)) {
          score += 3
          if (!matchedKeywords.includes(term)) matchedKeywords.push(term)
        }
      }
    }

    // 4. Project match (2 points each project that mentions query terms)
    for (const proj of doc.parsed.projects) {
      const projText = `${proj.name} ${proj.description} ${proj.technologies.join(' ')}`.toLowerCase()
      for (const term of queryTerms) {
        if (term.length >= 3 && projText.includes(term)) {
          score += 2
          if (!matchedKeywords.includes(term)) matchedKeywords.push(term)
        }
      }
    }

    // 5. Education match (1 point)
    for (const edu of doc.parsed.education) {
      const eduText = `${edu.degree} ${edu.institution}`.toLowerCase()
      for (const term of queryTerms) {
        if (term.length >= 3 && eduText.includes(term)) {
          score += 1
        }
      }
    }

    // 6. Experience duration filter
    if (minExperience && minExperience > 0) {
      const totalYears = estimateTotalExperienceYears(doc.parsed.experience)
      if (totalYears < minExperience) {
        score = Math.max(0, score - 10) // heavy penalty
      } else {
        score += 2 // bonus for meeting experience requirement
      }
    }

    return { total: Math.round(score * 100) / 100, matchedSkills, matchedKeywords }
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────

export const ragStore = new RAGStore()

// ── Gemini-powered semantic re-ranking ─────────────────────────────────────

const GEMINI_KEYS: string[] = (process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let _keyIdx = 0

async function callGeminiForRAG(prompt: string): Promise<string> {
  if (GEMINI_KEYS.length === 0) return ''
  const key = GEMINI_KEYS[_keyIdx % GEMINI_KEYS.length]
  _keyIdx++

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      }
    )
    if (!res.ok) return ''
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } catch {
    return ''
  }
}

/**
 * Enhanced search: keyword search + Gemini re-ranking.
 *
 * 1. Keyword search returns top 20 candidates
 * 2. Gemini re-ranks and explains the top results
 * 3. Returns top-K with AI explanations
 */
export async function ragSearch(query: RAGQuery): Promise<RAGSearchResult[]> {
  const limit = query.limit ?? 10

  // Step 1: Keyword search (fast, no API cost)
  const candidates = ragStore.search({ ...query, limit: 20 })

  if (candidates.length === 0) return []

  // If few candidates or no Gemini keys, return as-is
  if (candidates.length <= 3 || GEMINI_KEYS.length === 0) {
    return candidates.slice(0, limit)
  }

  // Step 2: Gemini re-ranking for top candidates
  const summaries = candidates.slice(0, 10).map((c, i) => {
    const skills = c.parsed.skills.slice(0, 8).join(', ')
    const exp = c.parsed.experience.slice(0, 2).map((e) => `${e.title} at ${e.company}`).join('; ')
    const proj = c.parsed.projects.slice(0, 2).map((p) => p.name).join(', ')
    return `[${i + 1}] ${c.workerName}: Skills: ${skills}. Exp: ${exp || 'N/A'}. Projects: ${proj || 'N/A'}`
  }).join('\n')

  const prompt = `You are a recruiter assistant. The employer searched: "${query.text}"
${query.skills?.length ? `Required skills: ${query.skills.join(', ')}` : ''}
${query.minExperience ? `Minimum experience: ${query.minExperience} years` : ''}

Here are the candidate summaries:
${summaries}

Return ONLY a JSON array ranking them by relevance. Each element:
{"index": <1-based>, "relevance": <0-100>, "reason": "one sentence why"}

Rules:
- Rank only relevant candidates (relevance > 30)
- Return max ${limit} results
- No markdown, only JSON array`

  try {
    const raw = await callGeminiForRAG(prompt)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const rankings = JSON.parse(cleaned) as Array<{ index: number; relevance: number; reason: string }>

    // Map back to results with AI explanations
    const reranked: RAGSearchResult[] = []
    for (const rank of rankings) {
      const idx = rank.index - 1
      if (idx >= 0 && idx < candidates.length) {
        reranked.push({
          ...candidates[idx],
          score: rank.relevance,
          explanation: rank.reason,
        })
      }
    }

    // Sort by relevance descending
    reranked.sort((a, b) => b.score - a.score)
    return reranked.slice(0, limit)
  } catch {
    // Gemini failed — return keyword results
    return candidates.slice(0, limit)
  }
}

/**
 * Natural language query parser.
 * Extracts skills, experience requirements, and keywords from a free-text query.
 */
export async function parseRAGQuery(naturalQuery: string): Promise<RAGQuery> {
  if (GEMINI_KEYS.length === 0) {
    // No API key — basic keyword extraction
    return { text: naturalQuery, limit: 10 }
  }

  const prompt = `Parse this recruiter search query into structured filters.
Query: "${naturalQuery}"

Return ONLY JSON:
{"keywords": "search terms", "skills": ["skill1", "skill2"], "minExperience": <number or null>}

Examples:
- "find python developers with 3 years experience" → {"keywords":"python developer","skills":["Python"],"minExperience":3}
- "resumes with data analytics projects" → {"keywords":"data analytics","skills":["Data Analytics","Data Analysis"],"minExperience":null}
- "experienced plumber who knows pipe fitting" → {"keywords":"plumber pipe fitting","skills":["Plumbing","Pipe Fitting"],"minExperience":null}`

  try {
    const raw = await callGeminiForRAG(prompt)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { keywords: string; skills: string[]; minExperience: number | null }

    return {
      text: parsed.keywords || naturalQuery,
      skills: parsed.skills?.filter(Boolean),
      minExperience: parsed.minExperience ?? undefined,
      limit: 10,
    }
  } catch {
    return { text: naturalQuery, limit: 10 }
  }
}

// ── Utility functions ─────────────────────────────────────────────────────────

/** Tokenize text: lowercase, split on non-alpha, deduplicate */
function tokenize(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2)
  )]
}

/** Count how many tokens in the doc match or contain the query term */
function countOccurrences(docTokens: string[], term: string): number {
  return docTokens.filter((t) => t.includes(term) || term.includes(t)).length
}

/** Estimate total years of experience from parsed experience entries */
function estimateTotalExperienceYears(experience: ResumeData['experience']): number {
  let totalMonths = 0

  for (const exp of experience) {
    const duration = exp.duration.toLowerCase()

    // Try to parse "Jan 2020 - Dec 2022" format
    const yearMatch = duration.match(/\b(20\d{2}|19\d{2})\b/g)
    if (yearMatch && yearMatch.length >= 2) {
      const years = Math.abs(parseInt(yearMatch[yearMatch.length - 1]) - parseInt(yearMatch[0]))
      totalMonths += years * 12
      continue
    }

    // Try "X years" or "X months" format
    const yearsMatch = duration.match(/(\d+)\s*(?:year|yr)/i)
    const monthsMatch = duration.match(/(\d+)\s*(?:month|mo)/i)
    if (yearsMatch) totalMonths += parseInt(yearsMatch[1]) * 12
    if (monthsMatch) totalMonths += parseInt(monthsMatch[1])

    // Try "Present/Current" — assume 1 year from latest year
    if (/present|current|ongoing/i.test(duration) && yearMatch?.length === 1) {
      const startYear = parseInt(yearMatch[0])
      totalMonths += (new Date().getFullYear() - startYear) * 12
    }
  }

  return Math.round(totalMonths / 12)
}

/**
 * Bulk index multiple workers' resumes.
 * Useful for initial load when employer opens RAG search page.
 */
export function bulkIndex(
  workers: Array<{
    workerId: string
    workerName: string
    phone?: string
    text: string
    parsed: ResumeData
  }>
): number {
  let count = 0
  for (const w of workers) {
    if (w.text && w.parsed) {
      ragStore.index(w)
      count++
    }
  }
  return count
}
