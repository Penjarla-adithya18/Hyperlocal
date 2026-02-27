/**
 * Resume Parser Service
 *
 * Pipeline:
 *  1. Extract raw text from file using multi-strategy approach
 *  2. Sanitize and clean the text
 *  3. Send to Gemini with a comprehensive structured prompt
 *  4. Return categorized skills + full ResumeData
 *
 * Handles: PDF (text layer + hex strings), DOCX (ZIP/XML), TXT, MD
 */

import type { ResumeData } from './types'
import { generateWithGemini } from './gemini'

// ── AI integration (uses shared Ollama / Groq layer from gemini.ts) ──────────

async function callGemini(prompt: string, maxTokens = 3000): Promise<string> {
  const result = await generateWithGemini(prompt, { tier: 'flash', maxTokens })
  if (!result) throw new Error('AI model returned empty response')
  return result
}

// ── Text sanitization ────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ')  // control chars (keep tab/newline)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')              // zero-width chars
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{4,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

// ── PDF text extraction ──────────────────────────────────────────────────────

/** Decode octal escapes and PDF special escapes inside parenthesized strings */
function decodePDFEscapes(s: string): string {
  return s
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
}

/** Decode a hex-encoded PDF string: 48656c6c6f → Hello */
function decodePDFHex(hex: string): string {
  const h = hex.length % 2 === 1 ? hex + '0' : hex
  let out = ''
  for (let i = 0; i < h.length; i += 2) {
    const code = parseInt(h.slice(i, i + 2), 16)
    if (code >= 32 && code < 127) out += String.fromCharCode(code)
    else if (code > 127) out += ' '
    // skip nulls and low control chars
  }
  return out
}

/**
 * Multi-strategy PDF text extraction.
 * Handles:
 *   Strategy 1 – Literal strings (text) Tj / ' / "
 *   Strategy 2 – TJ arrays [(literal)-123(literal)] TJ
 *   Strategy 3 – Hex strings <DEADBEEF> Tj
 *   Strategy 4 – TJ arrays with hex strings
 */
function extractPDFTextFromRaw(raw: string): string {
  const parts: string[] = []

  // Strategy 1: (text) Tj / T' / T"
  for (const m of raw.matchAll(/\(([^)]*(?:\\.[^)]*)*)\)\s*T[j'"]/g)) {
    const t = decodePDFEscapes(m[1]).trim()
    if (t) parts.push(t)
  }

  // Strategy 2: TJ arrays with literal strings
  for (const m of raw.matchAll(/\[((?:[^[\]]|\((?:[^)\\]|\\.)*\))*)\]\s*TJ/g)) {
    for (const sm of m[1].matchAll(/\(([^)]*(?:\\.[^)]*)*)\)/g)) {
      const t = decodePDFEscapes(sm[1]).trim()
      if (t) parts.push(t)
    }
  }

  // Strategy 3: <hexstring> Tj
  for (const m of raw.matchAll(/<([0-9a-fA-F]{2,})>\s*T[j'"]/g)) {
    const t = decodePDFHex(m[1]).trim()
    if (t.length > 1) parts.push(t)
  }

  // Strategy 4: TJ arrays with hex strings
  for (const m of raw.matchAll(/\[((?:[^[\]]|<[0-9a-fA-F]*>)*)\]\s*TJ/g)) {
    for (const sm of m[1].matchAll(/<([0-9a-fA-F]{2,})>/g)) {
      const t = decodePDFHex(sm[1]).trim()
      if (t.length > 1) parts.push(t)
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const raw = new TextDecoder('latin1').decode(bytes)

  const extracted = extractPDFTextFromRaw(raw)

  if (extracted.length >= 100) {
    return sanitize(extracted)
  }

  // Fallback: strip binary, keep printable ASCII
  const fallback = raw
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim()
  return sanitize(fallback.length > extracted.length ? fallback : extracted)
}

// ── DOCX text extraction ─────────────────────────────────────────────────────

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer()
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer))

    const parts: string[] = []

    // Parse paragraph by paragraph (preserves structure better)
    for (const para of raw.matchAll(/<w:p[ >]([\s\S]*?)<\/w:p>/g)) {
      const lineTokens: string[] = []
      for (const run of para[1].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)) {
        if (run[1].trim()) lineTokens.push(run[1])
      }
      if (lineTokens.length > 0) parts.push(lineTokens.join(''))
    }

    if (parts.length > 5) return sanitize(parts.join('\n'))

    // Fallback: strip all tags
    return sanitize(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  } catch {
    return file.text()
  }
}

// ── Public entry: extract text ───────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return extractTextFromPDF(file)
  if (name.endsWith('.docx') || name.endsWith('.doc')) return extractTextFromDocx(file)
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf')) return file.text()
  try { return await file.text() } catch { return '' }
}

