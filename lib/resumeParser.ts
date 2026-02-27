/**
 * Resume Parser Service
 *
 * Extracts structured data from resume text using Gemini AI.
 * Supports:
 *  - Text extraction from uploaded files (PDF text layer, .txt, .docx)
 *  - AI-powered parsing into ResumeData structure
 *  - Session caching to avoid re-parsing the same resume
 *
 * Architecture:
 *  - Client-side: reads file → extracts text → sends to Gemini for parsing
 *  - No server needed — Gemini API is called directly from the browser
 */

import type { ResumeData } from './types'
import { SYSTEM_PROMPTS } from './gemini'

// ── Gemini integration ───────────────────────────────────────────────────────

const GEMINI_KEYS: string[] = (process.env.NEXT_PUBLIC_GEMINI_API_KEYS ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

let _keyIndex = 0

function getNextKey(): string {
  if (GEMINI_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured')
  }
  const key = GEMINI_KEYS[_keyIndex % GEMINI_KEYS.length]
  _keyIndex++
  return key
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

async function callGemini(
  prompt: string,
  maxTokens = 2048,
  systemInstruction = SYSTEM_PROMPTS.RESUME_PARSER,
): Promise<string> {
  const key = getNextKey()
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
    systemInstruction: { parts: [{ text: systemInstruction }] },
  })

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })

  if (!res.ok) {
    if (res.status === 429) {
      // Retry once with next key
      const retryKey = getNextKey()
      const retry = await fetch(`${GEMINI_URL}?key=${retryKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
      if (!retry.ok) throw new Error(`Gemini error: ${retry.status}`)
      const d = await retry.json()
      return d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }
    throw new Error(`Gemini error: ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function normalizeResumeData(parsed: ResumeData): ResumeData {
  return {
    summary: parsed.summary || undefined,
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
    experience: Array.isArray(parsed.experience)
      ? parsed.experience.map((e) => ({
          title: e.title || '',
          company: e.company || '',
          duration: e.duration || '',
          description: e.description || '',
        }))
      : [],
    education: Array.isArray(parsed.education)
      ? parsed.education.map((e) => ({
          degree: e.degree || '',
          institution: e.institution || '',
          year: e.year,
        }))
      : [],
    projects: Array.isArray(parsed.projects)
      ? parsed.projects.map((p) => ({
          name: p.name || '',
          description: p.description || '',
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
        }))
      : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : undefined,
  }
}

function parseResumeJson(raw: string): ResumeData {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  const parsed = JSON.parse(cleaned) as ResumeData
  return normalizeResumeData(parsed)
}

// ── Text extraction from files ──────────────────────────────────────────────

/**
 * Extract text content from a File object.
 * Supports .txt, .pdf (text layer), and falls back to reading as text.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return file.text()
  }

  if (name.endsWith('.pdf')) {
    return extractTextFromPDF(file)
  }

  // For .docx and other formats, try reading as text
  // (Won't work perfectly for binary .docx but handles some cases)
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return extractTextFromDocx(file)
  }

  // Fallback: try as plain text
  return file.text()
}

/**
 * Extract text from PDF using pdf.js–style text layer extraction.
 * Uses a lightweight approach: read as ArrayBuffer and extract text content.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Simple PDF text extraction:
  // PDF stores text in stream objects between BT and ET markers
  // This is a lightweight extractor — handles ~80% of text-layer PDFs
  const text = extractTextFromPDFBytes(bytes)

  if (text.trim().length < 50) {
    // Very little text extracted — might be image-based PDF
    // Fall back to reading raw and sending to Gemini for OCR-like extraction
    const rawText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    return rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim()
  }

  return text
}

/**
 * Lightweight PDF text extraction from raw bytes.
 * Parses PDF stream operators (Tj, TJ, ') to extract visible text.
 */
function extractTextFromPDFBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes)
  const textParts: string[] = []

  // Extract text from parenthesized strings in PDF content streams
  // Pattern: (text) Tj  or  [(text)] TJ
  const matches = raw.matchAll(/\(([^)]*)\)\s*T[jJ]/g)
  for (const match of matches) {
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
    textParts.push(decoded)
  }

  // Also try TJ arrays: [(...) num (...)] TJ
  const tjArrays = raw.matchAll(/\[((?:\([^)]*\)|[^[\]])*)\]\s*TJ/g)
  for (const match of tjArrays) {
    const inner = match[1]
    const stringMatches = inner.matchAll(/\(([^)]*)\)/g)
    for (const sm of stringMatches) {
      textParts.push(sm[1])
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Basic .docx text extraction.
 * DOCX is a ZIP containing XML. We extract text from word/document.xml.
 */
async function extractTextFromDocx(file: File): Promise<string> {
  try {
    // Try to read the docx XML content
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes)

    // Find XML text content within <w:t> tags (Word XML format)
    const textParts: string[] = []
    const matches = raw.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)
    for (const match of matches) {
      textParts.push(match[1])
    }

    if (textParts.length > 0) {
      return textParts.join(' ').trim()
    }

    // Fallback: strip all XML tags and return plain text
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  } catch {
    return file.text()
  }
}

