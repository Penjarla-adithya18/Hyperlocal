'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkerNav } from '@/components/worker/WorkerNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import {
  Briefcase,
  TrendingUp,
  Star,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { mockWorkerProfileOps, mockJobOps, mockApplicationOps, mockTrustScoreOps } from '@/lib/api';
import { WorkerProfile, Job, Application, TrustScore } from '@/lib/types';
import { getRecommendedJobs, getBasicRecommendations } from '@/lib/aiMatching';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/contexts/I18nContext';

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<Array<{ job: Job; matchScore: number }>>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobsById, setJobsById] = useState<Record<string, Job>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'worker') {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [profile, trust, apps, allJobs] = await Promise.all([
        mockWorkerProfileOps.findByUserId(user.id),
        mockTrustScoreOps.findByUserId(user.id),
        mockApplicationOps.findByWorkerId(user.id),
        mockJobOps.getAll({ status: 'active' }),
      ]);

      setWorkerProfile(profile);
      setTrustScore(trust);
      setApplications(apps || []);

      // Build jobsById map for recent apps section
      const byId: Record<string, Job> = {};
      for (const j of allJobs) byId[j.id] = j;
      setJobsById(byId);

      // Get job recommendations
      if (profile && profile.profileCompleted) {
        const recommended = getRecommendedJobs(profile, allJobs, 5);
        setRecommendedJobs(recommended);
      } else if (profile) {
        const basic = getBasicRecommendations(profile.categories, allJobs, 5);
        setRecommendedJobs(basic.map((job) => ({ job, matchScore: 0 })));
      } else {
        const basic = getBasicRecommendations([], allJobs, 5);
        setRecommendedJobs(basic.map((job) => ({ job, matchScore: 0 })));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Profile completeness — bio excluded (optional field)
  const profileCompleteness = workerProfile
    ? Math.round(
        (workerProfile.skills.length > 0 ? 25 : 0) +
        (workerProfile.categories.length > 0 ? 25 : 0) +
        (workerProfile.availability ? 20 : 0) +
        (workerProfile.experience ? 20 : 0) +
        (workerProfile.location ? 10 : 0)
      )
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-xl mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-full mb-3" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <WorkerNav />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('worker.dash.welcome', { name: user?.fullName ?? '' })}</h1>
          <p className="text-muted-foreground">{t('worker.dash.subtitle')}</p>
        </div>

        {/* Profile Completion Alert */}
        {profileCompleteness < 100 && (
          <Card className="p-6 bg-accent/10 border-accent/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{t('worker.dash.completeProfile')}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('worker.dash.completeProfileDesc')}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('worker.dash.profilePct')}</span>
                    <span className="font-semibold">{profileCompleteness}%</span>
                  </div>
                  <Progress value={profileCompleteness} className="h-2" />
                </div>
                <Link href="/worker/profile">
                  <Button size="sm" className="mt-4">
                    {t('worker.dash.completeBtn')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{applications.length}</div>
            <div className="text-sm text-muted-foreground">{t('worker.dash.applications')}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.score || 50}</div>
            <div className="text-sm text-muted-foreground">{t('worker.dash.trustScore')}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.averageRating.toFixed(1) || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{t('worker.dash.avgRating')}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">
              {applications.filter((a) => a.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">{t('worker.dash.completedJobs')}</div>
          </Card>
        </div>

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {profileCompleteness === 100 ? t('worker.dash.aiRecs') : t('worker.dash.recs')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profileCompleteness === 100
                  ? t('worker.dash.matchedDesc')
                  : t('worker.dash.completeForMatches')}
              </p>
            </div>
            <Link href="/worker/jobs">
              <Button variant="outline" size="sm">
                {t('worker.dash.viewAllJobs')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedJobs.length === 0 ? (
              <Card className="p-8 col-span-full text-center border-dashed">
                <Sparkles className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('worker.dash.noRecsTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('worker.dash.noRecsDesc')}
                </p>
                <Button onClick={() => router.push('/worker/profile')}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {t('worker.dash.completeBtn')}
                </Button>
              </Card>
            ) : (
              recommendedJobs.map(({ job, matchScore }) => (
                <Card key={job.id} className="p-6 hover:shadow-lg transition-all hover:border-primary/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold mb-1 text-balance">{job.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location.split(',')[0]}
                      </p>
                    </div>
                    {matchScore > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {t('worker.dash.match', { score: String(matchScore) })}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{job.jobType}</Badge>
                      <Badge variant="outline">{job.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-xl font-bold text-primary">₹{job.pay.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{job.timing}</div>
                    </div>
                    <Link href={`/worker/jobs/${job.id}`}>
                      <Button size="sm">
                        {t('common.viewDetails')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent Applications */}
        {applications.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{t('worker.dash.recentApps')}</h2>
              <Link href="/worker/applications">
                <Button variant="outline" size="sm">
                  {t('worker.dash.viewAll')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4">
              {applications.slice(0, 3).map((app) => {
                const job = jobsById[app.jobId];
                return (
                <Card key={app.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {job ? job.title : t('worker.dash.appNo', { id: app.id.slice(-8) })}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('worker.dash.appliedOn', { date: new Date(app.createdAt).toLocaleDateString() })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          app.status === 'accepted'
                            ? 'default'
                            : app.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {t(`status.${app.status}`) || app.status}
                      </Badge>
                      <Link href={`/worker/jobs/${app.jobId}`}>
                        <Button size="sm" variant="outline">
                          {t('common.viewDetails')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
