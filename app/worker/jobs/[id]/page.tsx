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
import { mockDb } from '@/lib/mockDb'
import { Job, User, Application } from '@/lib/types'
import { 
  Briefcase, MapPin, Clock, IndianRupee, Calendar, 
  Building2, Star, Shield, ChevronLeft, Send, CheckCircle2 
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [job, setJob] = useState<Job | null>(null)
  const [employer, setEmployer] = useState<User | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')

  useEffect(() => {
    loadJobDetails()
  }, [params.id, user])

  const loadJobDetails = async () => {
    try {
      const jobData = await mockDb.getJobById(params.id as string)
      if (jobData) {
        setJob(jobData)
        const employerData = mockDb.getUserById(jobData.employerId)
        setEmployer(employerData)

        if (user) {
          const existingApplication = mockDb.getApplicationsByWorker(user.id)
            .find(app => app.jobId === jobData.id)
          setApplication(existingApplication || null)
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

    setApplying(true)
    try {
      const newApplication = await mockDb.createApplication({
        jobId: job.id,
        workerId: user.id,
        coverLetter,
        status: 'pending'
      })

      setApplication(newApplication)
      setShowApplicationForm(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
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
                    <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
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
                <p className="text-muted-foreground whitespace-pre-line">{job.description}</p>
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
                  <div className="space-y-2">
                    <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
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
                      disabled={applying}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {applying ? 'Submitting...' : 'Submit Application'}
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
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowApplicationForm(true)}
                    disabled={job.status !== 'active'}
                  >
                    Apply Now
                  </Button>
                  {job.status !== 'active' && (
                    <p className="text-sm text-center text-muted-foreground mt-2">
                      This job is no longer active
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
