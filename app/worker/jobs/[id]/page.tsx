'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { mockDb, mockUserOps, mockWorkerProfileOps, mockReportOps } from '@/lib/api'
import { Job, User, Application, WorkerProfile } from '@/lib/types'
import { calculateMatchScore, explainJobMatch, generateMatchExplanationWithAI } from '@/lib/aiMatching'
import { translateDynamic, generateLearningPlan, generateCoverLetter, generateInterviewPrep, SupportedLocale } from '@/lib/gemini'
import type { AILearningPlan, InterviewPrepResult } from '@/lib/gemini'
import { 
  Briefcase, MapPin, Clock, IndianRupee, Calendar, 
  Building2, Star, Shield, ChevronLeft, Send, CheckCircle2, Sparkles, AlertTriangle, Flag,
  Upload, FileText, Laptop, Trash2,
  BookOpen, ExternalLink, Video, GraduationCap, Users, Lightbulb, MessageSquarePlus,
  Loader2, ChevronDown, ChevronUp, Target, Mic
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n } from '@/contexts/I18nContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { isRoleTechnical } from '@/lib/roleSkills'
import { processResumeFile, getResumeSummaryText } from '@/lib/resumeParser'
import type { ResumeData } from '@/lib/types'

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { t, locale } = useI18n()
  const [job, setJob] = useState<Job | null>(null)
  const [employer, setEmployer] = useState<User | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchExplanation, setMatchExplanation] = useState<string | null>(null)
  // Translated title/description for non-English locales
  const [displayTitle, setDisplayTitle] = useState<string | null>(null)
  const [displayDescription, setDisplayDescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  // Report job state
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('fake_job')
  const [reportDesc, setReportDesc] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [isReported, setIsReported] = useState(false)
  // Resume upload state (for technical jobs)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeParsed, setResumeParsed] = useState<ResumeData | null>(null)
  const [parsingResume, setParsingResume] = useState(false)

  // ── AI Agentic features state ──
  const [learningPlan, setLearningPlan] = useState<AILearningPlan | null>(null)
  const [loadingLearning, setLoadingLearning] = useState(false)
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepResult | null>(null)
  const [loadingInterview, setLoadingInterview] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [aiTabExpanded, setAiTabExpanded] = useState(true)

  // Load reported state from localStorage
  useEffect(() => {
    if (user && params.id) {
      const key = `reported_jobs_${user.id}`
      const stored = localStorage.getItem(key)
      if (stored) {
        const ids: string[] = JSON.parse(stored)
        setIsReported(ids.includes(params.id as string))
      }
    }
  }, [user, params.id])

  useEffect(() => {
    loadJobDetails()
  }, [params.id, user])

  // Translate job title + description when locale changes (hi/te)
  useEffect(() => {
    if (!job || locale === 'en') {
      setDisplayTitle(null)
      setDisplayDescription(null)
      return
    }
    const titleKey = `ai_title_${job.id}_${locale}`
    const descKey  = `ai_desc_${job.id}_${locale}`
    const cachedTitle = sessionStorage.getItem(titleKey)
    const cachedDesc  = sessionStorage.getItem(descKey)
    if (cachedTitle && cachedDesc) {
      setDisplayTitle(cachedTitle)
      setDisplayDescription(cachedDesc)
      return
    }
    let cancelled = false
    const lang = locale as SupportedLocale
    Promise.all([
      translateDynamic(job.title, lang).catch(() => job.title),
      translateDynamic(job.description, lang).catch(() => job.description),
    ]).then(([title, desc]) => {
      if (!cancelled) {
        setDisplayTitle(title)
        setDisplayDescription(desc)
        sessionStorage.setItem(titleKey, title)
        sessionStorage.setItem(descKey,  desc)
      }
    })
    return () => { cancelled = true }
  }, [job, locale])

  const loadJobDetails = async () => {
    try {
      const jobData = await mockDb.getJobById(params.id as string)
      if (jobData) {
        setJob(jobData)
        const employerData = await mockUserOps.findById(jobData.employerId)
        setEmployer(employerData)

        if (user) {
          const [workerApplications, profile] = await Promise.all([
            mockDb.getApplicationsByWorker(user.id),
            mockWorkerProfileOps.findByUserId(user.id).catch(() => null),
          ])
          const existingApplication = workerApplications
            .find(app => app.jobId === jobData.id)
          setApplication(existingApplication || null)
          if (profile) {
            setWorkerProfile(profile)
            const score = calculateMatchScore(profile, jobData)
            setMatchScore(score)
            // sessionStorage cache — avoids re-calling Gemini on every navigation
            const expCacheKey = `ai_exp_${jobData.id}_${user?.id}`
            const cachedExp = sessionStorage.getItem(expCacheKey)
            if (cachedExp) {
              setMatchExplanation(cachedExp)
            } else {
              // Show deterministic explanation immediately, then upgrade with Gemini
              setMatchExplanation(explainJobMatch(profile, jobData, score))
              generateMatchExplanationWithAI(profile, jobData, score)
                .then((exp) => {
                  if (exp) {
                    setMatchExplanation(exp)
                    sessionStorage.setItem(expCacheKey, exp)
                  }
                })
                .catch(() => { /* deterministic fallback already shown */ })
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load job details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!user || !job) return

    // Cover letter validation (only if provided, since it's optional)
    if (coverLetter && coverLetter.trim().length < 20) {
      toast({
        title: 'Cover Letter Too Short',
        description: 'Please write at least 20 characters explaining why you are a good fit.',
        variant: 'destructive'
      })
      return
    }

    // Resume requirement for technical jobs
    const jobIsTechnical = job.jobNature === 'technical' || isRoleTechnical(job.category)
    if (jobIsTechnical && !resumeFile && !workerProfile?.resumeUrl) {
      toast({
        title: 'Resume Required',
        description: 'This is a technical job. Please upload your resume before applying.',
        variant: 'destructive'
      })
      return
    }

    // Duplicate application guard (in case state is stale)
    if (application) {
      toast({ title: 'Already Applied', description: 'You have already applied to this job.' })
      return
    }

    setApplying(true)
    try {
      // Build application payload
      const appPayload: Record<string, unknown> = {
        jobId: job.id,
        workerId: user.id,
        coverLetter,
        status: 'pending',
        matchScore: matchScore ?? 0,
      }

      // Attach resume URL if available
      if (resumeFile) {
        // For now, store resume data in the application
        // In production, upload to Supabase Storage and store the URL
        appPayload.resumeUrl = `resume_${user.id}_${Date.now()}.pdf`
      } else if (workerProfile?.resumeUrl) {
        appPayload.resumeUrl = workerProfile.resumeUrl
      }

      const newApplication = await mockDb.createApplication(appPayload as Parameters<typeof mockDb.createApplication>[0])

      // If resume was parsed, update worker profile with parsed data
      if (resumeParsed && resumeFile) {
        await mockWorkerProfileOps.update(user.id, {
          resumeUrl: appPayload.resumeUrl as string,
          resumeText: await resumeFile.text().catch(() => ''),
          resumeParsed: resumeParsed,
        }).catch(() => {})
      }

      setApplication(newApplication)
      setShowApplicationForm(false)

      // Create a conversation so employer can chat with the worker
      await mockDb.createConversation({
        workerId: user.id,
        employerId: job.employerId,
        jobId: job.id,
        applicationId: newApplication.id,
        participants: [user.id, job.employerId]
      }).catch(() => {})

      toast({
        title: 'Success!',
        description: 'Your application has been submitted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit application',
        variant: 'destructive'
      })
    } finally {
      setApplying(false)
    }
  }

  // Handle resume file selection
  const handleResumeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Resume must be under 5MB', variant: 'destructive' })
      return
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.txt', '.doc', '.docx']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(ext)) {
      toast({ title: 'Invalid File Type', description: 'Please upload a PDF, TXT, DOC, or DOCX file', variant: 'destructive' })
      return
    }

    setResumeFile(file)
    setParsingResume(true)

    try {
      const { parsed } = await processResumeFile(file)
      setResumeParsed(parsed)
      toast({ title: 'Resume Parsed', description: `Found ${parsed.skills.length} skills, ${parsed.experience.length} experiences` })
    } catch {
      toast({ title: 'Resume Upload OK', description: 'Could not parse resume details, but the file is attached.' })
    } finally {
      setParsingResume(false)
    }
  }

  const handleReportJob = async () => {
    if (!user || !job) return
    setSubmittingReport(true)
    try {
      await mockReportOps.create({
        reporterId: user.id,
        reportedJobId: job.id,
        type: 'fake_job',
        reason: reportReason,
        description: reportDesc || reportReason,
        status: 'pending',
      })
      toast({ title: 'Report submitted', description: 'Our team will review this job listing.' })
      setReportOpen(false)
      setReportDesc('')
      setIsReported(true)
      if (user && job) {
        const key = `reported_jobs_${user.id}`
        const stored = localStorage.getItem(key)
        const ids: string[] = stored ? JSON.parse(stored) : []
        if (!ids.includes(job.id)) {
          localStorage.setItem(key, JSON.stringify([...ids, job.id]))
        }
      }
    } catch {
      toast({ title: 'Failed to submit report', variant: 'destructive' })
    } finally {
      setSubmittingReport(false)
    }
  }

  // ── Agentic AI: Fetch learning plan ──
  const handleLoadLearningPlan = async () => {
    if (!job || loadingLearning) return
    // Check sessionStorage cache
    const cacheKey = `lp_${job.id}_${user?.id}_${locale}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setLearningPlan(JSON.parse(cached)); return } catch { /* fall through */ }
    }
    setLoadingLearning(true)
    try {
      const plan = await generateLearningPlan(
        job.title,
        job.requiredSkills,
        workerProfile?.skills ?? [],
        workerProfile?.experience ?? '',
        locale as SupportedLocale
      )
      setLearningPlan(plan)
      sessionStorage.setItem(cacheKey, JSON.stringify(plan))
    } catch (e) {
      console.error('Learning plan failed', e)
      toast({ title: 'Could not load learning plan', variant: 'destructive' })
    } finally {
      setLoadingLearning(false)
    }
  }

  // ── Agentic AI: Interview prep ──
  const handleLoadInterviewPrep = async () => {
    if (!job || loadingInterview) return
    const cacheKey = `ip_${job.id}_${locale}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setInterviewPrep(JSON.parse(cached)); return } catch { /* fall through */ }
    }
    setLoadingInterview(true)
    try {
      const prep = await generateInterviewPrep(
        job.title,
        job.category,
        job.requiredSkills,
        workerProfile?.skills ?? [],
        locale as SupportedLocale
      )
      setInterviewPrep(prep)
      sessionStorage.setItem(cacheKey, JSON.stringify(prep))
    } catch (e) {
      console.error('Interview prep failed', e)
      toast({ title: 'Could not load interview prep', variant: 'destructive' })
    } finally {
      setLoadingInterview(false)
    }
  }

  // ── Agentic AI: Cover letter generator ──
  const handleGenerateCoverLetter = async () => {
    if (!job || !user || generatingCover) return
    setGeneratingCover(true)
    try {
      const letter = await generateCoverLetter(
        job.title,
        job.description,
        job.requiredSkills,
        workerProfile?.skills ?? [],
        workerProfile?.experience ?? '',
        user.fullName,
        locale as SupportedLocale
      )
      setCoverLetter(letter)
      toast({ title: 'Cover letter generated!', description: 'Feel free to edit it before submitting.' })
    } catch {
      toast({ title: 'Could not generate cover letter', variant: 'destructive' })
    } finally {
      setGeneratingCover(false)
    }
  }

  if (loading) {
    return (
      <div className="app-surface">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="app-surface">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Job Not Found</h3>
              <Button onClick={() => router.push('/worker/jobs')}>
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="app-surface">
      <WorkerNav />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{displayTitle || job.title}</CardTitle>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{employer?.companyName || 'Company'}</span>
                    </div>
                  </div>
                  <Badge variant={job.status === 'active' ? 'default' : 'outline'}>
                    {job.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.jobMode && (
                    <Badge variant="outline" className="gap-1">
                      {job.jobMode === 'remote' ? <Laptop className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {job.jobMode === 'remote' ? 'Remote' : 'On-site'}
                    </Badge>
                  )}
                  {job.jobNature && (
                    <Badge variant={job.jobNature === 'technical' ? 'default' : 'secondary'} className="gap-1">
                      {job.jobNature === 'technical' ? <FileText className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />}
                      {job.jobNature === 'technical' ? 'Technical' : 'Non-Technical'}
                    </Badge>
                  )}
                  {job.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <p className="font-semibold">₹{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{job.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{job.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-semibold capitalize">{job.experienceRequired}</p>
                    </div>
                  </div>
                </div>

                {job.escrowRequired && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Payment secured with escrow - Funds released after completion
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{displayDescription || job.description}</p>
              </CardContent>
            </Card>

            {job.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{job.requirements}</p>
                </CardContent>
              </Card>
            )}

            {job.benefits && (
              <Card>
                <CardHeader>
                  <CardTitle>Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{job.benefits}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {matchScore !== null && (
              <Card className={`border-2 ${matchScore >= 70 ? 'border-green-300 bg-green-50/50' : matchScore >= 40 ? 'border-blue-200 bg-blue-50/50' : 'border-border'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-primary" /> AI Match Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all ${matchScore >= 70 ? 'bg-green-500' : matchScore >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${matchScore}%` }}
                      />
                    </div>
                    <span className={`text-lg font-bold ${matchScore >= 70 ? 'text-green-700' : matchScore >= 40 ? 'text-blue-700' : 'text-amber-600'}`}>
                      {matchScore}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {matchScore >= 70 ? '🌟 Strong Match' : matchScore >= 40 ? '👍 Good Match' : '📋 Possible Match'}
                  </p>
                  {matchExplanation && (
                    <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                      {matchExplanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── AI Career Coach Panel ── */}
            <Card className="border-primary/20 overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
                onClick={() => setAiTabExpanded((v) => !v)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-6 w-6">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75" />
                      <Sparkles className="relative h-6 w-6 text-primary" />
                    </span>
                    AI Career Coach
                  </span>
                  {aiTabExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Personalized learning resources, interview prep & more</p>
              </CardHeader>
              {aiTabExpanded && (
                <CardContent className="pt-0">
                  <Tabs defaultValue="learn" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-3">
                      <TabsTrigger value="learn" className="text-xs gap-1">
                        <BookOpen className="h-3 w-3" /> Learn Skills
                      </TabsTrigger>
                      <TabsTrigger value="interview" className="text-xs gap-1">
                        <Mic className="h-3 w-3" /> Interview Prep
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Learning Plan Tab ── */}
                    <TabsContent value="learn" className="mt-0">
                      {!learningPlan && !loadingLearning ? (
                        <div className="text-center py-4">
                          <Target className="h-8 w-8 mx-auto mb-2 text-primary/60" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Get AI-curated learning resources to improve your chances for this job
                          </p>
                          <Button size="sm" onClick={handleLoadLearningPlan} className="gap-2">
                            <Sparkles className="h-3.5 w-3.5" /> Generate Learning Plan
                          </Button>
                        </div>
                      ) : loadingLearning ? (
                        <div className="flex flex-col items-center py-6 gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground animate-pulse">AI is researching the best resources for you...</p>
                        </div>
                      ) : learningPlan ? (
                        <div className="space-y-4">
                          {/* Readiness Score */}
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium">Job Readiness</span>
                              <span className="text-sm font-bold text-primary">{learningPlan.readinessScore}%</span>
                            </div>
                            <Progress value={learningPlan.readinessScore} className="h-2" />
                          </div>

                          {/* Quick Wins */}
                          {learningPlan.quickWins.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" /> Quick Wins — Do Today
                              </h4>
                              <div className="space-y-1.5">
                                {learningPlan.quickWins.map((tip, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Learning Resources */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" /> Learning Resources
                            </h4>
                            <div className="space-y-3">
                              {learningPlan.resources.map((res, i) => (
                                <div key={i} className="border rounded-lg p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Badge variant={res.hasSkill ? 'default' : 'secondary'} className="text-xs">
                                      {res.hasSkill ? '✓ ' : ''}{res.skill}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{res.estimatedTime}</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {res.resources.map((link, j) => {
                                      const TypeIcon = link.type === 'video' ? Video
                                        : link.type === 'course' ? GraduationCap
                                        : link.type === 'community' ? Users
                                        : BookOpen
                                      return (
                                        <a
                                          key={j}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-muted/80 transition-colors group"
                                        >
                                          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <span className="text-primary group-hover:underline font-medium">{link.title}</span>
                                            <span className="block text-muted-foreground">{link.description}</span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {link.free && <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-200">Free</Badge>}
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </a>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Career Path */}
                          {learningPlan.careerPath && (
                            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
                              <h4 className="text-xs font-semibold mb-1 flex items-center gap-1">
                                <Target className="h-3 w-3 text-primary" /> Career Growth Path
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">{learningPlan.careerPath}</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </TabsContent>

                    {/* ── Interview Prep Tab ── */}
                    <TabsContent value="interview" className="mt-0">
                      {!interviewPrep && !loadingInterview ? (
                        <div className="text-center py-4">
                          <Mic className="h-8 w-8 mx-auto mb-2 text-primary/60" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Practice likely questions and get tips for your interview
                          </p>
                          <Button size="sm" onClick={handleLoadInterviewPrep} className="gap-2">
                            <Sparkles className="h-3.5 w-3.5" /> Generate Interview Prep
                          </Button>
                        </div>
                      ) : loadingInterview ? (
                        <div className="flex flex-col items-center py-6 gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-xs text-muted-foreground animate-pulse">AI is preparing interview questions...</p>
                        </div>
                      ) : interviewPrep ? (
                        <div className="space-y-4">
                          {/* Questions */}
                          <div className="space-y-3">
                            {interviewPrep.questions.map((q, i) => (
                              <div key={i} className="border rounded-lg p-3 space-y-2">
                                <p className="text-sm font-medium flex items-start gap-2">
                                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  {q.question}
                                </p>
                                <div className="ml-7 space-y-1.5">
                                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                                    <span className="font-medium text-foreground">Sample answer: </span>
                                    {q.sampleAnswer}
                                  </div>
                                  <p className="text-xs text-primary/80 flex items-start gap-1">
                                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                                    {q.tip}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* General Tips */}
                          <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">General Tips</h4>
                            <div className="space-y-1.5">
                              {interviewPrep.generalTips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                  <span>{tip}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Dress Code & What to Bring */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="border rounded-lg p-2.5">
                              <h4 className="text-xs font-semibold mb-1">👔 Dress Code</h4>
                              <p className="text-xs text-muted-foreground">{interviewPrep.dresscode}</p>
                            </div>
                            <div className="border rounded-lg p-2.5">
                              <h4 className="text-xs font-semibold mb-1">📋 What to Bring</h4>
                              <ul className="space-y-0.5">
                                {interviewPrep.whatToBring.map((item, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>

            {employer && (
              <Card>
                <CardHeader>
                  <CardTitle>About Employer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {employer.companyName?.charAt(0) || 'E'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{employer.companyName}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{employer.trustScore.toFixed(1)} Trust Score</span>
                      </div>
                    </div>
                  </div>
                  {employer.companyDescription && (
                    <p className="text-sm text-muted-foreground">{employer.companyDescription}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {application ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Application</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Application Submitted</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <Badge variant={
                      application.status === 'accepted' ? 'default' :
                      application.status === 'rejected' ? 'destructive' :
                      'secondary'
                    }>
                      {application.status}
                    </Badge>
                  </div>
                  {application.coverLetter && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Cover Letter</p>
                      <p className="text-sm">{application.coverLetter}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : showApplicationForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Apply for this Job</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resume upload for technical jobs */}
                  {(job.jobNature === 'technical' || isRoleTechnical(job.category)) && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Resume *
                      </Label>
                      {workerProfile?.resumeUrl && !resumeFile && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="text-green-700 dark:text-green-300">Profile resume will be used</span>
                        </div>
                      )}
                      {!resumeFile ? (
                        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground text-center">
                            {workerProfile?.resumeUrl ? 'Upload a new resume (optional)' : 'Upload your resume (PDF, DOCX, TXT)'}
                          </span>
                          <span className="text-xs text-muted-foreground">Max 5MB</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleResumeSelect}
                          />
                        </label>
                      ) : (
                        <div className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium truncate max-w-45">{resumeFile.name}</span>
                              <span className="text-xs text-muted-foreground">({(resumeFile.size / 1024).toFixed(0)} KB)</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => { setResumeFile(null); setResumeParsed(null) }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {parsingResume && (
                            <p className="text-xs text-muted-foreground animate-pulse">Analyzing resume with AI...</p>
                          )}
                          {resumeParsed && !parsingResume && (
                            <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                              {resumeParsed.skills.length > 0 && (
                                <p><strong>Skills:</strong> {resumeParsed.skills.slice(0, 6).join(', ')}{resumeParsed.skills.length > 6 ? ` +${resumeParsed.skills.length - 6} more` : ''}</p>
                              )}
                              {resumeParsed.experience.length > 0 && (
                                <p><strong>Experience:</strong> {resumeParsed.experience.length} position{resumeParsed.experience.length > 1 ? 's' : ''}</p>
                              )}
                              {resumeParsed.projects.length > 0 && (
                                <p><strong>Projects:</strong> {resumeParsed.projects.length}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1.5 h-7 text-primary hover:text-primary"
                        onClick={() => { setShowApplicationForm(true); handleGenerateCoverLetter() }}
                        disabled={generatingCover}
                      >
                        {generatingCover ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-3 w-3" /> AI Write for me</>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="coverLetter"
                      placeholder="Introduce yourself and explain why you're a great fit..."
                      rows={6}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleApply}
                      disabled={applying || parsingResume}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {applying ? 'Submitting...' : parsingResume ? 'Parsing Resume...' : 'Submit Application'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowApplicationForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowApplicationForm(true)}
                    disabled={job.status !== 'active'}
                  >
                    Apply Now
                  </Button>
                  {job.status !== 'active' && (
                    <p className="text-sm text-center text-muted-foreground">
                      This job is no longer active
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-full ${isReported ? 'text-orange-500 cursor-default' : 'text-muted-foreground hover:text-destructive'}`}
                    onClick={() => !isReported && setReportOpen(true)}
                    disabled={isReported}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {isReported ? '✓ Job Reported' : 'Report this job'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Report Job Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report this Job
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Reason</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fake_job" id="rj-fake" />
                  <Label htmlFor="rj-fake">Fake or scam job listing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="payment_issue" id="rj-pay" />
                  <Label htmlFor="rj-pay">Payment issue or non-payment history</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="misleading" id="rj-mislead" />
                  <Label htmlFor="rj-mislead">Misleading job description</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="illegal" id="rj-illegal" />
                  <Label htmlFor="rj-illegal">Illegal or unsafe work</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="spam" id="rj-spam" />
                  <Label htmlFor="rj-spam">Spam or duplicate posting</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="report-job-desc" className="text-sm font-medium mb-1 block">
                Additional details <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="report-job-desc"
                placeholder="Describe the issue..."
                rows={3}
                value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReportJob} disabled={submittingReport}>
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
