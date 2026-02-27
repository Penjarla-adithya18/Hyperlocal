'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/api'
import { Users, Briefcase, TrendingUp, AlertTriangle, IndianRupee, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SimpleLineChart, SimpleBarChart, SimpleDonutChart, StatsCard } from '@/components/ui/charts'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalEmployers: 0,
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
    totalReports: 0,
    unhandledReports: 0,
    totalEscrow: 0,
    heldEscrow: 0
  })

  // Mock data for analytics charts
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  })

  const userGrowthData = last7Days.map((day, i) => ({
    label: day,
    value: Math.floor(stats.totalUsers * (0.85 + (i * 0.025)))
  }))

  const jobPostingsData = last7Days.map((day, i) => ({
    label: day,
    value: Math.max(0, Math.floor((stats.activeJobs || 0) * (0.4 + i * 0.1)) + (i % 3 === 0 ? 1 : 0))
  }))

  const applicationStatusData = [
    { label: 'Pending', value: stats.pendingApplications, color: '#eab308' },
    { label: 'Others', value: Math.max(0, stats.totalApplications - stats.pendingApplications), color: '#6366f1' },
  ]

  const categoryData = [
    { label: 'Active', value: stats.activeJobs },
    { label: 'Completed', value: stats.completedJobs },
    { label: 'Other', value: Math.max(0, stats.totalJobs - stats.activeJobs - stats.completedJobs) },
  ]

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }

    let cancelled = false
    async function loadStats() {
      try {
        const data = await db.getAdminStats()
        if (cancelled) return
        setStats({
          totalUsers: data.totalUsers ?? 0,
          totalWorkers: data.totalWorkers ?? 0,
          totalEmployers: data.totalEmployers ?? 0,
          totalJobs: data.totalJobs ?? 0,
          activeJobs: data.activeJobs ?? 0,
          completedJobs: data.completedJobs ?? 0,
          totalApplications: data.totalApplications ?? 0,
          pendingApplications: data.pendingApplications ?? 0,
          totalReports: data.totalReports ?? 0,
          unhandledReports: data.unhandledReports ?? 0,
          totalEscrow: data.totalEscrow ?? 0,
          heldEscrow: data.heldEscrow ?? 0,
        })
      } catch (err) {
        console.error('Failed to load admin stats:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadStats()
    return () => { cancelled = true }
  }, [user, router])

  if (loading) {
    return (
      <div className="app-surface">
        <AdminNav />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-6"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-16" /></Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-surface">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Overview of platform statistics and health</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md" onClick={() => router.push('/admin/users')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{stats.totalWorkers} Workers</span>
                <span>{stats.totalEmployers} Employers</span>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md" onClick={() => router.push('/admin/dashboard')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jobs Posted</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">{stats.activeJobs} Active</span>
                <span className="text-muted-foreground">{stats.completedJobs} Completed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.pendingApplications} pending review
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md" onClick={() => router.push('/admin/reports')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <div className="flex items-center gap-2 mt-2">
                {stats.unhandledReports > 0 && (
                  <Badge variant="destructive">{stats.unhandledReports} need action</Badge>
                )}
                {stats.unhandledReports === 0 && (
                  <span className="text-sm text-green-600">All handled</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Escrow Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Escrow Volume</p>
                <p className="text-2xl font-bold">₹{stats.totalEscrow.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Currently Held in Escrow</p>
                <p className="text-xl font-semibold text-primary">₹{stats.heldEscrow.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Unhandled Reports</span>
                <Badge variant={stats.unhandledReports > 0 ? 'destructive' : 'outline'}>
                  {stats.unhandledReports}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Jobs</span>
                <Badge variant="default">{stats.activeJobs}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Applications</span>
                <Badge variant="secondary">{stats.pendingApplications}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Growth (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={userGrowthData} color="#6366f1" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Job Postings</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={jobPostingsData} color="#22c55e" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleDonutChart data={applicationStatusData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jobs by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart data={categoryData} color="#f59e0b" />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}