// ── Gemini prompt ────────────────────────────────────────────────────────────

function buildResumePrompt(text: string): string {
  return `You are an expert resume/CV parser with deep knowledge of Indian job markets (tech, blue-collar, service industries) and global professional norms.

Carefully read this resume and extract EVERY piece of information present.

RESUME TEXT:
---
${text}
---

Return ONLY a single valid JSON object. No markdown fences, no explanation, no extra text before or after.

{
  "name": "full name or empty string",
  "summary": "2-3 sentence professional summary based on the content",
  "contact": {
    "email": "email or empty",
    "phone": "phone or empty",
    "location": "city/state or empty",
    "linkedin": "linkedin url or empty"
  },
  "skills": {
    "technical": ["every programming language, framework, library, database, platform, cloud service, protocol mentioned anywhere"],
    "soft": ["every soft skill: leadership, communication, teamwork, problem-solving, time management, etc."],
    "domain": ["industry/domain knowledge: accounting, logistics, healthcare, construction, hospitality, teaching, etc."],
    "tools": ["every specific software tool, ERP, CRM, hardware tool: Excel, Tally, SAP, AutoCAD, Photoshop, Figma, etc."]
  },
  "experience": [
    {
      "title": "exact job title",
      "company": "company name",
      "duration": "e.g. Jan 2020 – Mar 2023",
      "location": "city or Remote",
      "description": "key responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "full degree name",
      "institution": "college/university name",
      "year": "graduation year or empty",
      "grade": "CGPA/percentage or empty"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "what it does, your role, outcomes",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "certifications": ["every certification, course, training, license"],
  "languages": ["languages the person speaks or writes"]
}

IMPORTANT:
- Include EVERY skill regardless of context — technical, soft, domain, or tools
- Do NOT skip blue-collar skills (welding, driving, carpentry, cooking, security, data entry, etc.)
- Normalize: "JS" → "JavaScript", "py" → "Python", "MS Excel" → "Excel"
- If a field is missing use empty string "" or empty array []
- Return ONLY valid JSON, nothing else`
}

// ── Session cache ─────────────────────────────────────────────────────────────

const _parseCache = new Map<string, ParsedResume>()

// ── Types ─────────────────────────────────────────────────────────────────────

/** Extended result that includes categorized skills from Gemini */
export interface ParsedResume extends ResumeData {
  name?: string
  contact?: {
    email?: string
    phone?: string
    location?: string
    linkedin?: string
  }
  /** Skills split by category — available when Gemini parsing succeeds */
  categorizedSkills?: {
    technical: string[]
    soft: string[]
    domain: string[]
    tools: string[]
  }
  certifications?: string[]
  languages?: string[]
}

// ── Main parse function ───────────────────────────────────────────────────────

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const empty: ParsedResume = { skills: [], experience: [], education: [], projects: [] }
  if (!resumeText || resumeText.trim().length < 30) return empty

  const clean = sanitize(resumeText)
  const cacheKey = clean.slice(0, 300)
  const cached = _parseCache.get(cacheKey)
  if (cached) return cached

  const textForGemini = clean.slice(0, 5000)

  try {
    const raw = await callGemini(buildResumePrompt(textForGemini), 3000)
    if (!raw || raw.length < 20) throw new Error('Empty Gemini response')

    const jsonStr = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    const p = JSON.parse(jsonStr)

    const techSkills: string[] = Array.isArray(p.skills?.technical) ? p.skills.technical.filter(Boolean) : []
    const softSkills: string[] = Array.isArray(p.skills?.soft) ? p.skills.soft.filter(Boolean) : []
    const domainSkills: string[] = Array.isArray(p.skills?.domain) ? p.skills.domain.filter(Boolean) : []
    const toolSkills: string[] = Array.isArray(p.skills?.tools) ? p.skills.tools.filter(Boolean) : []
    const projectTech = (p.projects ?? []).flatMap((pr: { technologies?: string[] }) => pr.technologies ?? [])
    const allSkills = [...new Set([...techSkills, ...softSkills, ...domainSkills, ...toolSkills, ...projectTech])].filter(Boolean)

    const result: ParsedResume = {
      name: p.name || undefined,
      summary: p.summary || undefined,
      contact: p.contact || undefined,
      skills: allSkills,
      categorizedSkills: {
        technical: techSkills,
        soft: softSkills,
        domain: domainSkills,
        tools: toolSkills,
      },
      experience: Array.isArray(p.experience)
        ? p.experience.map((e: Record<string, string>) => ({
            title: e.title || '',
            company: e.company || '',
            duration: e.duration || '',
            description: e.description || '',
          }))
        : [],
      education: Array.isArray(p.education)
        ? p.education.map((e: Record<string, string>) => ({
            degree: e.degree || '',
            institution: e.institution || '',
            year: e.year,
          }))
        : [],
      projects: Array.isArray(p.projects)
        ? p.projects.map((pr: Record<string, unknown>) => ({
            name: (pr.name as string) || '',
            description: (pr.description as string) || '',
            technologies: Array.isArray(pr.technologies) ? pr.technologies : [],
          }))
        : [],
      certifications: Array.isArray(p.certifications) ? p.certifications.filter(Boolean) : undefined,
      languages: Array.isArray(p.languages) ? p.languages.filter(Boolean) : undefined,
    }

    _parseCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('Resume Gemini parsing failed:', err instanceof Error ? err.message : err)
    return regexFallback(clean)
  }
}

