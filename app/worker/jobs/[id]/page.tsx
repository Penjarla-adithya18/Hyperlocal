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
import { translateDynamic, SupportedLocale } from '@/lib/gemini'
import { 
  Briefcase, MapPin, Clock, IndianRupee, Calendar, 
  Building2, Star, Shield, ChevronLeft, Send, CheckCircle2, Sparkles, AlertTriangle, Flag
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n } from '@/contexts/I18nContext'

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
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
    if (authLoading) return
    if (!user) {
      setLoading(false)
      router.replace('/login')
      return
    }
    loadJobDetails()
  }, [params.id, user, authLoading, router])

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
      if (error instanceof Error && error.message.includes('error 401')) {
        toast({
          title: 'Session expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        })
        router.replace('/login')
        return
      }
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

    // Duplicate application guard (in case state is stale)
    if (application) {
      toast({ title: 'Already Applied', description: 'You have already applied to this job.' })
      return
    }

    setApplying(true)
    try {
      const newApplication = await mockDb.createApplication({
        jobId: job.id,
        workerId: user.id,
        coverLetter: coverLetter.trim() || undefined,
        status: 'pending'
      })

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
      // Persist reported state so the job stays marked even after navigation
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
                <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <CardTitle className="mb-2 text-xl sm:text-2xl">{displayTitle || job.title}</CardTitle>
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
                  {job.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-sm leading-6 whitespace-pre-wrap break-words">{application.coverLetter}</p>
                      </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                    <Textarea
                      id="coverLetter"
                      placeholder="Introduce yourself and explain why you're a great fit..."
                      rows={6}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                    <p className="text-xs leading-5 text-muted-foreground text-left">
                      Optional: you can leave this blank, or add a short introduction to improve your chances.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full sm:flex-1"
                      onClick={handleApply}
                      disabled={applying}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {applying ? 'Submitting...' : 'Submit Application'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
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
