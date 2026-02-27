'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Mic,
  Brain,
  Loader2,
  FileText,
  Volume2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  confidence_score: number
  is_reading: boolean
  is_ai_voice: boolean
  tone_natural: boolean
  flags: string[]
  details: string
  audio_metrics?: {
    avgVolume: number
    volumeVariance: number
    silenceRatio: number
    peakCount: number
    speechRateVariance: number
  }
  // Whisper + NLP pipeline results
  transcribed_text?: string
  transcription_language?: string
  originality_check?: {
    is_original: boolean
    confidence: number
    reasoning: string
    speech_pattern: string
  }
  answer_check?: {
    is_correct: boolean
    score: number
    matched_points: string[]
    missed_points: string[]
    summary: string
  }
  // Auto-decision fields
  auto_decision?: 'approved' | 'rejected' | 'pending'
  auto_decision_reason?: string
}

interface SkillAssessment {
  id: string
  worker_id: string
  skill: string
  question: { en: string; hi?: string; te?: string }
  expected_answer: string
  video_url: string | null
  video_duration_ms: number
  analysis: AnalysisResult | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
  // Joined data
  worker_name?: string
  worker_phone?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSkillReviewsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<SkillAssessment[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }
    fetchAssessments()
  }, [user, router])

  const fetchAssessments = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch from Supabase REST API
      let url = `${SUPABASE_URL}/rest/v1/skill_assessments?select=*&order=created_at.desc`
      if (filterStatus !== 'all') {
        url += `&status=eq.${filterStatus}`
      }

      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        // Fetch worker names for each assessment
        const workerIds = [...new Set((data as SkillAssessment[]).map(a => a.worker_id))]
        const workerMap: Record<string, { name: string; phone: string }> = {}

        if (workerIds.length > 0) {
          const usersRes = await fetch(
            `${SUPABASE_URL}/rest/v1/users?id=in.(${workerIds.join(',')})&select=id,full_name,phone_number`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            },
          )
          if (usersRes.ok) {
            const users = await usersRes.json()
            for (const u of users) {
              workerMap[u.id] = { name: u.full_name, phone: u.phone_number }
            }
          }
        }

        setAssessments(
          (data as SkillAssessment[]).map(a => ({
            ...a,
            worker_name: workerMap[a.worker_id]?.name ?? 'Unknown',
            worker_phone: workerMap[a.worker_id]?.phone ?? '',
          })),
        )
      } else {
        // Fallback: empty for now
        setAssessments([])
      }
    } catch (e) {
      console.error('Failed to fetch assessments:', e)
      setAssessments([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    if (user?.role === 'admin') fetchAssessments()
  }, [filterStatus, fetchAssessments, user])

  const handleReview = async (assessmentId: string, decision: 'approved' | 'rejected') => {
    setReviewLoading(assessmentId)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/skill_assessments?id=eq.${assessmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          status: decision,
          reviewed_by: user!.id,
          review_notes: reviewNotes[assessmentId] || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })

      if (res.ok) {
        toast({
          title: decision === 'approved' ? 'Skill Approved' : 'Skill Rejected',
          description: `Assessment has been ${decision}.`,
        })
        // Update local state
        setAssessments(prev =>
          prev.map(a =>
            a.id === assessmentId
              ? { ...a, status: decision, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }
              : a
          ),
        )
        setExpandedId(null)
      } else {
        throw new Error('Update failed')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update assessment.', variant: 'destructive' })
    } finally {
      setReviewLoading(null)
    }
  }

  const filteredAssessments = assessments.filter(a => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        a.skill.toLowerCase().includes(q) ||
        a.worker_name?.toLowerCase().includes(q) ||
        a.worker_phone?.includes(q)
      )
    }
    return true
  })

  const statusCounts = {
    all: assessments.length,
    pending: assessments.filter(a => a.status === 'pending').length,
    approved: assessments.filter(a => a.status === 'approved').length,
    rejected: assessments.filter(a => a.status === 'rejected').length,
  }

  if (loading && assessments.length === 0) {
    return (
      <div className="app-surface">
        <AdminNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-surface">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 pb-28 md:pb-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Skill Video Reviews
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review worker skill assessment videos and verify their skills
            </p>
          </div>
          <Button variant="outline" onClick={fetchAssessments} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by skill, worker name, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="capitalize"
              >
                {status} ({statusCounts[status]})
              </Button>
            ))}
          </div>
        </div>

        {/* Assessments list */}
        {filteredAssessments.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No assessments found</h3>
            <p className="text-sm text-muted-foreground">
              {filterStatus === 'pending'
                ? 'No pending skill assessments to review.'
                : 'No assessments match your criteria.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map(assessment => (
              <Card key={assessment.id} className="overflow-hidden">
                {/* Summary row */}
                <button
                  type="button"
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setExpandedId(expandedId === assessment.id ? null : assessment.id)}
                >
                  <div className="flex-shrink-0">
                    {assessment.status === 'pending' && <Clock className="w-6 h-6 text-amber-500" />}
                    {assessment.status === 'approved' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                    {assessment.status === 'rejected' && <XCircle className="w-6 h-6 text-red-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{assessment.skill}</span>
                      <Badge variant={
                        assessment.status === 'approved' ? 'default' :
                        assessment.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {assessment.status}
                      </Badge>
                      {assessment.analysis?.auto_decision && assessment.analysis.auto_decision !== 'pending' && (
                        <Badge variant="outline" className={`text-xs ${
                          assessment.analysis.auto_decision === 'approved'
                            ? 'border-green-400 text-green-700 dark:text-green-400'
                            : 'border-red-400 text-red-700 dark:text-red-400'
                        }`}>
                          🤖 Auto-{assessment.analysis.auto_decision}
                        </Badge>
                      )}
                      {assessment.analysis && (
                        <Badge variant={assessment.analysis.confidence_score >= 60 ? 'outline' : 'destructive'} className="text-xs">
                          <Brain className="w-3 h-3 mr-1" />
                          {assessment.analysis.confidence_score}% confidence
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {assessment.worker_name}
                      </span>
                      <span>{new Date(assessment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Anti-cheat flags */}
                  {assessment.analysis && assessment.analysis.flags.length > 0 && (
                    <Badge variant="destructive" className="flex-shrink-0 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {assessment.analysis.flags.length} flag{assessment.analysis.flags.length > 1 ? 's' : ''}
                    </Badge>
                  )}

                  {expandedId === assessment.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* Expanded detail view */}
                {expandedId === assessment.id && (
                  <div className="border-t p-4 space-y-4 bg-muted/20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left: Video player */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Video className="w-4 h-4" /> Video Recording
                        </h4>
                        {assessment.video_url ? (
                          <div className="rounded-xl overflow-hidden bg-black aspect-video">
                            <video
                              src={assessment.video_url}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <Card className="aspect-video flex items-center justify-center bg-muted">
                            <p className="text-muted-foreground">No video available</p>
                          </Card>
                        )}
                      </div>

                      {/* Right: Question & expected answer */}
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Question (English)
                          </h4>
                          <Card className="p-3 bg-blue-50 dark:bg-blue-950/30">
                            <p className="text-sm">{assessment.question?.en || JSON.stringify(assessment.question)}</p>
                          </Card>
                        </div>

                        {assessment.question?.hi && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Hindi / हिन्दी</h4>
                            <Card className="p-3 bg-blue-50/50 dark:bg-blue-950/20">
                              <p className="text-sm">{assessment.question.hi}</p>
                            </Card>
                          </div>
                        )}

                        {assessment.question?.te && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Telugu / తెలుగు</h4>
                            <Card className="p-3 bg-blue-50/50 dark:bg-blue-950/20">
                              <p className="text-sm">{assessment.question.te}</p>
                            </Card>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">
                            ✓ Expected Answer
                          </h4>
                          <Card className="p-3 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                            <p className="text-sm">{assessment.expected_answer}</p>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Anti-cheat analysis */}
                    {assessment.analysis && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4" /> AI Anti-Cheat Analysis
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-2xl font-bold">{assessment.analysis.confidence_score}%</p>
                            <p className="text-xs text-muted-foreground">Confidence</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-lg">
                              {assessment.analysis.is_reading ? (
                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                              ) : (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">Reading Check</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-lg">
                              {assessment.analysis.is_ai_voice ? (
                                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
                              ) : (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">AI Voice Check</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-lg">
                              {assessment.analysis.tone_natural ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              ) : (
                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">Natural Tone</p>
                          </div>
                        </div>

                        {assessment.analysis.flags.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-destructive mb-1">⚠ Flags:</p>
                            <ul className="text-sm space-y-1">
                              {assessment.analysis.flags.map((flag, i) => (
                                <li key={i} className="text-muted-foreground flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                  {flag}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {assessment.analysis.details}
                        </p>

                        {/* Audio metrics details */}
                        {assessment.analysis.audio_metrics && (
                          <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                            <div className="text-center p-1.5 bg-muted/30 rounded">
                              <p className="font-mono">{assessment.analysis.audio_metrics.avgVolume.toFixed(3)}</p>
                              <p className="text-muted-foreground">Avg Vol</p>
                            </div>
                            <div className="text-center p-1.5 bg-muted/30 rounded">
                              <p className="font-mono">{assessment.analysis.audio_metrics.volumeVariance.toFixed(4)}</p>
                              <p className="text-muted-foreground">Vol Var</p>
                            </div>
                            <div className="text-center p-1.5 bg-muted/30 rounded">
                              <p className="font-mono">{(assessment.analysis.audio_metrics.silenceRatio * 100).toFixed(1)}%</p>
                              <p className="text-muted-foreground">Silence</p>
                            </div>
                            <div className="text-center p-1.5 bg-muted/30 rounded">
                              <p className="font-mono">{assessment.analysis.audio_metrics.peakCount}</p>
                              <p className="text-muted-foreground">Peaks</p>
                            </div>
                            <div className="text-center p-1.5 bg-muted/30 rounded">
                              <p className="font-mono">{assessment.analysis.audio_metrics.speechRateVariance.toFixed(4)}</p>
                              <p className="text-muted-foreground">Rate Var</p>
                            </div>
                          </div>
                        )}
                      </Card>
                    )}

                    {/* ── Transcribed Text ────────────────────────────────── */}
                    {assessment.analysis?.transcribed_text && (
                      <Card className="p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Transcribed Answer (Whisper)
                          {assessment.analysis.transcription_language && (
                            <Badge variant="outline" className="text-xs ml-auto">
                              Language: {assessment.analysis.transcription_language}
                            </Badge>
                          )}
                        </h4>
                        <div className="bg-muted/40 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {assessment.analysis.transcribed_text}
                          </p>
                        </div>
                      </Card>
                    )}

                    {/* ── Originality / Plagiarism Check ──────────────────── */}
                    {assessment.analysis?.originality_check && (
                      <Card className={`p-4 ${
                        assessment.analysis.originality_check.is_original
                          ? 'border-green-200 dark:border-green-800'
                          : 'border-red-200 dark:border-red-800'
                      }`}>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Mic className="w-4 h-4" /> Originality / Plagiarism Check
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-lg">
                              {assessment.analysis.originality_check.is_original ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-6 h-6 text-red-500 mx-auto" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assessment.analysis.originality_check.is_original ? 'Original' : 'Not Original'}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-2xl font-bold">{assessment.analysis.originality_check.confidence}%</p>
                            <p className="text-xs text-muted-foreground">Confidence</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <Badge variant={
                              assessment.analysis.originality_check.speech_pattern === 'natural' ? 'default' :
                              assessment.analysis.originality_check.speech_pattern === 'ai_generated' ? 'destructive' : 'secondary'
                            } className="text-xs">
                              {assessment.analysis.originality_check.speech_pattern}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">Speech Pattern</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                          {assessment.analysis.originality_check.reasoning}
                        </p>
                      </Card>
                    )}

                    {/* ── Answer Correctness Check ────────────────────────── */}
                    {assessment.analysis?.answer_check && (
                      <Card className={`p-4 ${
                        assessment.analysis.answer_check.is_correct
                          ? 'border-green-200 dark:border-green-800'
                          : 'border-amber-200 dark:border-amber-800'
                      }`}>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4" /> Answer Correctness
                          <Badge
                            variant={assessment.analysis.answer_check.score >= 60 ? 'default' : 'destructive'}
                            className="ml-auto"
                          >
                            Score: {assessment.analysis.answer_check.score}/100
                          </Badge>
                        </h4>

                        {assessment.analysis.answer_check.matched_points.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">✓ Correct Points:</p>
                            <ul className="text-sm space-y-0.5">
                              {assessment.analysis.answer_check.matched_points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-1 text-muted-foreground">
                                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {assessment.analysis.answer_check.missed_points.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">✗ Missed Points:</p>
                            <ul className="text-sm space-y-0.5">
                              {assessment.analysis.answer_check.missed_points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-1 text-muted-foreground">
                                  <XCircle className="w-3 h-3 mt-0.5 text-red-500 flex-shrink-0" />
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                          {assessment.analysis.answer_check.summary}
                        </p>
                      </Card>
                    )}

                    {/* Auto-decision info */}
                    {assessment.analysis?.auto_decision && assessment.analysis.auto_decision !== 'pending' && (
                      <Card className={`p-4 ${
                        assessment.analysis.auto_decision === 'approved'
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      }`}>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          🤖 Auto-{assessment.analysis.auto_decision === 'approved' ? 'Approved' : 'Rejected'} by AI
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {assessment.analysis.auto_decision_reason}
                        </p>
                      </Card>
                    )}

                    {/* Review actions — admin override for any status */}
                    <Card className="p-4 border-primary/30">
                      <h4 className="font-medium mb-3">
                        {assessment.status === 'pending' ? 'Admin Decision' : 'Admin Override'}
                        {assessment.status !== 'pending' && (
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            (Override the auto-decision if needed)
                          </span>
                        )}
                      </h4>
                      <Textarea
                        placeholder="Review notes (optional) — explain your decision..."
                        value={reviewNotes[assessment.id] || ''}
                        onChange={e => setReviewNotes(prev => ({ ...prev, [assessment.id]: e.target.value }))}
                        rows={2}
                        className="mb-3"
                      />
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 gap-2"
                          variant={assessment.status === 'approved' ? 'outline' : 'default'}
                          onClick={() => handleReview(assessment.id, 'approved')}
                          disabled={reviewLoading === assessment.id}
                        >
                          {reviewLoading === assessment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          {assessment.status === 'approved' ? 'Re-Approve' : 'Approve Skill'}
                        </Button>
                        <Button
                          variant="destructive"
                          className={`flex-1 gap-2 ${assessment.status === 'rejected' ? 'opacity-70' : ''}`}
                          onClick={() => handleReview(assessment.id, 'rejected')}
                          disabled={reviewLoading === assessment.id}
                        >
                          {reviewLoading === assessment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {assessment.status === 'rejected' ? 'Re-Reject' : 'Reject Skill'}
                        </Button>
                      </div>
                    </Card>

                    {/* Already reviewed notes */}
                    {assessment.review_notes && (
                      <Card className="p-3 bg-muted/30">
                        <p className="text-sm"><strong>Review notes:</strong> {assessment.review_notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed on {assessment.reviewed_at ? new Date(assessment.reviewed_at).toLocaleString() : 'N/A'}
                        </p>
                      </Card>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
