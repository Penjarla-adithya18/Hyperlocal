'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb } from '@/lib/api'
import { Job } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Users, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function EmployerJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadJobs()
    }
  }, [user])

  const loadJobs = async () => {
    if (!user) return
    try {
      const employerJobs = await mockDb.getJobsByEmployer(user.id)
      setJobs(employerJobs)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        await mockDb.deleteJob(jobId)
        toast({
          title: 'Success',
          description: 'Job deleted successfully'
        })
        loadJobs()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete job',
          variant: 'destructive'
        })
      }
    }
  }

  const activeJobs = jobs.filter(j => j.status === 'active')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled')

  const JobCard = ({ job }: { job: Job }) => {
    const applicationsCount = job.applicationCount ?? 0

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mb-3">
                {job.requiredSkills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
                {job.requiredSkills.length > 3 && (
                  <Badge variant="secondary">+{job.requiredSkills.length - 3} more</Badge>
                )}
              </div>
            </div>
            <Badge variant={
              job.status === 'active' ? 'default' : 
              job.status === 'completed' ? 'outline' : 
              'destructive'
            }>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span>â‚¹{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{applicationsCount} applications</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/employer/jobs/${job.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {job.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteJob(job.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployerNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Jobs</h1>
            <p className="text-muted-foreground">Manage your job postings and applications</p>
          </div>
          <Button onClick={() => router.push('/employer/jobs/post')}>
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Active Jobs</h3>
                  <p className="text-muted-foreground mb-4">Post your first job to get started</p>
                  <Button onClick={() => router.push('/employer/jobs/post')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {activeJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No completed jobs yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {completedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled">
            {cancelledJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No cancelled jobs</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {cancelledJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
