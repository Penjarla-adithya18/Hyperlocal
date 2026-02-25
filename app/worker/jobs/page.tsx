'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { mockJobOps, mockUserOps, mockApplicationOps, mockWorkerProfileOps } from '@/lib/api'
import { matchJobs, JOB_CATEGORIES } from '@/lib/aiMatching'
import { processUserInput, isLikelyEnglish, SupportedLocale } from '@/lib/gemini'
import { Application, Job, User } from '@/lib/types'
import { Briefcase, MapPin, Clock, IndianRupee, Sparkles, Search, Filter, TrendingUp, Navigation, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { VoiceInput } from '@/components/ui/voice-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Utility: Haversine distance (moved outside component to avoid re-creation) ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = Math.PI / 180
  const dLat = (lat2 - lat1) * toRad
  const dLng = (lng2 - lng1) * toRad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Format distance for display */
function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`
}

// ── Minimum score to appear in "Recommended" tab ──
const RECOMMENDED_THRESHOLD = 40
const PAGE_SIZE = 12

// ── Memoized JobCard (prevents re-renders when parent state changes) ──
const JobCard = memo(function JobCard({
  job,
  matchScore,
  employer,
  hasApplied,
  distKm,
  onView,
}: {
  job: Job
  matchScore?: number
  employer?: User
  hasApplied: boolean
  distKm: number | null
  onView: (id: string) => void
}) {
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
          {matchScore != null && matchScore >= RECOMMENDED_THRESHOLD && (
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
                {formatDistance(distKm)}
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
          <Button className="flex-1" onClick={() => onView(job.id)}>
            {hasApplied ? 'View Application' : 'View Details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

export default function WorkerJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { locale } = useI18n()

  // ── Data state ──
  const [jobs, setJobs] = useState<Job[]>([])
  const [matchedJobs, setMatchedJobs] = useState<Array<{ job: Job; score: number }>>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [employersById, setEmployersById] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // ── AI-powered smart search ──
  const [isProcessingSearch, setIsProcessingSearch] = useState(false)
  const [aiSearchHint, setAiSearchHint] = useState<string | null>(null)

  // ── GPS & reported jobs ──
  const [workerCoords, setWorkerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [reportedJobIds, setReportedJobIds] = useState<Set<string>>(new Set())

  // Fetch GPS (fire once)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setWorkerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently fail — GPS is optional
    )
  }, [])

  // Load reported job IDs from localStorage
  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(`reported_jobs_${user.id}`)
    if (stored) {
      try { setReportedJobIds(new Set(JSON.parse(stored))) } catch { /* ignore corrupt data */ }
    }
  }, [user])

  // ── Load jobs & match scores ──
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        // Fetch active jobs (server-filtered) and worker's applications in parallel
        const [activeJobs, myApps] = await Promise.all([
          mockJobOps.getAll({ status: 'active' }),
          mockApplicationOps.findByWorkerId(user!.id),
        ])

        // Filter out unpaid drafts on the client
        const visibleJobs = activeJobs.filter((j) => j.paymentStatus !== 'pending')
        if (cancelled) return

        setJobs(visibleJobs)
        setAppliedJobIds(new Set(myApps.map((a) => a.jobId)))

        // Batch-fetch unique employer profiles (avoids N+1)
        const empIds = [...new Set(visibleJobs.map((j) => j.employerId))]
        const employers = await Promise.all(empIds.map((id) => mockUserOps.findById(id)))
        if (cancelled) return
        const empMap: Record<string, User> = {}
        for (const e of employers) { if (e) empMap[e.id] = e }
        setEmployersById(empMap)

        // FIX: Pass getWorkerProfile callback so matching actually scores jobs
        // Previously called without callback → all jobs got flat score 50 → recommendations never worked
        const matches = await matchJobs(
          { id: user!.id },
          visibleJobs,
          (workerId) => mockWorkerProfileOps.findByUserId(workerId),
        )
        if (cancelled) return
        setMatchedJobs(matches)
      } catch (error) {
        console.error('Failed to load jobs:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  // ── Memoized score lookup map (O(1) instead of O(n) per job) ──
  const scoreByJobId = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of matchedJobs) map.set(m.job.id, m.score)
    return map
  }, [matchedJobs])

  // ── Filtered jobs (memoized to avoid re-filtering on unrelated state changes) ──
  const filteredJobs = useMemo(() => {
    const sq = searchQuery.toLowerCase()
    const cf = categoryFilter.toLowerCase()
    const lf = locationFilter.toLowerCase()

    return jobs.filter((job) => {
      if (reportedJobIds.has(job.id)) return false
      const matchesSearch =
        !sq ||
        job.title.toLowerCase().includes(sq) ||
        job.description.toLowerCase().includes(sq) ||
        job.requiredSkills.some((s) => s.toLowerCase().includes(sq))
      const matchesCategory = cf === 'all' || job.category.toLowerCase() === cf
      const matchesLocation = !lf || job.location.toLowerCase().includes(lf)
      return matchesSearch && matchesCategory && matchesLocation
    })
  }, [jobs, searchQuery, categoryFilter, locationFilter, reportedJobIds])

  // ── Recommended jobs (filtered from scored matches) ──
  const recommendedJobs = useMemo(
    () => matchedJobs.filter((m) => m.score >= RECOMMENDED_THRESHOLD),
    [matchedJobs],
  )

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, categoryFilter, locationFilter])

  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE)
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // ── AI smart search: normalizes multilingual queries & extracts job/location hints ──
  const handleSmartSearch = useCallback(async () => {
    if (!searchQuery.trim() || isProcessingSearch) return

    // Fast path: plain English → no API call needed, search as-is
    if (isLikelyEnglish(searchQuery)) {
      setAiSearchHint(null)
      return
    }

    setIsProcessingSearch(true)
    setAiSearchHint(null)
    try {
      const result = await processUserInput(searchQuery, locale as SupportedLocale)
      // Apply extracted job title and location to filters
      const jobTitle = result.data?.jobTitle?.trim()
      const location = result.data?.location?.trim()
      if (jobTitle) setSearchQuery(jobTitle)
      if (location) setLocationFilter(location)
      // Show hint if the AI understood something different from raw input
      const understood = jobTitle || result.normalizedInput
      if (understood && understood.toLowerCase() !== searchQuery.toLowerCase()) {
        setAiSearchHint(understood)
      }
    } catch {
      // silently keep original query on API failure
    } finally {
      setIsProcessingSearch(false)
    }
  }, [searchQuery, locale, isProcessingSearch])

  // Stable callback for job card navigation
  const handleViewJob = useCallback(
    (jobId: string) => router.push(`/worker/jobs/${jobId}`),
    [router],
  )

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72 mb-6" />
          <Skeleton className="h-14 w-full rounded-xl mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-full mb-4" /><Skeleton className="h-10 w-full" /></CardContent>
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
                    placeholder="Search in English, Hindi or Telugu — press Enter for AI search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setAiSearchHint(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSmartSearch() }}
                    className="pl-10 pr-10"
                  />
                  {isProcessingSearch && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {aiSearchHint && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary/70 absolute -bottom-5 left-0">
                    <Sparkles className="w-3 h-3" />
                    <span>AI understood: <span className="font-medium">{aiSearchHint}</span></span>
                  </div>
                )}
                <VoiceInput
                  onResult={(transcript) => setSearchQuery(transcript)}
                  lang="en-IN"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="md:w-50">
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
                className="md:w-50"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="recommended" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Recommended ({recommendedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Jobs ({filteredJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recommended">
            {recommendedJobs.length === 0 ? (
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
                {recommendedJobs.map(({ job, score }) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    matchScore={score}
                    employer={employersById[job.employerId]}
                    hasApplied={appliedJobIds.has(job.id)}
                    distKm={
                      workerCoords && job.latitude && job.longitude
                        ? haversineKm(workerCoords.lat, workerCoords.lng, job.latitude, job.longitude)
                        : null
                    }
                    onView={handleViewJob}
                  />
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
                  {paginatedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      matchScore={scoreByJobId.get(job.id)}
                      employer={employersById[job.employerId]}
                      hasApplied={appliedJobIds.has(job.id)}
                      distKm={
                        workerCoords && job.latitude && job.longitude
                          ? haversineKm(workerCoords.lat, workerCoords.lng, job.latitude, job.longitude)
                          : null
                      }
                      onView={handleViewJob}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} &middot; {filteredJobs.length} jobs
                    </span>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
