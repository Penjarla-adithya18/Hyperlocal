'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { applicationOps, jobOps } from '@/lib/api'
import { Application, Job } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WorkerApplicationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [jobsById, setJobsById] = useState<Record<string, Job>>({})
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      console.error('Failed to load applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const pendingApps = applications.filter(a => a.status === 'pending')
  const acceptedApps = applications.filter(a => a.status === 'accepted')
  const rejectedApps = applications.filter(a => a.status === 'rejected')

  const ApplicationCard = ({ application }: { application: Application }) => {
    const job = jobsById[application.jobId]
    if (!job) return null

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

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/worker/jobs/${job.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Job Details
          </Button>
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
    </div>
  )
}
