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
import { mockWorkerProfileOps, mockJobOps } from '@/lib/api'
import { analyzeSkillGap, generateLearningPlan, SkillGapResult, AILearningPlan, SupportedLocale } from '@/lib/gemini'
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
  ExternalLink,
  Play,
  GraduationCap,
  FileText,
  Users,
  Zap,
  Loader2,
} from 'lucide-react'

export default function SkillGapPage() {
  const { user, loading: authLoading } = useAuth()
  const { locale } = useI18n()
  const router = useRouter()

  const [profile, setProfile] = useState<WorkerProfile | null>(null)
  const [demandedSkills, setDemandedSkills] = useState<string[]>([])
  const [analysis, setAnalysis] = useState<SkillGapResult | null>(null)
  const [learningPlan, setLearningPlan] = useState<AILearningPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
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
          mockWorkerProfileOps.findByUserId(user.id),
          mockJobOps.getAll({ status: 'active' }),
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
    setLearningPlan(null)
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

  // Fetch learning plan once analysis is ready
  const fetchLearningPlan = async () => {
    if (!profile || !analysis || analysis.gapSkills.length === 0) return
    setLoadingPlan(true)
    try {
      const planCacheKey = `learning_plan_${user?.id}_${locale}`
      const cachedPlan = sessionStorage.getItem(planCacheKey)
      if (cachedPlan) {
        try {
          setLearningPlan(JSON.parse(cachedPlan))
          return
        } catch { /* fall through */ }
      }
      const plan = await generateLearningPlan(
        'In-demand skills',
        demandedSkills,
        profile.skills ?? [],
        profile.experience ?? 'not specified',
        locale as SupportedLocale,
      )
      setLearningPlan(plan)
      if (user) {
        sessionStorage.setItem(planCacheKey, JSON.stringify(plan))
      }
    } catch (e) {
      console.error('Learning plan generation failed', e)
    } finally {
      setLoadingPlan(false)
    }
  }

  // Auto-fetch learning plan when analysis completes
  useEffect(() => {
    if (analysis && !learningPlan && !loadingPlan && profile) {
      fetchLearningPlan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis])

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

            {/* AI Learning Resources */}
            {(learningPlan || loadingPlan) && (
              <Card className="border-blue-200/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        AI Learning Plan
                      </CardTitle>
                      <CardDescription>Personalized resources to close your skill gaps</CardDescription>
                    </div>
                    {learningPlan && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{learningPlan.readinessScore}%</div>
                        <p className="text-xs text-muted-foreground">Readiness</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingPlan ? (
                    <div className="flex items-center justify-center py-8 gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <p className="text-sm text-muted-foreground">Generating personalized learning plan...</p>
                    </div>
                  ) : learningPlan ? (
                    <>
                      {/* Quick Wins */}
                      {learningPlan.quickWins.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                          <h4 className="font-medium flex items-center gap-2 mb-3">
                            <Zap className="h-4 w-4 text-blue-600" />
                            Quick Wins — Do These Today
                          </h4>
                          <ul className="space-y-2">
                            {learningPlan.quickWins.map((win, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {win}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Per-skill resources */}
                      {learningPlan.resources
                        .filter((r) => !r.hasSkill)
                        .map((lr) => (
                          <div key={lr.skill} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-base">{lr.skill}</h4>
                              <Badge variant="outline" className="text-xs">
                                {lr.estimatedTime}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {lr.resources.map((res, ri) => {
                                const TypeIcon =
                                  res.type === 'video' ? Play
                                  : res.type === 'course' ? GraduationCap
                                  : res.type === 'community' ? Users
                                  : res.type === 'practice' ? Target
                                  : FileText
                                return (
                                  <a
                                    key={ri}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 p-2.5 rounded-md border hover:bg-muted/50 transition-colors group"
                                  >
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                                      <TypeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                        {res.title}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{res.description}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                          {res.platform}
                                        </Badge>
                                        {res.free && (
                                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                            Free
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        ))}

                      {/* Skills you already have (level-up) */}
                      {learningPlan.resources.filter((r) => r.hasSkill).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Level Up Your Existing Skills
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {learningPlan.resources
                              .filter((r) => r.hasSkill)
                              .map((lr) => (
                                <div key={lr.skill} className="border rounded-lg p-3">
                                  <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    {lr.skill}
                                  </p>
                                  {lr.resources.map((res, ri) => (
                                    <a
                                      key={ri}
                                      href={res.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      {res.title}
                                    </a>
                                  ))}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Career Path */}
                      {learningPlan.careerPath && (
                        <div className="bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/30 rounded-lg p-4">
                          <h4 className="font-medium flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Your Career Growth Path
                          </h4>
                          <p className="text-sm text-muted-foreground">{learningPlan.careerPath}</p>
                        </div>
                      )}
                    </>
                  ) : null}
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