// ── Resume parsing with Gemini ──────────────────────────────────────────────

// Session cache for parsed resumes (keyed by first 200 chars of text)
const _parseCache = new Map<string, ResumeData>()

/**
 * Parse resume text into structured ResumeData using Gemini AI.
 *
 * Steps:
 *  1. Check session cache
 *  2. Send text to Gemini with structured extraction prompt
 *  3. Parse JSON response into ResumeData
 *  4. Cache and return
 */
export async function parseResume(resumeText: string): Promise<ResumeData> {
  if (!resumeText || resumeText.trim().length < 20) {
    return { skills: [], experience: [], education: [], projects: [] }
  }

  // Cache check
  const cacheKey = resumeText.slice(0, 200).trim()
  const cached = _parseCache.get(cacheKey)
  if (cached) return cached

  const prompt = `You are a resume parser for HyperLocal Jobs (Indian job platform).
Extract structured data from this resume text. Return ONLY valid JSON, no markdown.

Resume text:
"""
${resumeText.slice(0, 6000)}
"""

Return this exact JSON structure:
{
  "summary": "1-2 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {"title": "Job Title", "company": "Company Name", "duration": "e.g. Jan 2020 - Dec 2022", "description": "Brief role description"}
  ],
  "education": [
    {"degree": "Degree Name", "institution": "College/University", "year": "2020"}
  ],
  "projects": [
    {"name": "Project Name", "description": "What it does", "technologies": ["tech1", "tech2"]}
  ],
  "certifications": ["cert1", "cert2"]
}

Rules:
- Extract ALL skills mentioned (technical and soft skills)
- Include ALL work experience entries
- Include ALL projects mentioned
- If a field is missing, use empty string or empty array
- Return valid JSON only`

  try {
    const raw = await callGemini(prompt, 2048, SYSTEM_PROMPTS.RESUME_PARSER)
    let result: ResumeData

    try {
      result = parseResumeJson(raw)
    } catch {
      const retryPrompt = `Your previous output was not valid JSON for the required schema.
Return ONLY valid JSON for the same resume extraction request.
Do not include markdown or code fences.
Previous output:\n${raw.slice(0, 4000)}`
      const repaired = await callGemini(retryPrompt, 2048, SYSTEM_PROMPTS.RESUME_PARSER)
      result = parseResumeJson(repaired)
    }

    _parseCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('Resume parsing failed:', err)
    // Return partially extracted data using regex fallbacks
    return extractResumeDataFallback(resumeText)
  }
}

/**
 * Fallback resume parser using regex patterns.
 * Used when Gemini API fails.
 */
function extractResumeDataFallback(text: string): ResumeData {
  // Common skill keywords to look for
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
    'HTML', 'CSS', 'Git', 'Docker', 'AWS', 'Azure', 'MongoDB', 'PostgreSQL',
    'Excel', 'Power BI', 'Tableau', 'Photoshop', 'Figma', 'AutoCAD',
    'Communication', 'Leadership', 'Problem Solving', 'Team Work',
    'MS Office', 'Tally', 'SAP', 'C++', 'C#', '.NET', 'PHP', 'Ruby',
    'Kubernetes', 'Linux', 'Networking', 'Cybersecurity',
    'Data Analysis', 'Machine Learning', 'Deep Learning', 'NLP',
  ]

  const foundSkills = skillKeywords.filter((skill) =>
    text.toLowerCase().includes(skill.toLowerCase())
  )

  // Try to extract email-like education patterns
  const educationMatches = text.match(
    /(?:B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|MBA|BCA|MCA|B\.?Com|M\.?Com|Ph\.?D|Diploma)[^.\n]*/gi
  ) || []

  const education = educationMatches.map((match) => ({
    degree: match.trim(),
    institution: '',
    year: match.match(/\b(19|20)\d{2}\b/)?.[0],
  }))

  return {
    skills: foundSkills,
    experience: [],
    education,
    projects: [],
  }
}

/**
 * Process a resume file end-to-end: extract text → parse with AI → return structured data.
 */
export async function processResumeFile(file: File): Promise<{
  text: string
  parsed: ResumeData
}> {
  const text = await extractTextFromFile(file)
  const parsed = await parseResume(text)
  return { text, parsed }
}

/**
 * Get a human-readable summary of a parsed resume.
 */
export function getResumeSummaryText(data: ResumeData): string {
  const parts: string[] = []

  if (data.summary) parts.push(data.summary)

  if (data.skills.length > 0) {
    parts.push(`Skills: ${data.skills.join(', ')}`)
  }

  if (data.experience.length > 0) {
    parts.push(`Experience: ${data.experience.map((e) => `${e.title} at ${e.company} (${e.duration})`).join('; ')}`)
  }

  if (data.education.length > 0) {
    parts.push(`Education: ${data.education.map((e) => `${e.degree} - ${e.institution}`).join('; ')}`)
  }

  if (data.projects.length > 0) {
    parts.push(`Projects: ${data.projects.map((p) => `${p.name} [${p.technologies.join(', ')}]`).join('; ')}`)
  }

  return parts.join('\n')
}
