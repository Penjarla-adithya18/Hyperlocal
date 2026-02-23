'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb } from '@/lib/api'
import { Report } from '@/lib/types'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export default function AdminReportsPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolution, setResolution] = useState('')

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/login')
      return
    }
    loadReports()
  }, [currentUser, router])

  const loadReports = async () => {
    await mockDb.getAllUsers()
    const allReports = await mockDb.getAllReports()
    setReports(allReports)
  }

  const handleResolve = async (reportId: string, action: 'resolved' | 'dismissed') => {
    const report = await mockDb.updateReport(reportId, {
      status: action,
      resolvedAt: new Date().toISOString(),
      resolution: resolution || `Report ${action} by admin`,
    })
    if (report) {
      
      toast({
        title: action === 'resolved' ? 'Report Resolved' : 'Report Dismissed',
        description: `Report has been ${action}`
      })
      
      setSelectedReport(null)
      setResolution('')
      loadReports()
    }
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const resolvedReports = reports.filter(r => r.status === 'resolved')
  const dismissedReports = reports.filter(r => r.status === 'dismissed')

  const ReportCard = ({ report }: { report: Report }) => {
    const reporter = mockDb.getUserById(report.reporterId)
    const reported = mockDb.getUserById(report.reportedId || report.reportedUserId || '')

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg mb-2 capitalize">{report.type} Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                Reported {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={
              report.status === 'pending' ? 'destructive' :
              report.status === 'resolved' ? 'default' :
              'secondary'
            }>
              {report.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Reported By:</p>
            <p className="text-sm text-muted-foreground">{reporter?.fullName} ({reporter?.role})</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Reported User:</p>
            <p className="text-sm text-muted-foreground">{reported?.fullName} ({reported?.role})</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Reason:</p>
            <p className="text-sm">{report.reason}</p>
          </div>

          {report.resolution && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Resolution:</p>
              <p className="text-sm">{report.resolution}</p>
            </div>
          )}

          {report.status === 'pending' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedReport(report)}
            >
              Review Report
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Moderation</h1>
          <p className="text-muted-foreground">Review and manage user reports</p>
        </div>

        {selectedReport && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle>Review Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium mb-2">Report Details:</p>
                <p className="text-sm text-muted-foreground">{selectedReport.reason}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Admin Action Notes:</p>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => handleResolve(selectedReport.id, 'resolved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve & Take Action
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleResolve(selectedReport.id, 'dismissed')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss Report
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSelectedReport(null)
                  setResolution('')
                }}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedReports.length})
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              Dismissed ({dismissedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending reports to review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resolvedReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dismissed">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dismissedReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
