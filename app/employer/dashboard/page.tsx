'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmployerNav } from '@/components/employer/EmployerNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  Briefcase,
  Users,
  Star,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Eye,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { mockEmployerProfileOps, mockJobOps, mockApplicationOps, mockTrustScoreOps } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployerProfile, Job, Application, TrustScore } from '@/lib/types';
import { generateDashboardInsights, type DashboardInsight } from '@/lib/gemini';
import { useI18n } from '@/contexts/I18nContext';

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appCountByJob, setAppCountByJob] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<DashboardInsight[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'employer') {
      router.push('/login');
      return;
    }

    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [profile, trust, employerJobs] = await Promise.all([
          mockEmployerProfileOps.findByUserId(user!.id),
          mockTrustScoreOps.findByUserId(user!.id),
          mockJobOps.findByEmployerId(user!.id),
        ]);
        if (cancelled) return;

        setEmployerProfile(profile);
        setTrustScore(trust);
        setJobs(employerJobs);

        // Fetch applications per job in parallel (N+1 � acceptable since no bulk endpoint exists)
        const jobIds = employerJobs.map((j) => j.id);
        const allApps = await Promise.all(jobIds.map((id) => mockApplicationOps.findByJobId(id)));
        if (cancelled) return;
        const flatApps = allApps.flat();
        setApplications(flatApps);

        const countMap: Record<string, number> = {};
        for (const app of flatApps) {
          countMap[app.jobId] = (countMap[app.jobId] || 0) + 1;
        }
        setAppCountByJob(countMap);

        // AI insights
        const insightKey = `dash_insights_employer_${user!.id}`
        const cachedInsights = sessionStorage.getItem(insightKey)
        if (cachedInsights) {
          if (!cancelled) setAiInsights(JSON.parse(cachedInsights))
        } else {
          generateDashboardInsights('employer', {
            totalJobs: employerJobs.length,
            activeJobs: employerJobs.filter(j => j.status === 'active').length,
            completedJobs: employerJobs.filter(j => j.status === 'filled').length,
            avgRating: trust?.averageRating,
            pendingApplications: flatApps.filter(a => a.status === 'pending').length,
            hireRate: flatApps.length > 0 ? Math.round(flatApps.filter(a => a.status === 'accepted').length / flatApps.length * 100) : 0,
          }).then(insights => {
            if (!cancelled) {
              setAiInsights(insights)
              sessionStorage.setItem(insightKey, JSON.stringify(insights))
            }
          }).catch(() => {})
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { cancelled = true; };
  }, [user, router]);

  // Memoized derived stats
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'active').length, [jobs]);
  const totalApplications = applications.length;
  const pendingApplications = useMemo(() => applications.filter((a) => a.status === 'pending').length, [applications]);

  if (loading) {
    return (
      <div className="app-surface">
        <EmployerNav />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/20">
      <EmployerNav />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('employer.dash.welcome', { name: employerProfile?.businessName || user?.fullName || '' })}</h1>
            <p className="text-muted-foreground">{t('employer.dash.subtitle')}</p>
          </div>
          <Link href="/employer/jobs/post">
            <Button size="lg" className="bg-accent hover:bg-accent/90 gap-2">
              <PlusCircle className="w-5 h-5" />
              {t('employer.dash.postJob')}
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <div className="text-sm text-muted-foreground">{t('employer.dash.activeJobs')}</div>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <div className="text-sm text-muted-foreground">{t('employer.dash.totalApps')}</div>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{pendingApplications}</div>
            <div className="text-sm text-muted-foreground">{t('employer.dash.pendingApps')}</div>
          </Card>

          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.score || 50}</div>
            <div className="text-sm text-muted-foreground">{t('worker.dash.trustScore')}</div>
          </Card>
        </div>

        {/* AI Insights */}
        {aiInsights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiInsights.map((insight, i) => {
              const iconMap: Record<string, typeof Sparkles> = {
                star: Star, trophy: CheckCircle2, target: Briefcase, 'trending-up': TrendingUp,
                'alert-triangle': AlertCircle, lightbulb: Sparkles, rocket: TrendingUp, heart: Star,
              }
              const IconComp = iconMap[insight.icon] || Sparkles
              const borderColor = insight.type === 'achievement' ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20'
                : insight.type === 'alert' ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                : insight.type === 'opportunity' ? 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20'
              return (
                <Card key={i} className={`p-4 ${borderColor} transition-all hover:shadow-md`}>
                  <div className="flex items-start gap-3">
                    <IconComp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.message}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="p-6 transition-all duration-200 hover:shadow-md">
          <h2 className="text-xl font-semibold mb-4">{t('employer.dash.quickActions')}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/employer/jobs/post">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t('employer.dash.postJob')}</div>
                  <div className="text-xs text-muted-foreground">{t('employer.dash.subtitle')}</div>
                </div>
              </Button>
            </Link>

            <Link href="/employer/jobs">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t('employer.dash.pendingApps')}</div>
                  <div className="text-xs text-muted-foreground">{t('employer.dash.applicants', { count: pendingApplications })}</div>
                </div>
              </Button>
            </Link>

            <Link href="/employer/chat">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{t('nav.messages')}</div>
                  <div className="text-xs text-muted-foreground">Chat with applicants</div>
                </div>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('employer.dash.recentJobs')}</h2>
            <Link href="/employer/jobs">
              <Button variant="outline" size="sm">
                {t('employer.dash.viewAllJobs')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center transition-all duration-200 hover:shadow-md">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('employer.dash.noJobs')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('employer.dash.postFirst')}
              </p>
              <Link href="/employer/jobs/post">
                <Button className="bg-accent hover:bg-accent/90">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {jobs.slice(0, 4).map((job) => (
                <Card key={job.id} className="p-6 hover:shadow-lg transition-all hover:border-accent/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 text-balance">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.category}</p>
                    </div>
                    <Badge
                      variant={
                        job.status === 'active'
                          ? 'default'
                          : job.status === 'filled'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={job.status === 'active' ? 'bg-accent' : ''}
                    >
                      {t(`job.status.${job.status}`) || job.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {t('employer.dash.applicants', { count: appCountByJob[job.id] ?? 0 })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {(job.views ?? 0)} views
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-xl font-bold text-accent">₹{(job.payAmount ?? job.pay ?? 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {job.paymentStatus === 'locked' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            {t('payment.escrowSecured')}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            {t('job.status.draft')}
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/employer/jobs/${job.id}`}>
                      <Button size="sm" variant="outline">
                        {t('common.viewDetails')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Trust Score Info */}
        {trustScore && (
          <Card className="bg-linear-to-br from-primary/5 to-accent/5 p-6 transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Your Trust Score: {trustScore.score}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {trustScore.level === 'trusted'
                    ? 'Excellent! You have a trusted reputation.'
                    : trustScore.level === 'active'
                    ? 'Good! Keep completing jobs to increase your score.'
                    : 'Build your reputation by completing jobs successfully.'}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Completion Rate</div>
                    <div className="font-semibold">{trustScore.jobCompletionRate}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Average Rating</div>
                    <div className="font-semibold">{(trustScore.averageRating ?? 0).toFixed(1)} / 5.0</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Ratings</div>
                    <div className="font-semibold">{trustScore.totalRatings}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