// ── Regex fallback ────────────────────────────────────────────────────────────

function regexFallback(text: string): ParsedResume {
  const lower = text.toLowerCase()

  const SKILL_PATTERNS: Record<string, string[]> = {
    technical: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Next.js', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
      'HTML', 'CSS', 'SCSS', 'Tailwind', 'Bootstrap', 'jQuery',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Supabase', 'SQLite',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Git', 'GitHub', 'CI/CD', 'REST', 'GraphQL',
      'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
      'Android', 'iOS', 'Flutter', 'React Native', 'Networking', 'TCP/IP', 'Cybersecurity',
    ],
    tools: [
      'Excel', 'Word', 'PowerPoint', 'Outlook', 'MS Office', 'Google Sheets', 'Google Docs',
      'Tally', 'SAP', 'QuickBooks', 'Zoho', 'HubSpot', 'Salesforce', 'Jira', 'Confluence', 'Slack',
      'Photoshop', 'Illustrator', 'Figma', 'Canva', 'AutoCAD', 'Revit', 'SketchUp', 'Blender',
      'Power BI', 'Tableau', 'Looker', 'MATLAB',
    ],
    domain: [
      'Accounting', 'Finance', 'Banking', 'Insurance', 'Auditing', 'Taxation', 'GST',
      'Sales', 'Marketing', 'SEO', 'SEM', 'Social Media', 'Content Writing', 'Digital Marketing',
      'HR', 'Recruitment', 'Payroll', 'Training', 'Logistics', 'Supply Chain', 'Inventory', 'Procurement',
      'Healthcare', 'Nursing', 'Pharmacy', 'Teaching', 'Education', 'Administration',
      'Construction', 'Plumbing', 'Electrical', 'Welding', 'Carpentry', 'Painting', 'Masonry',
      'Driving', 'Delivery', 'Cooking', 'Hospitality', 'Housekeeping', 'Security', 'Customer Service',
      'Photography', 'Videography', 'Data Entry', 'Typing',
    ],
    soft: [
      'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Critical Thinking',
      'Time Management', 'Creativity', 'Adaptability', 'Attention to Detail', 'Multitasking',
      'Project Management', 'Decision Making', 'Conflict Resolution', 'Analytical',
    ],
  }

  const found: NonNullable<ParsedResume['categorizedSkills']> = { technical: [], soft: [], domain: [], tools: [] }
  for (const [cat, keywords] of Object.entries(SKILL_PATTERNS)) {
    found[cat as keyof typeof found] = keywords.filter(k => lower.includes(k.toLowerCase()))
  }
  const allSkills = [...new Set([...found.technical, ...found.soft, ...found.domain, ...found.tools])]

  const eduMatches = text.match(
    /(?:B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Sc|M\.?Sc|MBA|BCA|MCA|B\.?Com|M\.?Com|Ph\.?D|Diploma|10th|12th|SSC|HSC)[^\n]*/gi
  ) ?? []

  return {
    skills: allSkills,
    categorizedSkills: found,
    experience: [],
    education: eduMatches.map(d => ({
      degree: d.trim(),
      institution: '',
      year: d.match(/\b(19|20)\d{2}\b/)?.[0],
    })),
    projects: [],
  }
}

// ── Convenience exports ──────────────────────────────────────────────────────

export { sanitize as sanitizeResumeText }

export async function processResumeFile(file: File): Promise<{ text: string; parsed: ParsedResume }> {
  const text = await extractTextFromFile(file)
  const parsed = await parseResume(text)
  return { text, parsed }
}

export function getResumeSummaryText(data: ResumeData): string {
  const lines: string[] = []
  if (data.summary) lines.push(data.summary)
  if (data.skills.length > 0) lines.push(`Skills: ${data.skills.join(', ')}`)
  if (data.experience.length > 0)
    lines.push(`Experience: ${data.experience.map(e => `${e.title} at ${e.company}`).join('; ')}`)
  if (data.education.length > 0)
    lines.push(`Education: ${data.education.map(e => `${e.degree} – ${e.institution}`).join('; ')}`)
  if (data.projects.length > 0)
    lines.push(`Projects: ${data.projects.map(p => p.name).join(', ')}`)
  return lines.join('\n')
}
