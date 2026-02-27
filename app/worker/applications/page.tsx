'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { applicationOps, jobOps, ratingOps } from '@/lib/api'
import { Application, Job } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Eye, Star } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface RatingTarget {
  jobId: string
  applicationId: string
  employerId: string
  jobTitle: string
}

export default function WorkerApplicationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [jobsById, setJobsById] = useState<Record<string, Job>>({})
  const [loading, setLoading] = useState(true)

  // Rating dialog state
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratedJobIds, setRatedJobIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  const loadApplications = async () => {
    if (!user) return
    try {
      const workerApplications = await applicationOps.findByWorkerId(user.id)
      setApplications(workerApplications)

      const allJobs = await jobOps.getAll()
      const byId = allJobs.reduce((acc, job) => {
        acc[job.id] = job
        return acc
      }, {} as Record<string, Job>)
      setJobsById(byId)

      // Check which jobs the worker has already rated the employer for
      const completedJobIds = workerApplications
        .filter(a => a.status === 'accepted' && byId[a.jobId]?.status === 'completed')
        .map(a => a.jobId)
      if (completedJobIds.length > 0) {
        const sentRatings = await ratingOps.getSentByUser(user.id).catch(() => [])
        const sentJobIds = new Set(sentRatings.map(r => r.jobId))
        setRatedJobIds(sentJobIds)
      }
    } catch (error) {
      console.error('Failed to load applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const openRatingDialog = (target: RatingTarget) => {
    setRatingTarget(target)
    setRatingValue(0)
    setHoverRating(0)
    setRatingFeedback('')
    setRatingOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!ratingTarget || ratingValue === 0) return
    setSubmittingRating(true)
    try {
      await ratingOps.create({
        jobId: ratingTarget.jobId,
        applicationId: ratingTarget.applicationId,
        toUserId: ratingTarget.employerId,
        rating: ratingValue,
        feedback: ratingFeedback.trim() || undefined,
      })
      setRatedJobIds(prev => new Set([...prev, ratingTarget.jobId]))
      setRatingOpen(false)
      toast({ title: 'Rating submitted', description: 'Thank you for your feedback!' })
    } catch (err) {
      toast({
        title: 'Failed to submit rating',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingRating(false)
    }
  }

  const pendingApps = applications.filter(a => a.status === 'pending')
  const acceptedApps = applications.filter(a => a.status === 'accepted')
  const rejectedApps = applications.filter(a => a.status === 'rejected')

  const ApplicationCard = ({ application }: { application: Application }) => {
    const job = jobsById[application.jobId]
    if (!job) return null

    const isCompleted = job.status === 'completed' || job.paymentStatus === 'released'
    const alreadyRated = ratedJobIds.has(job.id)

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Applied {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={
              application.status === 'accepted' ? 'default' :
              application.status === 'rejected' ? 'destructive' :
              'secondary'
            }>
              {application.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
              <p className="text-sm text-muted-foreground mb-1">Your Cover Letter:</p>
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
              View Job Details
            </Button>

            {isCompleted && (
              alreadyRated ? (
                <Button variant="ghost" size="sm" disabled className="gap-1 text-yellow-500">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  Rated
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-yellow-400 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                  onClick={() => openRatingDialog({
                    jobId: job.id,
                    applicationId: application.id,
                    employerId: job.employerId,
                    jobTitle: job.title,
                  })}
                >
                  <Star className="h-4 w-4" />
                  Rate Employer
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="app-surface">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8 pb-28 md:pb-8">
          <p className="text-center text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-surface">
      <WorkerNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track your job applications and their status</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6 w-full flex-wrap">
            <TabsTrigger value="pending" className="flex-1 min-w-[90px]">
              <span className="hidden sm:inline">Pending</span><span className="sm:hidden">Pend.</span> ({pendingApps.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex-1 min-w-[90px]">
              <span className="hidden sm:inline">Accepted</span><span className="sm:hidden">Accept.</span> ({acceptedApps.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 min-w-[90px]">
              <span className="hidden sm:inline">Rejected</span><span className="sm:hidden">Reject.</span> ({rejectedApps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground mb-4">Browse jobs and apply to opportunities</p>
                  <Button onClick={() => router.push('/worker/jobs')}>
                    Browse Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {pendingApps.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedApps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No accepted applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {acceptedApps.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {rejectedApps.map((app) => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Rate Employer Dialog ── */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Rate Employer
            </DialogTitle>
            {ratingTarget && (
              <p className="text-sm text-muted-foreground mt-1">
                How was your experience with the employer for <strong>{ratingTarget.jobTitle}</strong>?
              </p>
            )}
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Star selector */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-9 w-9 ${
                      star <= (hoverRating || ratingValue)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground h-4">
              {(hoverRating || ratingValue) > 0 && (
                ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || ratingValue]
              )}
            </p>

            {/* Feedback */}
            <Textarea
              placeholder="Share your experience (optional)"
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{ratingFeedback.length}/500</p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRatingOpen(false)} disabled={submittingRating}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={ratingValue === 0 || submittingRating}
              className="gap-1"
            >
              <Star className="h-4 w-4" />
              {submittingRating ? 'Submitting…' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
