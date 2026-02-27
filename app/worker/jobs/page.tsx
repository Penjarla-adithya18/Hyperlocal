'use client'

import { useState, useEffect } from 'react'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb, mockWorkerProfileOps } from '@/lib/api'
import { matchJobs } from '@/lib/aiMatching'
import { Application, Job, User, WorkerProfile } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Sparkles, Search, Filter, TrendingUp, Brain, Target, Route, Lightbulb } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeolocationPrompt } from '@/components/ui/geolocation-prompt'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'

export default function WorkerJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [matchedJobs, setMatchedJobs] = useState<Array<{ job: Job; score: number }>>([])
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [payRange, setPayRange] = useState([0, 5000])
  const [experienceFilter, setExperienceFilter] = useState('all')
  const [jobModeFilter, setJobModeFilter] = useState('all')
  const [showGeolocationPrompt, setShowGeolocationPrompt] = useState(true)

  useEffect(() => {
    if (user) {
      loadJobs()
    }
  }, [user])

  const handleLocationGranted = (coords: { lat: number; lng: number }) => {
    setWorkerCoords(coords)
    setShowGeolocationPrompt(false)
  }

  const loadJobs = async () => {
    try {
      const [allJobs, profile, myApplications] = await Promise.all([
        mockDb.getAllJobs(),
        user ? mockWorkerProfileOps.findByUserId(user.id) : Promise.resolve(null),
        user ? mockDb.getApplicationsByWorker(user.id) : Promise.resolve([]),
      ])

      const activeJobs = allJobs.filter((j) => j.status === 'active')
      setJobs(activeJobs)
      setWorkerProfile(profile)
      setApplications(myApplications)

      if (user) {
        const matches = await matchJobs(
          user as User,
          activeJobs,
          mockWorkerProfileOps.findByUserId
        )
        setMatchedJobs(matches)
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const isProfileReady = useMemo(() => {
    if (!workerProfile) return false
    return Boolean(
      workerProfile.skills.length > 0 &&
      workerProfile.categories.length > 0 &&
      workerProfile.availability &&
      workerProfile.experience &&
      workerProfile.location
    )
  }, [workerProfile])

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      job.title.toLowerCase().includes(q) ||
      job.description.toLowerCase().includes(q) ||
      job.requiredSkills.some(skill => skill.toLowerCase().includes(q))
    
    const matchesCategory = categoryFilter === 'all' || job.category === categoryFilter
    const matchesLocation = !locationFilter || job.location.toLowerCase().includes(locationFilter.toLowerCase())
    
    const jobPay = job.payAmount || job.pay || 0
    const matchesPay = jobPay >= payRange[0] && jobPay <= payRange[1]
    
    const matchesExperience = experienceFilter === 'all' || job.experienceRequired === experienceFilter
    const matchesJobMode = jobModeFilter === 'all' || job.jobMode === jobModeFilter

    return matchesSearch && matchesCategory && matchesLocation && matchesPay && matchesExperience && matchesJobMode
  }), [jobs, searchQuery, categoryFilter, locationFilter, payRange, experienceFilter, jobModeFilter])

  const filteredMatchedJobs = useMemo(() => {
    const allowedJobIds = new Set(filteredJobs.map((job) => job.id))
    return matchedJobs
      .filter((match) => allowedJobIds.has(match.job.id))
      .sort((a, b) => b.score - a.score)
  }, [matchedJobs, filteredJobs])

  const topFiveMatches = useMemo(() => filteredMatchedJobs.slice(0, 5), [filteredMatchedJobs])

  const uniqueCategories = useMemo(() => {
    const categories = Array.from(new Set(jobs.map((job) => job.category).filter(Boolean)))
    return categories.sort((a, b) => a.localeCompare(b))
  }, [jobs])

  const missingSkills = useMemo(() => {
    if (!workerProfile) return [] as Array<{ skill: string; count: number }>
    const workerSkills = new Set(workerProfile.skills.map((skill) => skill.trim().toLowerCase()))
    const counts = new Map<string, number>()

    for (const { job } of topFiveMatches) {
      for (const skill of job.requiredSkills) {
        const normalized = skill.trim().toLowerCase()
        if (!normalized || workerSkills.has(normalized)) continue
        counts.set(skill, (counts.get(skill) || 0) + 1)
      }
    }

    return Array.from(counts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [workerProfile, topFiveMatches])

  const aiInsights = useMemo(() => {
    const insights: Array<{ title: string; desc: string; color: string }> = []

    if (!isProfileReady) {
      insights.push({
        title: 'Complete Your Profile',
        desc: 'Add categories, skills, location and availability to unlock full AI matching.',
        color: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
      })
    }

    insights.push({
      title: topFiveMatches.length >= 5 ? 'Keep It Up!' : 'Stay Active',
      desc: topFiveMatches.length >= 5
        ? 'You have strong matches today. Apply early to improve acceptance chances.'
        : 'New jobs are posted frequently. Check this page daily for better opportunities.',
      color: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100',
    })

    insights.push({
      title: missingSkills.length > 0 ? 'Skill Booster' : 'Profile Momentum',
      desc: missingSkills.length > 0
        ? `Learning ${missingSkills.slice(0, 2).map((s) => s.skill).join(' & ')} can improve your match score quickly.`
        : 'Your current skills align well with job demand. Keep your profile updated.',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100',
    })

    return insights.slice(0, 3)
  }, [isProfileReady, topFiveMatches.length, missingSkills])

  const getDistanceText = (job: Job) => {
    if (!workerCoords || job.latitude === undefined || job.longitude === undefined) {
      return 'Distance unavailable'
    }

    const toRad = (value: number) => (value * Math.PI) / 180
    const earthKm = 6371
    const dLat = toRad(job.latitude - workerCoords.lat)
    const dLng = toRad(job.longitude - workerCoords.lng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(workerCoords.lat)) * Math.cos(toRad(job.latitude)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const km = earthKm * c
    return `${km.toFixed(1)} km away`
  }

  const getMatchBadgeClass = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200'
    if (score >= 40) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
  }

  const JobCard = ({ job, matchScore }: { job: Job; matchScore?: number }) => {
    const employer = mockDb.getUserById(job.employerId)
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
            {typeof matchScore === 'number' && (
              <Badge className={`gap-1 ${getMatchBadgeClass(matchScore)}`}>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{job.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span>{getDistanceText(job)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold truncate">₹{job.payAmount}/{job.payType === 'hourly' ? 'hr' : 'fixed'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm col-span-1 sm:col-span-2">
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
      <div className="app-surface">
        <WorkerNav />
        <div className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Search/filter skeleton */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
          {/* Job cards skeleton */}
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-5 w-20 rounded-full" />)}
                  </div>
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-surface">
      <WorkerNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Find Jobs</h1>
          <p className="text-sm md:text-base text-muted-foreground">Browse and apply to jobs that match your skills</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Active Jobs</div>
              <div className="text-2xl font-bold mt-1">{jobs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Top AI Matches</div>
              <div className="text-2xl font-bold mt-1">{topFiveMatches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Applications Sent</div>
              <div className="text-2xl font-bold mt-1">{applications.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Insights
          </h2>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            {aiInsights.map((insight) => (
              <Card key={insight.title} className={insight.color}>
                <CardContent className="pt-6">
                  <p className="font-semibold mb-1">{insight.title}</p>
                  <p className="text-sm opacity-90">{insight.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        {showGeolocationPrompt && !workerCoords && (
          <GeolocationPrompt
            onLocationGranted={handleLocationGranted}
            onDismiss={() => setShowGeolocationPrompt(false)}
          />
        )}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              AI Skill Gap Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No immediate skill gaps detected from your top matches. Keep your profile updated for better accuracy.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {missingSkills.map(({ skill, count }) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    <Target className="h-3 w-3" />
                    {skill} <span className="text-xs opacity-80">({count} jobs)</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title, skills, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Experience Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Experience</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jobModeFilter} onValueChange={setJobModeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Work Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="local">On-site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">₹{payRange[0]} - ₹{payRange[1]}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pay Range (₹)</label>
                <Slider
                  min={0}
                  max={5000}
                  step={100}
                  value={payRange}
                  onValueChange={setPayRange}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="mb-6 w-full flex-wrap">
            <TabsTrigger value="recommended" className="gap-2 flex-1 min-w-[140px]">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Recommended</span><span className="sm:hidden">AI Match</span> ({topFiveMatches.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 min-w-[100px]">
              All Jobs ({filteredJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended">
            {topFiveMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Strong Matches Yet</h3>
                  {isProfileReady ? (
                    <p className="text-muted-foreground mb-4">
                      Your profile is complete. We will show top matches as more relevant jobs are posted.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">
                        Complete your profile with skills and experience to get personalized job recommendations
                      </p>
                      <Button onClick={() => router.push('/worker/profile')}>
                        Complete Profile
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topFiveMatches.map(({ job, score }) => (
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
