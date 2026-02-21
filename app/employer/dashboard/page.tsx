'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { mockEmployerProfileOps, mockJobOps, mockApplicationOps, mockTrustScoreOps } from '@/lib/mockDb';
import { EmployerProfile, Job, Application, TrustScore } from '@/lib/types';

export default function EmployerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'employer') {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [user, router]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [profile, trust, employerJobs] = await Promise.all([
        mockEmployerProfileOps.findByUserId(user.id),
        mockTrustScoreOps.findByUserId(user.id),
        mockJobOps.findByEmployerId(user.id),
      ]);

      setEmployerProfile(profile);
      setTrustScore(trust);
      setJobs(employerJobs);

      // Get all applications for employer's jobs
      const jobIds = employerJobs.map((j) => j.id);
      const allApps = await Promise.all(jobIds.map((id) => mockApplicationOps.findByJobId(id)));
      setApplications(allApps.flat());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApplications = applications.length;
  const pendingApplications = applications.filter((a) => a.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <EmployerNav />

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {employerProfile?.businessName || user?.fullName}!</h1>
            <p className="text-muted-foreground">Manage your job postings and find the right talent</p>
          </div>
          <Link href="/employer/jobs/post">
            <Button size="lg" className="bg-accent hover:bg-accent/90 gap-2">
              <PlusCircle className="w-5 h-5" />
              Post a Job
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <div className="text-sm text-muted-foreground">Active Jobs</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{totalApplications}</div>
            <div className="text-sm text-muted-foreground">Total Applications</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            <div className="text-2xl font-bold">{pendingApplications}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{trustScore?.score || 50}</div>
            <div className="text-sm text-muted-foreground">Trust Score</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/employer/jobs/post">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Post a New Job</div>
                  <div className="text-xs text-muted-foreground">Find skilled workers quickly</div>
                </div>
              </Button>
            </Link>

            <Link href="/employer/jobs">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Review Applicants</div>
                  <div className="text-xs text-muted-foreground">{pendingApplications} pending review</div>
                </div>
              </Button>
            </Link>

            <Link href="/employer/chat">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">View Messages</div>
                  <div className="text-xs text-muted-foreground">Chat with applicants</div>
                </div>
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Jobs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Job Postings</h2>
            <Link href="/employer/jobs">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Jobs Posted Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by posting your first job to connect with local workers
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
                      {job.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.applicationCount} applicants
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {job.views} views
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="text-xl font-bold text-accent">₹{job.pay.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {job.paymentStatus === 'locked' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Escrow Secured
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            Pending Escrow
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/employer/jobs/${job.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
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
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
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
                    <div className="font-semibold">{trustScore.averageRating.toFixed(1)} / 5.0</div>
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
