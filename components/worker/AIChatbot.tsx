'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { jobOps, applicationOps, workerProfileOps } from '@/lib/api'
import { generateWithGemini, SupportedLocale } from '@/lib/gemini'
import { getRecommendedJobs, getBasicRecommendations } from '@/lib/aiMatching'
import { Job, Application, WorkerProfile } from '@/lib/types'
import {
  Bot,
  X,
  Send,
  Loader2,
  Briefcase,
  MapPin,
  IndianRupee,
  Clock,
  ChevronRight,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  MessageSquare,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  /** Structured data attached to assistant messages */
  data?: {
    type: 'jobs' | 'job_detail' | 'apply_confirm' | 'apply_result' | 'applications' | 'suggestions'
    jobs?: Job[]
    job?: Job
    applications?: (Application & { jobTitle?: string })[]
    applied?: boolean
    suggestions?: string[]
  }
}

type AgentIntent =
  | { action: 'search_jobs'; query?: string; category?: string; location?: string }
  | { action: 'show_all_jobs' }
  | { action: 'recommended_jobs' }
  | { action: 'job_detail'; jobId?: string; jobTitle?: string }
  | { action: 'apply_job'; jobId: string }
  | { action: 'confirm_apply'; jobId: string }
  | { action: 'application_status' }
  | { action: 'platform_info' }
  | { action: 'help' }
  | { action: 'greeting' }
  | { action: 'unknown'; message: string }

// ── Intent Extraction (AI + Fallback) ────────────────────────────────────

const INTENT_PROMPT = `You are an AI assistant for HyperLocal, a hyperlocal job platform in India.
Parse the user's message into a JSON intent. Respond ONLY with valid JSON (no markdown, no fences).

Possible intents:
1. {"action":"search_jobs","query":"keyword","category":"category","location":"city"}
2. {"action":"job_detail","jobTitle":"title or keyword"}
3. {"action":"apply_job","jobId":"id"} — when user says "apply to job #3" or "apply for <title>"
4. {"action":"confirm_apply","jobId":"id"} — when user confirms "yes" to apply
5. {"action":"show_all_jobs"} — when user says "show all jobs", "list all jobs", "all jobs"
6. {"action":"recommended_jobs"} — when user says "recommended jobs", "suggest jobs", "jobs for me"
7. {"action":"application_status"} — check my applications, status, etc.
8. {"action":"platform_info"} — user asks what this app/platform is, what HyperLocal does, explain the platform
9. {"action":"help"} — user asks what you can do
10. {"action":"greeting"} — hello, hi, etc.
11. {"action":"unknown","message":"brief reply"} — anything else

Context (if provided):
- Last shown jobs with indices: {jobContext}
- User said: "{userMessage}"

Rules:
- If user says a number like "3" or "tell me about #2", map it to job_detail with the job from context
- If user says "apply" + number, extract jobId from context
- For search: extract keywords (plumber, driver), category, location if mentioned
- If user says "yes" or "confirm" after being asked to confirm apply, use confirm_apply
- Keep it simple. Output ONLY the JSON object.`

