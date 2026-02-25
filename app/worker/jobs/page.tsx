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
import { matchJobs, JOB_CATEGORIES } from '@/lib/aiMatching'
import { Application, Job, User } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Sparkles, Search, Filter, TrendingUp, Navigation, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 12
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [reportedJobIds, setReportedJobIds] = useState<Set<string>>(new Set())

  // Try to get worker's current GPS location for distance display
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setWorkerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silently fail
    )
    // Load reported job IDs from localStorage
    if (user) {
      const stored = localStorage.getItem(`reported_jobs_${user.id}`)
      if (stored) setReportedJobIds(new Set(JSON.parse(stored)))
    }
  }, [user])

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  useEffect(() => {
    if (user) {
      loadJobs()
    }
  }, [user])

  const loadJobs = async () => {
    try {
      const allJobs = await mockDb.getAllJobs()
      // Only show jobs where escrow/payment is locked — hide draft/unpaid listings
      const activeJobs = allJobs.filter(j => j.status === 'active' && j.paymentStatus !== 'pending')
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
    // Hide jobs the user has reported
    if (reportedJobIds.has(job.id)) return false

    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.requiredSkills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = categoryFilter === 'all' || job.category.toLowerCase() === categoryFilter.toLowerCase()
    const matchesLocation = !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase())

    return matchesSearch && matchesCategory && matchesLocation
  })

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, categoryFilter, locationFilter])
  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE)
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const JobCard = ({ job, matchScore }: { job: Job; matchScore?: number }) => {
    const employer = employersById[job.employerId]
    const hasApplied = applications.some(app => app.jobId === job.id)
    const distKm = workerCoords && job.latitude && job.longitude
      ? haversineKm(workerCoords.lat, workerCoords.lng, job.latitude, job.longitude)
      : null

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
              {distKm !== null && (
                <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                  <Navigation className="h-3 w-3" />
                  {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)} km`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">&#8377;{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</span>
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
                {JOB_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
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
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedJobs.map((job) => {
                    const match = matchedJobs.find(m => m.job.id === job.id)
                    return <JobCard key={job.id} job={job} matchScore={match?.score} />
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} &middot; {filteredJobs.length} jobs
                    </span>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
