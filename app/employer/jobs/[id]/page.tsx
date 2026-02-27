'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { db, escrowOps, applicationOps, ratingOps, userOps, workerProfileOps, notificationOps, sendWATIAlert } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Job, Application, EscrowTransaction, WorkerProfile } from '@/lib/types'
import {
  ArrowLeft, Lock, Unlock, RefreshCcw, MapPin, Clock, IndianRupee, Users,
  Briefcase, CheckCircle2, AlertCircle, Edit, Shield, Star, MessageSquare,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const COMMISSION_RATE = 0.10

export default function EmployerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [workersById, setWorkersById] = useState<Record<string, import('@/lib/types').User>>({})
  const [workerProfilesById, setWorkerProfilesById] = useState<Record<string, WorkerProfile>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [ratingDone, setRatingDone] = useState(false)

  const loadData = useCallback(async () => {
    // Fetch job, its applications, and its escrow in parallel
    // FIX: Use findByJobId instead of fetching ALL escrow transactions
    const [jobData, allApps, escrowData] = await Promise.all([
      db.getJobById(jobId),
      applicationOps.findByJobId(jobId),
      escrowOps.findByJobId(jobId),
    ])

    setJob(jobData)
    setApplications(allApps)
    setEscrow(escrowData)

    // Load worker details + profiles for trust badges and match score computation
    if (allApps.length > 0) {
      const workerIds = [...new Set(allApps.map((a) => a.workerId))]
      const [workers, profiles] = await Promise.all([
        Promise.all(workerIds.map((id) => userOps.findById(id).catch(() => null))),
        Promise.all(workerIds.map((id) => workerProfileOps.findByUserId(id).catch(() => null))),
      ])
      const wMap: Record<string, import('@/lib/types').User> = {}
      const pMap: Record<string, WorkerProfile> = {}
      for (const w of workers) { if (w) wMap[w.id] = w }
      for (const p of profiles) { if (p) pMap[p.userId] = p }
      setWorkersById(wMap)
      setWorkerProfilesById(pMap)
    } else {
      setWorkersById({})
      setWorkerProfilesById({})
    }
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    async function load() {
      try {
        await loadData()
        if (cancelled) return
      } catch (err) { console.error(err) }
      finally { if (!cancelled) setLoading(false) }
    }

    load()
    return () => { cancelled = true }
  }, [jobId, loadData])

  const handleSubmitRating = async () => {
    // Find the accepted application to get workerId
    const acceptedApp = applications.find(a => a.status === 'accepted' || a.status === 'completed')
    if (!acceptedApp) {
      toast({ title: 'No worker found', description: 'No accepted application to rate', variant: 'destructive' })
      return
    }
    setActionLoading(true)
    try {
      await ratingOps.create({ jobId, toUserId: acceptedApp.workerId, rating: ratingValue, feedback: ratingFeedback })
      toast({ title: 'Rating Submitted!', description: `You rated this worker ${ratingValue}/5 ⭐` })
      setRatingDone(true)
      setRatingOpen(false)
    } catch { toast({ title: 'Error', description: 'Failed to submit rating', variant: 'destructive' }) }
    finally { setActionLoading(false) }
  }

  const handleReleasePayment = async () => {
    if (!escrow) return
    if (!confirm('Release payment to worker? This deducts the 10% platform commission.')) return
    setActionLoading(true)
    try {
      const acceptedApp = applications.find(a => a.status === 'accepted' || a.status === 'completed')
      await Promise.all([
        escrowOps.update(escrow.id, { status: 'released', releasedAt: new Date().toISOString() }),
        db.updateJob(jobId, { status: 'completed', paymentStatus: 'released' }),
        // Mark application as completed
        ...(acceptedApp ? [applicationOps.update(acceptedApp.id, { status: 'completed' })] : []),
      ])
      toast({ title: 'Payment Released', description: 'Net payout sent to worker.' })
      // Send notifications + WhatsApp
      if (acceptedApp) {
        const worker = await userOps.findById(acceptedApp.workerId).catch(() => null)
        const amount = job?.payAmount ?? job?.pay ?? 0
        if (worker) {
          sendWATIAlert('payment_released', worker.phoneNumber, { jobTitle: job?.title ?? '', amount: String(amount) })
        }
        // In-app notification
        try {
          await notificationOps.create({
            userId: acceptedApp.workerId,
            type: 'payment',
            title: 'Payment Received! 💰',
            message: `₹${Math.round(amount * 0.9).toLocaleString()} has been released to your account for "${job?.title}".`,
            isRead: false,
            link: `/worker/earnings`,
          })
        } catch (e) { console.error('Notification failed', e) }
      }
      loadData()
    } catch { toast({ title: 'Error', description: 'Failed to release payment', variant: 'destructive' }) }
    finally { setActionLoading(false) }
  }

  const handleRequestRefund = async () => {
    if (!escrow) return
    setActionLoading(true)
    try {
      await Promise.all([
        escrowOps.update(escrow.id, { status: 'refunded' }),
        db.updateJob(jobId, { status: 'cancelled', paymentStatus: 'refunded' }),
      ])
      toast({ title: 'Dispute Filed', description: 'Refund will be processed in 3–5 business days.' })
      setDisputeOpen(false)
      loadData()
    } catch { toast({ title: 'Error', description: 'Failed to file dispute', variant: 'destructive' }) }
    finally { setActionLoading(false) }
  }

  const handleAcceptApplication = async (appId: string) => {
    setActionLoading(true)
    try {
      const app = applications.find(a => a.id === appId)
      await applicationOps.update(appId, { status: 'accepted' })

      // Create escrow transaction for this worker
      if (job && app) {
        const amount = job.payAmount ?? job.pay ?? 0
        const commission = Math.round(amount * COMMISSION_RATE)
        try {
          await escrowOps.create({
            jobId: job.id,
            employerId: job.employerId,
            workerId: app.workerId,
            amount,
            commission,
            status: 'pending',
          })
        } catch (e) { console.error('Escrow creation failed', e) }

        // Send in-app notification to worker
        try {
          await notificationOps.create({
            userId: app.workerId,
            type: 'application',
            title: 'Application Accepted! 🎉',
            message: `Your application for "${job.title}" has been accepted. The employer will contact you soon.`,
            isRead: false,
            link: `/worker/applications`,
          })
        } catch (e) { console.error('Notification failed', e) }

        // Send WhatsApp alert
        const worker = await userOps.findById(app.workerId).catch(() => null)
        if (worker) {
          sendWATIAlert('application_accepted', worker.phoneNumber, { jobTitle: job.title })
        }
      }

      toast({ title: 'Application Accepted!', description: 'The worker has been notified.' })
      loadData()
    } catch { toast({ title: 'Error', description: 'Failed to update application', variant: 'destructive' }) }
    finally { setActionLoading(false) }
  }

  const handleRejectApplication = async (appId: string) => {
    setActionLoading(true)
    try {
      const app = applications.find(a => a.id === appId)
      await applicationOps.update(appId, { status: 'rejected' })

      // Send in-app notification to worker
      if (job && app) {
        try {
          await notificationOps.create({
            userId: app.workerId,
            type: 'application',
            title: 'Application Update',
            message: `Your application for "${job.title}" was not selected. Keep applying to other jobs!`,
            isRead: false,
            link: `/worker/jobs`,
          })
        } catch (e) { console.error('Notification failed', e) }
      }

      toast({ title: 'Application Rejected', description: 'The worker has been notified.' })
      loadData()
    } catch { toast({ title: 'Error', description: 'Failed to update application', variant: 'destructive' }) }
    finally { setActionLoading(false) }
  }

  const handleChatWithWorker = async (app: Application) => {
    if (!user || !job) return
    try {
      // Step 1: find existing conv for this specific application
      let conv = await db.findConversationByApplicationId(user.id, app.id).catch(() => null)
      // Step 2: search existing convs by worker + job
      if (!conv) {
        const allConvs = await db.getConversationsByUser(user.id).catch(() => [])
        conv = allConvs.find(c =>
          c.participants.includes(app.workerId) &&
          (c.jobId === job.id || c.applicationId === app.id)
        ) ?? null
      }
      // Step 3: create new conversation
      if (!conv) {
        conv = await db.createConversation({
          workerId: app.workerId,
          employerId: user.id,
          jobId: job.id,
          applicationId: app.id,
          participants: [app.workerId, user.id]
        })
      }
      // Navigate with convId in URL — most reliable way to pass state in Next.js App Router
      if (conv?.id) {
        router.push(`/employer/chat?convId=${encodeURIComponent(conv.id)}`)
        return
      }
    } catch {
      // fall through to workerId-based fallback navigation
    }
    // Fallback: navigate with worker+job context; chat page will find/create conv
    router.push(`/employer/chat?workerId=${encodeURIComponent(app.workerId)}&jobId=${encodeURIComponent(job.id)}&appId=${encodeURIComponent(app.id)}`)
  }

  if (loading) return (
    <div className="app-surface">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 pb-28 md:pb-8 max-w-4xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-72" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-36" />)}
                </div>
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                <Skeleton className="h-10 w-full rounded-md mt-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )

  if (!job) return (
    <div className="app-surface">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 pb-28 md:pb-8">
        <Card><CardContent className="py-10 text-center text-muted-foreground">Job not found</CardContent></Card>
      </main>
    </div>
  )

  const amount = job.payAmount ?? job.pay ?? 0
  const commission = Math.round(amount * COMMISSION_RATE)
  const netPayout = amount - commission

  return (
    <div className="app-surface">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 pb-28 md:pb-8 max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <button onClick={() => router.push('/employer/jobs')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Jobs
            </button>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {job.status === 'draft' && <Badge className="bg-amber-100 text-amber-800 border-amber-200">⏳ Pending Payment</Badge>}
              {job.status === 'active' && <Badge className="bg-green-600">✓ Live</Badge>}
              {job.status === 'completed' && <Badge variant="outline" className="border-green-500 text-green-700">Completed</Badge>}
              {job.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
              <span className="text-sm text-muted-foreground">{job.category}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {job.status === 'draft' && (
              <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2" onClick={() => router.push(`/employer/payment/${job.id}`)}>
                <Lock className="w-4 h-4" /> Complete Payment
              </Button>
            )}
            {job.status === 'active' && (
              <Button variant="outline" onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}>
                <Edit className="w-4 h-4 mr-1" /> Edit Job
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /> {job.location || 'Not specified'}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /> {job.duration ?? job.timing}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><IndianRupee className="w-4 h-4" /> ₹{amount.toLocaleString()} / {job.payType === 'fixed' ? 'fixed' : 'hr'}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" /> {applications.length} applicants</div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                </div>
                {job.requiredSkills?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">{job.requiredSkills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                  </div>
                )}
                {job.requirements && <div><p className="text-sm font-medium mb-1">Requirements</p><p className="text-sm text-muted-foreground">{job.requirements}</p></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Applications ({applications.length})</CardTitle>
                    <CardDescription>Workers who applied</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={loadData} disabled={actionLoading}>
                    <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{job.status === 'draft' ? 'Complete payment to make job visible to workers.' : 'No applications yet.'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => {
                      const worker = workersById[app.workerId]
                      const trustColor = worker?.trustLevel === 'trusted' ? 'text-green-600' : worker?.trustLevel === 'active' ? 'text-blue-600' : 'text-amber-600'
                      const trustLabel = worker?.trustLevel === 'trusted' ? '✅ Trusted' : worker?.trustLevel === 'active' ? '👍 Active' : '🌱 New'

                      // Compute skill-overlap match score — prefer DB value, then worker profile skills, then user skills
                      let displayMatch = app.matchScore
                      if (!displayMatch && job.requiredSkills?.length) {
                        // Use worker_profiles.skills (the authoritative skills source)
                        const profileSkills = workerProfilesById[app.workerId]?.skills
                        const skillSource = (profileSkills?.length ? profileSkills : worker?.skills) ?? []
                        if (skillSource.length > 0) {
                          const workerSkillsLower = skillSource.map((s: string) => s.toLowerCase())
                          const matchingSkills = job.requiredSkills.filter(s => workerSkillsLower.includes(s.toLowerCase()))
                          displayMatch = Math.round((matchingSkills.length / job.requiredSkills.length) * 100)
                        }
                      }

                      return (
                        <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {worker?.fullName?.charAt(0) || 'W'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{worker?.fullName || 'Worker'}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-muted-foreground">Match: <span className="text-primary font-semibold">{displayMatch > 0 ? `${displayMatch}%` : 'N/A'}</span></p>
                                <Badge variant="outline" className="text-xs">{app.status}</Badge>
                                {worker && <span className={`text-xs font-medium ${trustColor}`}>{trustLabel} · ⭐ {worker.trustScore.toFixed(1)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {app.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 border-green-300" onClick={() => handleAcceptApplication(app.id)} disabled={actionLoading}>✓ Accept</Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => handleRejectApplication(app.id)} disabled={actionLoading}>✗ Reject</Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleChatWithWorker(app)}>
                              <MessageSquare className="w-4 h-4 mr-1" /> Chat
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Escrow Panel */}
          <div className="space-y-4">
            <Card className={`border-2 ${(escrow?.status === 'held' || job.paymentStatus === 'locked') ? 'border-green-300 bg-green-50/50' : 'border-border'}`}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="w-5 h-5 text-primary" /> Escrow Status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border bg-background p-3 text-sm font-medium">
                  {(escrow?.status === 'held' || job.paymentStatus === 'locked') && <span className="flex items-center gap-2 text-green-700"><Lock className="w-4 h-4 shrink-0" /> Secured in Escrow</span>}
                  {(escrow?.status ?? job.paymentStatus) === 'released' && <span className="flex items-center gap-2 text-blue-700"><Unlock className="w-4 h-4 shrink-0" /> Released to Worker</span>}
                  {(escrow?.status ?? job.paymentStatus) === 'refunded' && <span className="flex items-center gap-2 text-orange-700"><RefreshCcw className="w-4 h-4 shrink-0" /> Refunded</span>}
                  {(escrow?.status ?? job.paymentStatus) === 'pending' && <span className="flex items-center gap-2 text-amber-600"><AlertCircle className="w-4 h-4 shrink-0" /> Pending Payment</span>}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Job Amount</span><span className="font-medium text-foreground">₹{amount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Platform Fee (10%)</span><span>₹{commission.toLocaleString()}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Worker Receives</span><span className="text-green-700">₹{netPayout.toLocaleString()}</span></div>
                </div>

                {job.status === 'draft' && (
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => router.push(`/employer/payment/${job.id}`)}>
                    <Lock className="w-4 h-4 mr-2" /> Pay & Make Live
                  </Button>
                )}

                {(escrow?.status === 'held' || job.paymentStatus === 'locked') && job.status === 'active' && (
                  <div className="space-y-2">
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleReleasePayment} disabled={actionLoading}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Job Done — Release Payment
                    </Button>
                    <Button variant="ghost" className="w-full text-sm text-destructive hover:bg-destructive/10" onClick={() => setDisputeOpen(true)}>
                      <AlertCircle className="w-4 h-4 mr-1" /> Raise a Dispute
                    </Button>
                  </div>
                )}

                {(escrow?.status === 'released' || job.paymentStatus === 'released') && (
                  <div className="bg-green-100 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Payment released successfully
                  </div>
                )}
                {(escrow?.status === 'refunded' || job.paymentStatus === 'refunded') && (
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 shrink-0" /> Refund in process (3–5 days)
                  </div>
                )}
              </CardContent>
            </Card>

            {job.status === 'completed' && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Star className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-sm font-semibold">Rate the Worker</p>
                    <p className="text-xs text-muted-foreground">{ratingDone ? 'Rating submitted ✓' : 'Your review builds trust in the community'}</p>
                  </div>
                  {!ratingDone && <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRatingOpen(true)}>Rate Now</Button>}
                  {ratingDone && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Rate the Worker</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRatingValue(n)} className={`text-3xl transition-transform hover:scale-110 ${n <= ratingValue ? 'text-yellow-400' : 'text-muted'}`}>★</button>
              ))}
            </div>
            <p className="text-center text-sm font-medium">{['','Poor','Below Average','Average','Good','Excellent'][ratingValue]}</p>
            <Textarea rows={3} placeholder="Optional feedback (visible to the worker)..." value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRating} disabled={actionLoading}>Submit Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-destructive" /> Raise a Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Describe the issue. Our team will review and process your refund within 3–5 business days.</p>
            <div className="space-y-2">
              <Label>Reason for Dispute</Label>
              <Textarea placeholder="e.g., Worker did not show up, Job quality was unsatisfactory…" rows={4} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRequestRefund} disabled={!disputeReason.trim() || actionLoading}>Submit & Request Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