async function extractIntent(
  message: string,
  jobContext: string,
  pendingConfirm: string | null,
): Promise<AgentIntent> {
  // Fast local pattern matching first
  const lower = message.toLowerCase().trim()

  if (/^(hi|hello|hey|namaste|hola)[\s!.]*$/i.test(lower)) {
    return { action: 'greeting' }
  }
  if (/^(help|what can you do|commands|menu)[\s?]*$/i.test(lower)) {
    return { action: 'help' }
  }

  // Platform info — "what is this", "explain the platform", "about hyperlocal", etc.
  if (
    /what\s+is\s+(this|hyperlocal|the platform|this app|this platform|this service)/i.test(lower) ||
    /^(about|explain|describe|tell me about)\s+(this|hyperlocal|the platform|this app|this platform|this service)/i.test(lower) ||
    /^(about|explain|what is this)[\s?!.]*$/i.test(lower)
  ) {
    return { action: 'platform_info' }
  }
  if (pendingConfirm && /^(yes|yeah|yep|confirm|sure|ok|haan|ha)[\s!.]*$/i.test(lower)) {
    return { action: 'confirm_apply', jobId: pendingConfirm }
  }
  if (/^(my applications|application status|status|track|check status)/i.test(lower)) {
    return { action: 'application_status' }
  }

  // "Show all jobs" / "all jobs" / "list all"
  if (/^(show all|list all|all jobs|browse all|every job|display all)/i.test(lower)) {
    return { action: 'show_all_jobs' }
  }

  // "Recommended jobs" / "suggest jobs" / "jobs for me" / "best jobs" (also catches misspelling "recommanded")
  if (/recomm[ae]nd|suggest|for me|best (jobs|match)|suitable|my match|personali[sz]ed/i.test(lower)) {
    return { action: 'recommended_jobs' }
  }

  // Quick regex for "apply #N" or "apply for N"
  const applyMatch = lower.match(/apply\s+(?:for\s+|to\s+|#)?(\d+)/i)
  if (applyMatch) {
    return { action: 'apply_job', jobId: `__index_${applyMatch[1]}` }
  }

  // Quick regex for "show #N" / "details #N" / just a number
  const detailMatch = lower.match(/^(?:show|details?|tell me about|view|info)?\s*#?(\d+)$/i)
  if (detailMatch) {
    return { action: 'job_detail', jobTitle: `__index_${detailMatch[1]}` }
  }

  // Search patterns
  if (/^(search|find|look|show|list|browse)[\s]/i.test(lower) || /jobs?\s*(in|near|at|for)/i.test(lower)) {
    // Extract location
    const locMatch = lower.match(/(?:in|near|at)\s+([a-zA-Z\s]+?)(?:\s+(?:for|with|jobs?)|\s*$)/i)
    // Extract category/keyword
    const words = lower
      .replace(/^(search|find|look for|show|list|browse)\s*/i, '')
      .replace(/\bjobs?\b/gi, '')
      .replace(/(?:in|near|at)\s+[a-zA-Z\s]+$/i, '')
      .trim()
    return {
      action: 'search_jobs',
      query: words || undefined,
      location: locMatch?.[1]?.trim(),
    }
  }

  // Fall back to AI extraction
  try {
    const prompt = INTENT_PROMPT
      .replace('{jobContext}', jobContext || 'none')
      .replace('{userMessage}', message.slice(0, 300))

    const raw = await generateWithGemini(prompt, { tier: 'flash', maxTokens: 256 })
    if (raw) {
      const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
      const parsed = JSON.parse(cleaned) as AgentIntent
      return parsed
    }
  } catch {
    // Fall through to search
  }

  // Default: treat as a job search
  return { action: 'search_jobs', query: lower }
}

// ── Component ────────────────────────────────────────────────────────────

const GREETING_MSG = `👋 Hi! I'm your **HyperLocal AI Assistant**. I can help you:

• **Search jobs** — "Find plumber jobs in Hyderabad"
• **View details** — "Tell me about #2"
• **Apply to jobs** — "Apply for #3"
• **Check status** — "My applications"

What would you like to do?`

export default function AIChatbot() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<WorkerProfile | null>(null)
  const [pendingConfirmJobId, setPendingConfirmJobId] = useState<string | null>(null)

  // Track last-shown jobs for index-based references
  const lastJobsRef = useRef<Job[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load worker profile once
  useEffect(() => {
    if (user?.role === 'worker') {
      workerProfileOps.findByUserId(user.id).then(setProfile).catch(() => {})
    }
  }, [user])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      // Show greeting if no messages
      if (messages.length === 0) {
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: GREETING_MSG,
            timestamp: new Date(),
            data: {
              type: 'suggestions',
              suggestions: [
                'Search plumber jobs',
                'Find jobs in Hyderabad',
                'My applications',
              ],
            },
          },
        ])
      }
    }
  }, [open])

  // ── Helpers ─────────────────────────────────────────────────────

  const addMessage = useCallback(
    (role: ChatMessage['role'], content: string, data?: ChatMessage['data']) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role,
          content,
          timestamp: new Date(),
          data,
        },
      ])
    },
    [],
  )

  const resolveJobByIndex = (ref: string): Job | undefined => {
    const m = ref.match(/__index_(\d+)/)
    if (m) {
      const idx = parseInt(m[1], 10) - 1
      return lastJobsRef.current[idx]
    }
    return undefined
  }

  // ── Action Handlers ─────────────────────────────────────────────

  const handleSearchJobs = async (query?: string, category?: string, location?: string) => {
    try {
      // Let server handle status filtering (it already returns only active jobs for workers)
      const filters: { status?: 'active'; category?: string; location?: string } = {}
      if (category) filters.category = category
      if (location) filters.location = location
      const allJobs = await jobOps.getAll(filters)
      let filtered = allJobs

      if (query) {
        // Split query into individual words for fuzzy matching
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        const queryFull = query.toLowerCase()

        filtered = allJobs.filter((j) => {
          const title = j.title.toLowerCase()
          const desc = j.description.toLowerCase()
          const skills = j.requiredSkills.map(s => s.toLowerCase()).join(' ')
          const cat = j.category.toLowerCase()
          const searchable = `${title} ${desc} ${skills} ${cat}`

          // Exact substring match on full query
          if (searchable.includes(queryFull)) return true

          // Word-level fuzzy: match if ANY query word appears anywhere in the job's text
          return queryWords.some(word => searchable.includes(word))
        })
      }

      // Sort by most recent — show up to 25 search results
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const results = filtered.slice(0, 25)
      lastJobsRef.current = results

      if (results.length === 0) {
        addMessage('assistant', `No jobs found matching "${query || 'your criteria'}". Try different keywords or browse all jobs.`, {
          type: 'suggestions',
          suggestions: ['Show all jobs', 'Recommended jobs', 'Search delivery jobs'],
        })
      } else {
        const searchDesc = [query, category, location].filter(Boolean).join(', ') || 'active listings'
        addMessage(
          'assistant',
          `Found **${results.length}** job${results.length > 1 ? 's' : ''} for "${searchDesc}". Say a number (e.g. **#1**) for details or **"apply #1"** to apply.`,
          { type: 'jobs', jobs: results },
        )
      }
    } catch {
      addMessage('assistant', 'Sorry, I had trouble searching for jobs. Please try again.')
    }
  }

  const handleShowAllJobs = async () => {
    try {
      const allJobs = await jobOps.getAll()
      const sorted = allJobs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      lastJobsRef.current = sorted

      if (sorted.length === 0) {
        addMessage('assistant', 'No jobs are available right now. Check back later!', {
          type: 'suggestions',
          suggestions: ['Recommended jobs', 'My applications'],
        })
      } else {
        addMessage(
          'assistant',
          `Here are all **${sorted.length}** available jobs. Say a number for details or **"apply #N"** to apply.`,
          { type: 'jobs', jobs: sorted },
        )
      }
    } catch {
      addMessage('assistant', 'Sorry, I had trouble fetching jobs. Please try again.')
    }
  }

  const handleRecommendedJobs = async () => {
    try {
      const allJobs = await jobOps.getAll()
      let results: Array<{ job: Job; matchScore: number }> = []

      if (profile && profile.skills?.length > 0 && profile.categories?.length > 0) {
        // Full AI-scored recommendations
        results = getRecommendedJobs(profile, allJobs, 8)
      }

      // Fallback: category-based or recency
      if (results.length === 0 && profile) {
        const basic = getBasicRecommendations(profile.categories || [], allJobs, 8)
        results = basic.map(job => ({ job, matchScore: 0 }))
      }

      // Last resort: just show recent jobs
      if (results.length === 0) {
        const recent = allJobs
          .filter(j => j.status === 'active')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 8)
        results = recent.map(job => ({ job, matchScore: 0 }))
      }

      const jobs = results.map(r => r.job)
      lastJobsRef.current = jobs

      if (jobs.length === 0) {
        addMessage('assistant', 'No recommendations available yet. Complete your profile for better matches!', {
          type: 'suggestions',
          suggestions: ['Show all jobs', 'My applications'],
        })
      } else {
        const hasScores = results.some(r => r.matchScore > 0)
        const msg = hasScores
          ? `Here are **${jobs.length}** recommended jobs based on your profile. Top match: **${results[0].matchScore}%**`
          : `Here are **${jobs.length}** jobs you might be interested in. Complete your profile for personalized scoring!`
        addMessage('assistant', msg + '\nSay a number for details or **"apply #N"** to apply.', {
          type: 'jobs',
          jobs,
        })
      }
    } catch {
      addMessage('assistant', 'Sorry, I had trouble getting recommendations. Please try again.')
    }
  }

  const handleJobDetail = async (job: Job) => {
    addMessage('assistant', '', { type: 'job_detail', job })
  }

  const handleApplyJob = async (job: Job) => {
    if (!user) {
      addMessage('assistant', 'Please log in first to apply for jobs.')
      return
    }

    // Check if already applied
    try {
      const myApps = await applicationOps.findByWorkerId(user.id)
      const alreadyApplied = myApps.some((a) => a.jobId === job.id)
      if (alreadyApplied) {
        addMessage('assistant', `You've already applied to **${job.title}**. Say "my applications" to check your status.`)
        return
      }
    } catch {
      // Continue anyway
    }

    setPendingConfirmJobId(job.id)
    addMessage(
      'assistant',
      `Apply to **${job.title}** (₹${(job.pay ?? 0).toLocaleString()})?\n\nSay **"yes"** to confirm or **"no"** to cancel.`,
      { type: 'apply_confirm', job },
    )
  }

  const handleConfirmApply = async (jobId: string) => {
    if (!user) return
    setPendingConfirmJobId(null)

    try {
      // Get the job details for match score
      const job = await jobOps.findById(jobId)
      if (!job) {
        addMessage('assistant', 'Sorry, that job could not be found. It may have been removed.')
        return
      }

      // Calculate a basic match score
      const workerSkills = profile?.skills ?? []
      const matchedSkills = workerSkills.filter((s) =>
        job.requiredSkills.map((r) => r.toLowerCase()).includes(s.toLowerCase()),
      )
      const matchScore = job.requiredSkills.length > 0
        ? Math.round((matchedSkills.length / job.requiredSkills.length) * 100)
        : 50

      await applicationOps.create({
        jobId,
        workerId: user.id,
        status: 'pending',
        matchScore,
        coverMessage: `Applied via AI Assistant. Skills matched: ${matchedSkills.join(', ') || 'N/A'}`,
        createdAt: new Date().toISOString(),
      } as Omit<Application, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: string })

      addMessage('assistant', `✅ Successfully applied to **${job.title}**!\n\nMatch score: **${matchScore}%**\nSay "my applications" to track your status.`, {
        type: 'apply_result',
        applied: true,
      })
    } catch (e) {
      addMessage('assistant', 'Sorry, there was an error submitting your application. Please try again or apply from the job page.')
    }
  }

  const handleApplicationStatus = async () => {
    if (!user) {
      addMessage('assistant', 'Please log in to check your application status.')
      return
    }

    try {
      const apps = await applicationOps.findByWorkerId(user.id)
      if (apps.length === 0) {
        addMessage('assistant', "You haven't applied to any jobs yet. Say **\"search jobs\"** to find opportunities!",
          { type: 'suggestions', suggestions: ['Search jobs', 'Find plumber jobs', 'Show all jobs'] })
        return
      }

      // Enrich with job titles
      const enriched = await Promise.all(
        apps.slice(0, 10).map(async (app) => {
          const job = await jobOps.findById(app.jobId)
          return { ...app, jobTitle: job?.title ?? 'Unknown Job' }
        }),
      )

      const statusCounts = {
        pending: apps.filter((a) => a.status === 'pending').length,
        accepted: apps.filter((a) => a.status === 'accepted').length,
        rejected: apps.filter((a) => a.status === 'rejected').length,
        completed: apps.filter((a) => a.status === 'completed').length,
      }

      addMessage(
        'assistant',
        `📋 You have **${apps.length}** application${apps.length > 1 ? 's' : ''}:\n• Pending: ${statusCounts.pending}\n• Accepted: ${statusCounts.accepted}\n• Completed: ${statusCounts.completed}\n• Rejected: ${statusCounts.rejected}`,
        { type: 'applications', applications: enriched },
      )
    } catch {
      addMessage('assistant', 'Sorry, I couldn\'t fetch your applications. Please try again.')
    }
  }

  // ── Main Send Handler ────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    addMessage('user', text)
    setLoading(true)

    try {
      // Build job context string
      const jobCtx = lastJobsRef.current.length > 0
        ? lastJobsRef.current
            .map((j, i) => `#${i + 1}: "${j.title}" (id:${j.id})`)
            .join(', ')
        : ''

      const intent = await extractIntent(text, jobCtx, pendingConfirmJobId)

      switch (intent.action) {
        case 'greeting':
          addMessage('assistant', GREETING_MSG, {
            type: 'suggestions',
            suggestions: ['Search plumber jobs', 'Find jobs in Hyderabad', 'My applications'],
          })
          break

        case 'platform_info':
          addMessage(
            'assistant',
            `**HyperLocal** is a hyperlocal job platform built for India 🇮🇳

` +
            `It connects **local workers** (plumbers, electricians, drivers, domestic helpers, and more) with **employers** in their area — no long commutes, no middlemen.

` +
            `**For Workers (you):**
` +
            `• Browse & apply for jobs nearby
` +
            `• AI-powered job recommendations based on your skills
` +
            `• Real-time chat with employers
` +
            `• Track your applications & earnings
` +
            `• Skill gap analysis to grow your career

` +
            `**For Employers:**
` +
            `• Post jobs and find verified local workers fast
` +
            `• AI resume screening & candidate matching
` +
            `• Secure escrow payments — money released only when work is done
` +
            `• WhatsApp notifications via WATI

` +
            `Think of it as a **neighbourhood job board powered by AI** — local, fast, and fair. �`,
            {
              type: 'suggestions',
              suggestions: ['Show all jobs', 'Recommended jobs for me', 'What can you do?'],
            },
          )
          break

        case 'help':
          addMessage('assistant',
            `Here's what I can do:\n\n� **Search Jobs** — "Find plumber jobs in Delhi"\n📋 **Job Details** — "Show #2" or "Tell me about job 3"\n� **Apply** — "Apply for #1"\n📊 **Track Applications** — "My applications" or "Check status"\n\nJust type naturally — I understand!`,
            {
              type: 'suggestions',
              suggestions: ['Search electrician jobs', 'My applications', 'Show all jobs'],
            },
          )
          break

        case 'search_jobs':
          await handleSearchJobs(intent.query, intent.category, intent.location)
          break

        case 'show_all_jobs':
          await handleShowAllJobs()
          break

        case 'recommended_jobs':
          await handleRecommendedJobs()
          break

        case 'job_detail': {
          let job: Job | undefined
          if (intent.jobTitle?.startsWith('__index_')) {
            job = resolveJobByIndex(intent.jobTitle)
          } else if (intent.jobId) {
            job = (await jobOps.findById(intent.jobId)) ?? undefined
          } else if (intent.jobTitle) {
            // Search by title
            const allJobs = await jobOps.getAll({ status: 'active' })
            job = allJobs.find((j) =>
              j.title.toLowerCase().includes(intent.jobTitle!.toLowerCase()),
            )
          }

          if (job) {
            await handleJobDetail(job)
          } else {
            addMessage('assistant', "I couldn't find that job. Try searching first with **\"search jobs\"** and then reference by number.")
          }
          break
        }

        case 'apply_job': {
          let job: Job | undefined
          if (intent.jobId.startsWith('__index_')) {
            job = resolveJobByIndex(intent.jobId)
          } else {
            job = (await jobOps.findById(intent.jobId)) ?? undefined
          }

          if (job) {
            await handleApplyJob(job)
          } else {
            addMessage('assistant', "I couldn't find that job. Search for jobs first and then say **\"apply #N\"**.")
          }
          break
        }

        case 'confirm_apply':
          if (intent.jobId) {
            await handleConfirmApply(intent.jobId)
          } else {
            addMessage('assistant', "There's nothing to confirm right now. Search for a job and apply first!")
          }
          break

        case 'application_status':
          await handleApplicationStatus()
          break

        case 'unknown':
          addMessage('assistant', intent.message || "I'm not sure what you mean. Try asking me to search jobs, check your applications, or apply for a job!")
          break

        default:
          addMessage('assistant', "I didn't understand that. You can ask me to **search jobs**, **apply**, or **check your applications**.")
      }
    } catch {
      addMessage('assistant', 'Oops, something went wrong. Please try again!')
    } finally {
      setLoading(false)
      // Cancel pending confirm if user said something other than yes/no
      if (pendingConfirmJobId && !/^(yes|no|yeah|nope|cancel)/i.test(text)) {
        setPendingConfirmJobId(null)
      }
    }
  }

  // ── Suggestion click ─────────────────────────────────────────────

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    // Auto-send
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent
      setInput('')
      addMessage('user', suggestion)
      setLoading(true)

      const jobCtx = lastJobsRef.current.length > 0
        ? lastJobsRef.current.map((j, i) => `#${i + 1}: "${j.title}" (id:${j.id})`).join(', ')
        : ''

      extractIntent(suggestion, jobCtx, pendingConfirmJobId).then(async (intent) => {
        // Re-dispatch same logic as handleSend — must mirror all cases
        switch (intent.action) {
          case 'greeting':
            addMessage('assistant', GREETING_MSG, {
              type: 'suggestions',
              suggestions: ['Search plumber jobs', 'Find jobs in Hyderabad', 'My applications'],
            })
            break
          case 'help':
            addMessage('assistant',
              `Here's what I can do:\n\n� **Search Jobs** — "Find plumber jobs in Delhi"\n📋 **Job Details** — "Show #2"\n� **Apply** — "Apply for #1"\n📊 **Track Applications** — "My applications"`,
              {
                type: 'suggestions',
                suggestions: ['Search electrician jobs', 'My applications', 'Show all jobs'],
              },
            )
            break
          case 'search_jobs':
            await handleSearchJobs(intent.query, intent.category, intent.location)
            break
          case 'show_all_jobs':
            await handleShowAllJobs()
            break
          case 'recommended_jobs':
            await handleRecommendedJobs()
            break
          case 'application_status':
            await handleApplicationStatus()
            break
          case 'job_detail': {
            let job: Job | undefined
            if (intent.jobTitle?.startsWith('__index_')) {
              job = resolveJobByIndex(intent.jobTitle)
            } else if (intent.jobId) {
              job = (await jobOps.findById(intent.jobId)) ?? undefined
            }
            if (job) {
              await handleJobDetail(job)
            } else {
              addMessage('assistant', "I couldn't find that job. Try searching first.")
            }
            break
          }
          case 'apply_job': {
            let job: Job | undefined
            if (intent.jobId.startsWith('__index_')) {
              job = resolveJobByIndex(intent.jobId)
            } else {
              job = (await jobOps.findById(intent.jobId)) ?? undefined
            }
            if (job) {
              await handleApplyJob(job)
            } else {
              addMessage('assistant', "I couldn't find that job. Search first then say 'apply #N'.")
            }
            break
          }
          case 'confirm_apply':
            if (intent.jobId) {
              await handleConfirmApply(intent.jobId)
            }
            break
          default:
            addMessage('assistant', "I didn't understand that. Try searching for jobs!")
            break
        }
        setLoading(false)
      })
    }, 50)
  }

  // ── Render ──────────────────────────────────────────────────────

  if (!user || user.role !== 'worker') return null

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-24 md:bottom-8 right-4 md:right-6 z-[60] h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-destructive text-destructive-foreground rotate-0'
            : 'bg-primary text-primary-foreground hover:scale-110'
        }`}
        aria-label={open ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-44 md:bottom-24 right-4 md:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] md:h-[550px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">HyperLocal AI</h3>
              <p className="text-xs opacity-80">Your job search assistant</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-foreground/20 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  {/* Markdown-lite: bold and newlines */}
                  <div className="whitespace-pre-wrap">
                    {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i}>{part.slice(2, -2)}</strong>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                  </div>

                  {/* Structured data rendering */}
                  {msg.data?.type === 'jobs' && msg.data.jobs && (
                    <div className="mt-2 space-y-2">
                      {msg.data.jobs.map((job, idx) => (
                        <div
                          key={job.id}
                          className="bg-background rounded-lg p-2.5 border cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleJobDetail(job)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs leading-tight">{job.title}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" /> {job.location}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                  <IndianRupee className="h-3 w-3" /> ₹{(job.pay ?? 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.type === 'job_detail' && msg.data.job && (
                    <div className="mt-2 bg-background rounded-lg p-3 border space-y-2">
                      <h4 className="font-semibold text-sm">{msg.data.job.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-3">{msg.data.job.description}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {msg.data.job.location}
                        </span>
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <IndianRupee className="h-3 w-3" /> ₹{(msg.data.job.pay ?? 0).toLocaleString()}/{msg.data.job.payType === 'hourly' ? 'hr' : 'fixed'}
                        </span>
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {msg.data.job.timing}
                        </span>
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> {msg.data.job.category}
                        </span>
                      </div>
                      {msg.data.job.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.data.job.requiredSkills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-[10px] h-5 px-1.5">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs flex-1"
                          onClick={() => handleApplyJob(msg.data!.job!)}
                        >
                          Apply Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/worker/jobs/${msg.data!.job!.id}`)}
                        >
                          Full Page <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {msg.data?.type === 'applications' && msg.data.applications && (
                    <div className="mt-2 space-y-1.5">
                      {msg.data.applications.map((app) => (
                        <div key={app.id} className="bg-background rounded-lg p-2 border flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            app.status === 'accepted' ? 'bg-green-500' :
                            app.status === 'rejected' ? 'bg-red-500' :
                            app.status === 'completed' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{app.jobTitle}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{app.status}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] h-4 px-1 ${
                              app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              app.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {app.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.type === 'suggestions' && msg.data.suggestions && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.data.suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSuggestionClick(s)}
                          className="text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-primary/10 hover:border-primary transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-background shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about jobs..."
                className="flex-1 h-9 text-sm rounded-full px-4"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                disabled={!input.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
