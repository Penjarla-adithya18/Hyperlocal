'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb } from '@/lib/api'
import { Users, Briefcase, TrendingUp, AlertTriangle, IndianRupee, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
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

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }
    loadStats()
  }, [user, router])

  const loadStats = async () => {
    const data = await mockDb.getAdminStats()
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
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform statistics and health</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/admin/users')}>
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

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
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

          <Card>
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

          <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => router.push('/admin/reports')}>
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

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Escrow Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Escrow Volume</p>
                <p className="text-2xl font-bold">â‚¹{stats.totalEscrow.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Currently Held in Escrow</p>
                <p className="text-xl font-semibold text-primary">â‚¹{stats.heldEscrow.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
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
      </main>
    </div>
  )
}
