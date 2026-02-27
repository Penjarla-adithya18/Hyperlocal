'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { escrowOps, jobOps } from '@/lib/api'
import { EscrowTransaction, Job } from '@/lib/types'
import { Search, Lock, Unlock, RefreshCcw, IndianRupee, AlertCircle, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/** Render escrow status badge */
function statusBadge(status: string) {
  if (status === 'held') return <Badge className="bg-green-600"><Lock className="w-3 h-3 mr-1" /> Held</Badge>
  if (status === 'released') return <Badge variant="outline" className="border-blue-500 text-blue-700"><Unlock className="w-3 h-3 mr-1" /> Released</Badge>
  if (status === 'refunded') return <Badge variant="outline" className="border-orange-500 text-orange-700"><RefreshCcw className="w-3 h-3 mr-1" /> Refunded</Badge>
  if (status === 'pending') return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

export default function AdminEscrowPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([])
  const [jobs, setJobs] = useState<Record<string, Job>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.push('/login'); return }

    let cancelled = false
    async function loadData() {
      try {
        const txns = await escrowOps.getAll()
        if (cancelled) return
        setTransactions(txns)

        // Batch-fetch unique job titles (de-duped)
        const uniqueJobIds = [...new Set(txns.map((t) => t.jobId))]
        const jobResults = await Promise.all(uniqueJobIds.map((id) => jobOps.findById(id).catch(() => null)))
        if (cancelled) return
        const jobMap: Record<string, Job> = {}
        for (const j of jobResults) { if (j) jobMap[j.id] = j }
        setJobs(jobMap)
      } catch {
        toast({ title: 'Error', description: 'Failed to load escrow data', variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [user, router])

  // ── Derived state via useMemo (replaces the derived-state-in-effect anti-pattern) ──
  const filteredTxns = useMemo(() => {
    let results = transactions
    if (statusFilter !== 'all') results = results.filter((t) => t.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      results = results.filter((t) => t.jobId.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    }
    return results
  }, [transactions, statusFilter, search])

  const { totalHeld, totalReleased, totalRefunded } = useMemo(() => {
    let held = 0, released = 0, refunded = 0
    for (const t of transactions) {
      if (t.status === 'held' || t.status === 'pending') held += t.amount
      else if (t.status === 'released') released += t.amount
      else if (t.status === 'refunded') refunded += t.amount
    }
    return { totalHeld: held, totalReleased: released, totalRefunded: refunded }
  }, [transactions])

  // Memoize per-status counts to avoid re-filtering in JSX
  const heldCount = useMemo(() => transactions.filter((t) => t.status === 'held').length, [transactions])
  const releasedCount = useMemo(() => transactions.filter((t) => t.status === 'released').length, [transactions])
  const refundedCount = useMemo(() => transactions.filter((t) => t.status === 'refunded').length, [transactions])

  /** Reload data from server */
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const txns = await escrowOps.getAll()
      setTransactions(txns)
      const uniqueJobIds = [...new Set(txns.map((t) => t.jobId))]
      const jobResults = await Promise.all(uniqueJobIds.map((id) => jobOps.findById(id).catch(() => null)))
      const jobMap: Record<string, Job> = {}
      for (const j of jobResults) { if (j) jobMap[j.id] = j }
      setJobs(jobMap)
    } catch {
      toast({ title: 'Error', description: 'Failed to refresh escrow data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-surface">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Escrow Monitor</h1>
          <p className="text-muted-foreground">All platform escrow transactions in real time</p>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> Held</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-700">₹{totalHeld.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{heldCount} transactions</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Released</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-700">₹{totalReleased.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{releasedCount} payouts</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-orange-500" /> Refunded</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-600">₹{totalRefunded.toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{refundedCount} refunds</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5" /> All Transactions</CardTitle><CardDescription>Filter and search escrow activity</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by job ID or txn ID…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Loading…</div>
            ) : filteredTxns.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No transactions found</div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTxns.map(txn => (
                      <TableRow key={txn.id}>
                        <TableCell className="font-mono text-xs">{txn.id.slice(0, 12)}…</TableCell>
                        <TableCell className="text-sm max-w-40 truncate">{jobs[txn.jobId]?.title ?? txn.jobId.slice(0, 12)}</TableCell>
                        <TableCell className="font-semibold">₹{txn.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{txn.commission ? `₹${txn.commission.toLocaleString()}` : '—'}</TableCell>
                        <TableCell>{statusBadge(txn.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(txn.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/employer/jobs/${txn.jobId}`)}>
                            View Job
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
