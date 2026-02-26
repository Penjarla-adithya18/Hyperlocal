'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { workerProfileOps, jobOps } from '@/lib/api'
import { analyzeSkillGap, SkillGapResult, SupportedLocale } from '@/lib/gemini'
import { WorkerProfile, Job } from '@/lib/types'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Target,
  TrendingUp,
  BookOpen,
} from 'lucide-react'

export default function SkillGapPage() {
  const { user, loading: authLoading } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()

  const [profile, setProfile] = useState<WorkerProfile | null>(null)
  const [demandedSkills, setDemandedSkills] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<SkillGapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'worker')) router.replace('/login')
  }, [authLoading, user, router])

  // Load profile & demanded skills
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [prof, allJobs] = await Promise.all([
          workerProfileOps.findByUserId(user.id),
          jobOps.getAll({ status: 'active' }),
        ])
        setProfile(prof)

        // Aggregate demanded skills from all active jobs, ranked by frequency
        const freq = new Map<string, number>()
        allJobs.forEach((j) =>
          j.requiredSkills.forEach((s) => {
            const key = s.toLowerCase().trim()
            freq.set(key, (freq.get(key) ?? 0) + 1)
          }),
        )
        const ranked = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([skill]) => skill.charAt(0).toUpperCase() + skill.slice(1))
        setDemandedSkills(ranked)

        // Check sessionStorage cache first
        const cacheKey = `skill_gap_${user.id}_${locale}`
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          try {
            setAnalysis(JSON.parse(cached))
          } catch { /* fall through to auto-analyze */ }
        }
      } catch (e) {
        console.error('Failed to load skill gap data', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, locale])

  // Run AI analysis
  const runAnalysis = async () => {
    if (!profile || demandedSkills.length === 0) return
    setAnalyzing(true)
    try {
      const result = await analyzeSkillGap(
        profile.skills ?? [],
        demandedSkills,
        locale as SupportedLocale,
      )
      setAnalysis(result)
      if (user) {
        sessionStorage.setItem(`skill_gap_${user.id}_${locale}`, JSON.stringify(result))
      }
    } catch (e) {
      console.error('Skill gap analysis failed', e)
    } finally {
      setAnalyzing(false)
    }
  }

  // Auto-analyze on first load if no cache
  useEffect(() => {
    if (!loading && profile && demandedSkills.length > 0 && !analysis) {
      runAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile, demandedSkills])

  // Skill match percentage
  const matchPct = useMemo(() => {
    if (!analysis || demandedSkills.length === 0) return 0
    return Math.round((analysis.strongSkills.length / demandedSkills.length) * 100)
  }, [analysis, demandedSkills])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              AI Skill Gap Analyzer
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Compare your skills against what employers are looking for
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={analyzing || !profile || demandedSkills.length === 0}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
        </div>

        {loading || analyzing ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : !profile?.skills?.length ? (
          /* No skills on profile */
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-semibold mb-2">Complete Your Profile First</h3>
              <p className="text-muted-foreground mb-4">
                Add your skills to your profile so we can analyze your strengths and gaps.
              </p>
              <Button onClick={() => router.push('/worker/profile')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Go to Profile
              </Button>
            </CardContent>
          </Card>
        ) : analysis ? (
          <>
            {/* Summary Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Market Readiness</p>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-2">{matchPct}%</div>
                  <Progress value={matchPct} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Strong Skills</p>
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{analysis.strongSkills.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">In-demand skills you have</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">Skill Gaps</p>
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{analysis.gapSkills.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Skills to learn for more jobs</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium mb-1">AI Assessment</p>
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strong Skills */}
            {analysis.strongSkills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Your Strong Skills
                  </CardTitle>
                  <CardDescription>These skills are in high demand — you&apos;re already competitive here</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.strongSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3">
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skill Gaps + Tips */}
            {analysis.tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-600" />
                    Skills to Learn
                  </CardTitle>
                  <CardDescription>Learning these skills can unlock more job opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.tips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Lightbulb className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{tip.skill}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{tip.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Demanded Skills overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top In-Demand Skills</CardTitle>
                <CardDescription>Most requested skills across {demandedSkills.length} active job categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {demandedSkills.map((skill) => {
                    const hasSkill = analysis.strongSkills
                      .map((s) => s.toLowerCase())
                      .includes(skill.toLowerCase())
                    return (
                      <Badge
                        key={skill}
                        variant="outline"
                        className={
                          hasSkill
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {hasSkill && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {skill}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  )
}
