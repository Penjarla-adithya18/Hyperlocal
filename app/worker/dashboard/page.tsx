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
} from 'lucide-react';
import { mockWorkerProfileOps, mockJobOps, mockApplicationOps, mockTrustScoreOps } from '@/lib/api';
import { WorkerProfile, Job, Application, TrustScore } from '@/lib/types';
import { getRecommendedJobs, getBasicRecommendations } from '@/lib/aiMatching';

export default function WorkerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<Array<{ job: Job; matchScore: number }>>([]);
  const [applications, setApplications] = useState<Application[]>([]);
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

  const profileCompleteness = workerProfile
    ? Math.round(
        ((workerProfile.skills.length > 0 ? 25 : 0) +
          (workerProfile.availability ? 25 : 0) +
          (workerProfile.categories.length > 0 ? 25 : 0) +
          (workerProfile.experience ? 25 : 0))
      )
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <WorkerNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
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
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.fullName}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your job search</p>
        </div>

        {/* Profile Completion Alert */}
        {profileCompleteness < 100 && (
          <Card className="p-6 bg-accent/10 border-accent/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Complete Your Profile</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete your profile to get better AI-powered job recommendations
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profile Completeness</span>
                    <span className="font-semibold">{profileCompleteness}%</span>
                  </div>
                  <Progress value={profileCompleteness} className="h-2" />
                </div>
                <Link href="/worker/profile">
                  <Button size="sm" className="mt-4">
                    Complete Profile
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
            <div className="text-sm text-muted-foreground">Applications</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.score || 50}</div>
            <div className="text-sm text-muted-foreground">Trust Score</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.averageRating.toFixed(1) || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">
              {applications.filter((a) => a.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed Jobs</div>
          </Card>
        </div>

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                {profileCompleteness === 100 ? 'AI-Powered Recommendations' : 'Recommended Jobs'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {profileCompleteness === 100
                  ? 'Jobs matched to your skills and preferences'
                  : 'Complete your profile for personalized matches'}
              </p>
            </div>
            <Link href="/worker/jobs">
              <Button variant="outline" size="sm">
                View All Jobs
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedJobs.length === 0 ? (
              <Card className="p-8 col-span-full text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Jobs Available</h3>
                <p className="text-sm text-muted-foreground">
                  Check back later for new opportunities
                </p>
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
                        {matchScore}% Match
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
                      <div className="text-xl font-bold text-primary">â‚¹{job.pay.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{job.timing}</div>
                    </div>
                    <Link href={`/worker/jobs/${job.id}`}>
                      <Button size="sm">
                        View Details
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
              <h2 className="text-2xl font-bold">Recent Applications</h2>
              <Link href="/worker/applications">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4">
              {applications.slice(0, 3).map((app) => (
                <Card key={app.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Application #{app.id.slice(-8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        app.status === 'accepted'
                          ? 'default'
                          : app.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
