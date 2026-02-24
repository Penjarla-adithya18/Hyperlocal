'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb, mockRatingOps, mockUserOps } from '@/lib/api'
import { Application, Job, User } from '@/lib/types'
import {
  Briefcase, MapPin, Clock, IndianRupee, Eye, Star, CheckCircle2,
  AlertCircle, Building2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function WorkerApplicationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [jobsById, setJobsById] = useState<Record<string, Job>>({})
  const [employersById, setEmployersById] = useState<Record<string, User>>({})
  const [ratedJobIds, setRatedJobIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Rating dialog state
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<{ app: Application; employer: User } | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  const loadApplications = async () => {
    if (!user) return
    try {
      const workerApplications = await mockDb.getApplicationsByWorker(user.id)
      setApplications(workerApplications)

      const allJobs = await mockDb.getAllJobs()
      const byId = allJobs.reduce((acc, job) => {
        acc[job.id] = job
        return acc
      }, {} as Record<string, Job>)
      setJobsById(byId)

      // Load employers for all jobs
      const empIds = [...new Set(allJobs.map(j => j.employerId))]
      const emps = await Promise.all(empIds.map(id => mockUserOps.findById(id)))
      const empMap: Record<string, User> = {}
      for (const e of emps) {
        if (e) empMap[e.id] = e
      }
      setEmployersById(empMap)
    } catch (error) {
      console.error('Failed to load applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const openRatingDialog = (app: Application) => {
    const job = jobsById[app.jobId]
    if (!job) return
    const employer = employersById[job.employerId]
    if (!employer) return
    setRatingTarget({ app, employer })
    setRatingValue(5)
    setRatingFeedback('')
    setRatingOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!user || !ratingTarget) return
    const { app, employer } = ratingTarget
    setSubmittingRating(true)
    try {
      await mockRatingOps.create({
        jobId: app.jobId,
        applicationId: app.id,
        toUserId: employer.id,
        rating: ratingValue,
        feedback: ratingFeedback,
      })
      setRatedJobIds(prev => new Set([...prev, app.jobId]))
      toast({ title: 'Rating Submitted!', description: `You rated ${employer.companyName || employer.fullName} ${ratingValue}/5 ⭐` })
      setRatingOpen(false)
    } catch {
      toast({ title: 'Failed to submit rating', variant: 'destructive' })
    } finally {
      setSubmittingRating(false)
    }
  }

  const pendingApps = applications.filter(a => a.status === 'pending')
  const acceptedApps = applications.filter(a => a.status === 'accepted')
  const completedApps = applications.filter(a => a.status === 'completed')
  const rejectedApps = applications.filter(a => a.status === 'rejected')

  const ApplicationCard = ({ application }: { application: Application }) => {
    const job = jobsById[application.jobId]
    if (!job) return null
    const employer = employersById[job.employerId]
    const canRate = (application.status === 'accepted' || application.status === 'completed') && !ratedJobIds.has(job.id)
    const isRated = ratedJobIds.has(job.id)

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl mb-1">{job.title}</CardTitle>
              {employer && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{employer.companyName || employer.fullName}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Applied {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={
              application.status === 'accepted' ? 'default' :
              application.status === 'completed' ? 'default' :
              application.status === 'rejected' ? 'destructive' :
              'secondary'
            }>
              {application.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">₹{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{job.experienceRequired}</span>
            </div>
          </div>

          {application.coverLetter && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Your Cover Letter:</p>
              <p className="text-sm line-clamp-2">{application.coverLetter}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push(`/worker/jobs/${job.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Job
            </Button>
            {canRate && (
              <Button variant="secondary" onClick={() => openRatingDialog(application)}>
                <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                Rate Employer
              </Button>
            )}
            {isRated && (
              <div className="flex items-center gap-1 text-sm text-green-600 px-3">
                <CheckCircle2 className="h-4 w-4" />
                Rated
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground">Track your applications and rate employers after accepting a job</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedApps.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedApps.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground mb-4">Browse jobs and apply to opportunities</p>
                  <Button onClick={() => router.push('/worker/jobs')}>Browse Jobs</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingApps.map(app => <ApplicationCard key={app.id} application={app} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No accepted applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                  <Star className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">You can rate employers to help other workers in the community</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {acceptedApps.map(app => <ApplicationCard key={app.id} application={app} />)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed jobs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedApps.map(app => <ApplicationCard key={app.id} application={app} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No rejected applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedApps.map(app => <ApplicationCard key={app.id} application={app} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Rate Employer Dialog */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Employer</DialogTitle>
            <DialogDescription>
              How was your experience with {ratingTarget?.employer.companyName || ratingTarget?.employer.fullName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Your Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRatingValue(star)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 transition-colors ${star <= ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {ratingValue === 5 ? '⭐ Excellent' : ratingValue === 4 ? '👍 Good' : ratingValue === 3 ? '😐 Average' : ratingValue === 2 ? '😕 Poor' : '😞 Very Poor'}
              </p>
            </div>
            <div>
              <Label htmlFor="emp-feedback" className="text-sm font-medium mb-1 block">
                Feedback <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="emp-feedback"
                placeholder="Tell future workers about this employer — payment punctuality, communication, work conditions..."
                rows={3}
                value={ratingFeedback}
                onChange={e => setRatingFeedback(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRating} disabled={submittingRating}>
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
