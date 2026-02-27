'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { reportOps, trustScoreOps, userOps, chatOps } from '@/lib/api'
import { Report, User, TrustScore } from '@/lib/types'
import {
  AlertTriangle, CheckCircle, X, ShieldAlert, ShieldX,
  Ban, Phone, Mail, MessageSquare, Eye, EyeOff,
  ChevronLeft, User as UserIcon, Calendar, Flag, Trash2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

type PenaltyPreset = 5 | 15 | 30 | 9999    // 9999 = suspend (score → 0)

const PENALTY_PRESETS: { value: PenaltyPreset; label: string; desc: string; color: string }[] = [
  { value: 5,    label: 'Warning',  desc: '-5 pts',    color: 'border-yellow-400 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30' },
  { value: 15,   label: 'Moderate', desc: '-15 pts',   color: 'border-orange-400 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30' },
  { value: 30,   label: 'Severe',   desc: '-30 pts',   color: 'border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' },
  { value: 9999, label: 'Suspend',  desc: 'Score → 0', color: 'border-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' },
]

export default function AdminReportsPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [usersById, setUsersById] = useState<Record<string, User>>({})
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedTrustScore, setSelectedTrustScore] = useState<TrustScore | null>(null)

  const [resolution, setResolution] = useState('')
  const [penaltyPreset, setPenaltyPreset] = useState<PenaltyPreset | null>(null)
  const [customPenalty, setCustomPenalty] = useState('')
  const [showContact, setShowContact] = useState(false)

  const [loadingReports, setLoadingReports] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/login')
      return
    }
    let cancelled = false

    async function loadReports() {
      try {
        const allReports = await reportOps.getAll()
        if (cancelled) return
        setReports(allReports)

        const userIds = new Set<string>()
        for (const r of allReports) {
          if (r.reporterId) userIds.add(r.reporterId)
          if (r.reportedId || r.reportedUserId) userIds.add(r.reportedId || r.reportedUserId || '')
        }
        const users = await Promise.all([...userIds].filter(Boolean).map((id) => userOps.findById(id)))
        if (cancelled) return
        const uMap: Record<string, User> = {}
        for (const u of users) { if (u) uMap[u.id] = u }
        setUsersById(uMap)
      } catch (err) {
        if (!cancelled && err instanceof Error && err.message.includes('Unauthorized')) {
          router.push('/login')
          return
        }
        console.error('Failed to load reports:', err)
      } finally {
        if (!cancelled) setLoadingReports(false)
      }
    }

    loadReports()
    return () => { cancelled = true }
  }, [currentUser, router])

  const handleSelectReport = useCallback(async (report: Report) => {
    setSelectedReport(report)
    setResolution('')
    setPenaltyPreset(null)
    setCustomPenalty('')
    setShowContact(false)
    setSelectedTrustScore(null)

    const reportedId = report.reportedId || report.reportedUserId
    if (!reportedId) return

    setLoadingProfile(true)
    try {
      const ts = await trustScoreOps.findByUserId(reportedId)
      setSelectedTrustScore(ts)
    } catch { /* no trust score entry yet */ }
    finally { setLoadingProfile(false) }
  }, [])

  const effectivePenalty = penaltyPreset ?? (customPenalty ? Number(customPenalty) : 0)

  const handlePenalize = async () => {
    if (!selectedReport || effectivePenalty <= 0 || actionLoading) return
    setActionLoading(true)
    try {
      const reportedId = selectedReport.reportedId || selectedReport.reportedUserId
      const label = effectivePenalty >= 9999 ? 'Suspended (score → 0)' : `${effectivePenalty} point penalty`
      const note = resolution.trim() || `Admin action: ${label}.`
      const result = await reportOps.penalize(selectedReport.id, effectivePenalty, note)
      if (result) {
        toast({
          title: 'Penalty applied',
          description: `New trust score: ${result.newScore}/100 (${result.newLevel})`,
        })
        // Reflect updated trust score immediately in the review panel
        setSelectedTrustScore((prev) => ({
          userId: reportedId ?? '',
          jobCompletionRate: prev?.jobCompletionRate ?? 0,
          averageRating: prev?.averageRating ?? 0,
          totalRatings: prev?.totalRatings ?? 0,
          successfulPayments: prev?.successfulPayments ?? 0,
          ...(prev ?? {}),
          score: result.newScore,
          level: result.newLevel as TrustScore['level'],
          complaintCount: result.newComplaintCount,
          updatedAt: new Date().toISOString(),
        }))
        if (reportedId) {
          setUsersById((prev) => ({
            ...prev,
            [reportedId]: {
              ...prev[reportedId],
              trustScore: result.newScore,
              trustLevel: result.newLevel as User['trustLevel'],
            },
          }))
        }
        setReports((prev) =>
          prev.map((r) =>
            r.id === selectedReport.id
              ? { ...r, status: 'resolved', resolution: note, resolvedAt: new Date().toISOString() }
              : r
          )
        )
        // Keep panel open so admin can see the updated score and optionally delete the account
        setPenaltyPreset(null)
        setCustomPenalty('')
      }
    } catch (err) {
      toast({ title: 'Failed to apply penalty', description: String(err), variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteFromReport = async () => {
    if (!selectedReport || actionLoading) return
    const reportedId = selectedReport.reportedId || selectedReport.reportedUserId
    if (!reportedId) return
    await handleDeleteUser(reportedId)
    setSelectedReport(null)
  }

  const handleDeleteUser = async (reportedId: string) => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      await userOps.delete(reportedId)
      toast({ title: 'Account deleted', description: 'The user account has been permanently removed.' })
      setUsersById((prev) => {
        const next = { ...prev }
        delete next[reportedId]
        return next
      })
      setReports((prev) =>
        prev.map((r) =>
          r.reportedId === reportedId || r.reportedUserId === reportedId
            ? { ...r, status: 'resolved' as const, resolution: 'User account deleted by admin' }
            : r
        )
      )
    } catch (err) {
      toast({ title: 'Failed to delete account', description: String(err), variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async (action: 'resolved' | 'dismissed') => {
    if (!selectedReport || actionLoading) return
    setActionLoading(true)
    try {
      const result = await reportOps.update(selectedReport.id, {
        status: action,
        resolvedAt: new Date().toISOString(),
        resolution: resolution.trim() || `Report ${action} by admin`,
      })
      if (result) {
        toast({ title: action === 'resolved' ? 'Report Resolved' : 'Report Dismissed' })
        setReports((prev) => prev.map((r) => (r.id === selectedReport.id ? { ...r, ...result } : r)))
        setSelectedReport(null)
        setResolution('')
      }
    } catch (err) {
      toast({ title: 'Action failed', description: String(err), variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleContactViaChat = async () => {
    if (!selectedReport || !currentUser) return
    const reportedId = selectedReport.reportedId || selectedReport.reportedUserId
    if (!reportedId) return
    setActionLoading(true)
    try {
      const conv = await chatOps.startDirectConversation([currentUser.id, reportedId])
      if (conv?.id) router.push(`/admin/chat?conv=${conv.id}`)
    } catch (err) {
      toast({ title: 'Could not start chat', description: String(err), variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  const getPrevComplaintCount = (reportedId: string, currentReportId: string) =>
    reports.filter(
      (r) =>
        (r.reportedId === reportedId || r.reportedUserId === reportedId) &&
        r.id !== currentReportId &&
        r.status !== 'dismissed'
    ).length

  const pendingReports  = useMemo(() => reports.filter((r) => r.status === 'pending'),   [reports])
  const resolvedReports = useMemo(() => reports.filter((r) => r.status === 'resolved'),  [reports])
  const dismissedReports = useMemo(() => reports.filter((r) => r.status === 'dismissed'), [reports])

  // ── Compact Report Card ─────────────────────────────────────────────────────
  const ReportCard = ({ report }: { report: Report }) => {
    const reporter = usersById[report.reporterId]
    const reported = usersById[report.reportedId || report.reportedUserId || '']
    const prevCount = getPrevComplaintCount(reported?.id || '', report.id)

    return (
      <Card className="hover:border-primary transition-colors">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <Badge variant={report.status === 'pending' ? 'destructive' : report.status === 'resolved' ? 'default' : 'secondary'} className="capitalize text-xs">
              {report.status}
            </Badge>
            {report.type && <Badge variant="outline" className="capitalize text-xs">{report.type}</Badge>}
            {prevCount > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <Flag className="h-3 w-3" />{prevCount} prior
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(report.createdAt).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Reporter</p>
              <p className="font-medium truncate">{reporter?.fullName ?? '—'}</p>
              <p className="text-xs text-muted-foreground capitalize">{reporter?.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Reported</p>
              <p className="font-medium truncate">{reported?.fullName ?? '—'}</p>
              <p className="text-xs text-muted-foreground capitalize">{reported?.role}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Reason</p>
            <p className="text-sm line-clamp-2">{report.reason}</p>
          </div>
          {report.resolution && (
            <div className="p-2 bg-muted rounded text-xs">
              <span className="font-medium">Resolution: </span>{report.resolution}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleSelectReport(report)}>
              {report.status === 'pending' ? 'Review Report' : 'View Details'}
            </Button>
            {reported && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to permanently delete the account of{' '}
                      <strong>{reported.fullName}</strong>
                      {prevCount > 0 && (
                        <> — this user has been reported <strong>{prevCount + 1} times</strong> in total</>
                      )}.
                      {' '}This will remove their account, jobs, applications, and all associated data.
                      This action is irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDeleteUser(reported.id)}
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Full Review Panel ───────────────────────────────────────────────────────
  const ReviewPanel = () => {
    if (!selectedReport) return null

    const reporter = usersById[selectedReport.reporterId]
    const reported = usersById[selectedReport.reportedId || selectedReport.reportedUserId || '']
    const reportedId = selectedReport.reportedId || selectedReport.reportedUserId
    const prevCount = reportedId ? getPrevComplaintCount(reportedId, selectedReport.id) : 0

    const trustScore = selectedTrustScore?.score ?? (reported?.trustScore ?? 50)
    const trustLevel = selectedTrustScore?.level ?? (reported?.trustLevel ?? 'basic')
    const complaintCount = selectedTrustScore?.complaintCount ?? 0

    const trustBarColor =
      trustScore >= 80 ? 'bg-green-500' :
      trustScore >= 60 ? 'bg-blue-500' :
      trustScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'

    const trustLevelColor =
      trustLevel === 'trusted' ? 'border-green-500 text-green-700 dark:text-green-400' :
      trustLevel === 'active'  ? 'border-blue-500 text-blue-700 dark:text-blue-400' :
      'border-gray-400 text-gray-600'

    return (
      <Card className="mb-6 border-primary/40 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-lg">Review Report</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Filed {new Date(selectedReport.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedReport.type && <Badge variant="outline" className="capitalize">{selectedReport.type}</Badge>}
              <Badge variant="destructive">Pending</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Evidence */}
            <div className="space-y-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Evidence</h3>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reported by</p>
                  <p className="text-sm font-medium">
                    {reporter?.fullName ?? '—'}{' '}
                    <span className="text-muted-foreground text-xs capitalize">({reporter?.role})</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{selectedReport.reason}</p>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Details / Evidence</p>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {selectedReport.reportedJobId && (
                <Button
                  variant="outline" size="sm" className="text-xs w-fit"
                  onClick={() => window.open(`/employer/jobs/${selectedReport.reportedJobId}`, '_blank')}
                >
                  View Reported Job ↗
                </Button>
              )}

              {prevCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <Flag className="h-4 w-4 text-orange-500 shrink-0" />
                  <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                    {prevCount} previous complaint{prevCount !== 1 ? 's' : ''} against this user
                  </p>
                </div>
              )}
            </div>

            {/* Reported user profile */}
            <div className="space-y-4">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Reported User</h3>

              {loadingProfile ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg" />
                </div>
              ) : reported ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{reported.fullName}</p>
                      <Badge variant="secondary" className="capitalize text-xs mt-0.5">{reported.role}</Badge>
                      {reported.companyName && (
                        <p className="text-xs text-muted-foreground mt-1">{reported.companyName}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(reported.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Trust Score Bar */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-medium text-muted-foreground">Trust Score</p>
                      <span className="text-sm font-bold">{Math.round(trustScore)}/100</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${trustBarColor}`}
                        style={{ width: `${Math.min(100, Math.round(trustScore))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className={`capitalize text-xs ${trustLevelColor}`}>
                        {trustLevel}
                      </Badge>
                      {complaintCount > 0 && (
                        <p className="text-xs text-muted-foreground">{complaintCount} complaint{complaintCount !== 1 ? 's' : ''} total</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Contact</p>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setShowContact((p) => !p)}>
                        {showContact ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        {showContact ? 'Hide' : 'Reveal'}
                      </Button>
                    </div>
                    {showContact ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono">{reported.phoneNumber || reported.phone || '—'}</span>
                        </div>
                        {reported.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{reported.email}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Reveal to see phone / email</p>
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleContactViaChat} disabled={actionLoading}>
                    <MessageSquare className="h-4 w-4" />
                    Contact via Chat
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  Reported user not found or deleted.
                </p>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Action Panel */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1.5">Admin Notes</p>
              <Textarea
                placeholder="Decision notes (optional — stored with the report and shown to superadmins)"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={2}
              />
            </div>

            {/* Penalty Selector */}
            <div>
              <p className="text-sm font-medium mb-2">Trust Penalty</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {PENALTY_PRESETS.map((p) => (
                  <Button
                    key={p.value}
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 border-2 ${p.color} ${penaltyPreset === p.value ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                    onClick={() => { setPenaltyPreset(penaltyPreset === p.value ? null : p.value); setCustomPenalty('') }}
                  >
                    {p.value === 5    && <AlertTriangle className="h-3.5 w-3.5" />}
                    {p.value === 15   && <ShieldX className="h-3.5 w-3.5" />}
                    {p.value === 30   && <ShieldAlert className="h-3.5 w-3.5" />}
                    {p.value === 9999 && <Ban className="h-3.5 w-3.5" />}
                    {p.label}
                    <span className="text-xs opacity-60">{p.desc}</span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Custom pts"
                  type="number"
                  min={1}
                  max={100}
                  value={customPenalty}
                  onChange={(e) => { setCustomPenalty(e.target.value); setPenaltyPreset(null) }}
                  className="w-28 h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">custom penalty (1–100 pts)</p>
              </div>
              {effectivePenalty > 0 && reported && (
                <p className="text-xs mt-1.5 text-muted-foreground">
                  Applying{' '}
                  <strong>
                    {effectivePenalty >= 9999 ? 'suspension (→ 0)' : `-${effectivePenalty} pts`}
                  </strong>
                  {' '}· New score:{' '}
                  <strong>
                    {effectivePenalty >= 9999 ? 0 : Math.max(0, Math.round(trustScore) - effectivePenalty)}/100
                  </strong>
                </p>
              )}
            </div>

            {/* Delete Account — always available for any reported user */}
            {reported && (
              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Trash2 className="h-4 w-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {reported.fullName}
                      {prevCount > 0 && <span className="ml-1.5 font-normal opacity-70">· {prevCount + 1} total reports</span>}
                    </p>
                    <p className="text-xs text-red-600/70 dark:text-red-500">
                      Permanently remove this account and all associated data
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to permanently delete the account of{' '}
                        <strong>{reported.fullName}</strong>
                        {prevCount > 0 && (
                          <> — this user has been reported <strong>{prevCount + 1} times</strong> in total</>
                        )}
                        . This will remove their account, jobs, applications, and all associated data.
                        This action is irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleDeleteFromReport}
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                className="gap-2"
                disabled={effectivePenalty <= 0 || actionLoading}
                onClick={handlePenalize}
              >
                <ShieldAlert className="h-4 w-4" />
                Penalize &amp; Resolve
              </Button>
              <Button variant="outline" className="gap-2" disabled={actionLoading} onClick={() => handleResolve('resolved')}>
                <CheckCircle className="h-4 w-4" />
                Resolve (No Penalty)
              </Button>
              <Button variant="ghost" className="gap-2 text-muted-foreground" disabled={actionLoading} onClick={() => handleResolve('dismissed')}>
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="app-surface">
      <AdminNav />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Reports &amp; Moderation</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Review reports, contact users, and apply trust score penalties
          </p>
        </div>

        {selectedReport && <ReviewPanel />}

        {!selectedReport && (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-6 w-full flex-wrap">
              <TabsTrigger value="pending" className="gap-2 flex-1 min-w-[100px]">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span> ({pendingReports.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1 min-w-[100px]">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Resolved</span> ({resolvedReports.length})
              </TabsTrigger>
              <TabsTrigger value="dismissed" className="flex-1 min-w-[100px]">
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Dismissed</span> ({dismissedReports.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {loadingReports ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
                </div>
              ) : pendingReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">No pending reports to review</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {pendingReports.map((report) => <ReportCard key={report.id} report={report} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {resolvedReports.map((report) => <ReportCard key={report.id} report={report} />)}
              </div>
            </TabsContent>

            <TabsContent value="dismissed">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {dismissedReports.map((report) => <ReportCard key={report.id} report={report} />)}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
