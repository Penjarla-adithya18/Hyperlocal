'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb, mockUserOps } from '@/lib/api'
import { matchJobs } from '@/lib/aiMatching'
import { Application, Job, User } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Sparkles, Search, Filter, TrendingUp } from 'lucide-react'
import { VoiceInput } from '@/components/ui/voice-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WorkerJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [matchedJobs, setMatchedJobs] = useState<Array<{ job: Job; score: number }>>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [employersById, setEmployersById] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    if (user) {
      loadJobs()
    }
  }, [user])

  const loadJobs = async () => {
    try {
      const allJobs = await mockDb.getAllJobs()
      const activeJobs = allJobs.filter(j => j.status === 'active')
      setJobs(activeJobs)
      const employerIds = [...new Set(activeJobs.map((job) => job.employerId))]
      if (employerIds.length > 0) {
        const employers = await Promise.all(employerIds.map((id) => mockUserOps.findById(id)))
        const employerMap: Record<string, User> = {}
        for (const employer of employers) {
          if (employer) employerMap[employer.id] = employer
        }
        setEmployersById(employerMap)
      }

      const myApplications = user ? await mockDb.getApplicationsByWorker(user.id) : []
      setApplications(myApplications)

      if (user) {
        const matches = await matchJobs(user as User, activeJobs)
        setMatchedJobs(matches)
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.requiredSkills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter
    const matchesLocation = !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase())

    return matchesSearch && matchesCategory && matchesLocation
  })

  const JobCard = ({ job, matchScore }: { job: Job; matchScore?: number }) => {
    const employer = employersById[job.employerId]
    const hasApplied = applications.some(app => app.jobId === job.id)

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {employer?.companyName || 'Company'}
              </p>
            </div>
            {matchScore && matchScore >= 70 && (
              <Badge className="gap-1">
                <Sparkles className="h-3 w-3" />
                {matchScore}% Match
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary">{skill}</Badge>
            ))}
            {job.requiredSkills.length > 3 && (
              <Badge variant="secondary">+{job.requiredSkills.length - 3}</Badge>
            )}
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
              <span className="font-semibold">â‚¹{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</span>
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

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => router.push(`/worker/jobs/${job.id}`)}
            >
              {hasApplied ? 'View Application' : 'View Details'}
            </Button>
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
          <p className="text-center text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Jobs</h1>
          <p className="text-muted-foreground">Browse and apply to jobs that match your skills</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs by title, skills, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <VoiceInput
                  onResult={(transcript) => setSearchQuery(transcript)}
                  lang="en-IN"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="home-services">Home Services</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="construction">Construction</SelectItem>
                  <SelectItem value="office-work">Office Work</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="md:w-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="recommended" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Recommended ({matchedJobs.filter(m => m.score >= 60).length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Jobs ({filteredJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended">
            {matchedJobs.filter(m => m.score >= 60).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your profile with skills and experience to get personalized job recommendations
                  </p>
                  <Button onClick={() => router.push('/worker/profile')}>
                    Complete Profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matchedJobs
                  .filter(m => m.score >= 60)
                  .map(({ job, score }) => (
                    <JobCard key={job.id} job={job} matchScore={score} />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => {
                  const match = matchedJobs.find(m => m.job.id === job.id)
                  return <JobCard key={job.id} job={job} matchScore={match?.score} />
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
