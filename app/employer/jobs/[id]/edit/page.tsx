'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb } from '@/lib/api'

export default function EmployerJobEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', location: '', payAmount: '' })

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'employer') { router.push('/'); return }

    async function load() {
      const job = await mockDb.getJobById(params.id as string)
      if (!job) {
        toast({ title: 'Not found', description: 'Job not found', variant: 'destructive' })
        router.push('/employer/jobs')
        return
      }
      if (job.employerId !== user!.id) {
        toast({ title: 'Unauthorized', description: 'You cannot edit this job', variant: 'destructive' })
        router.push('/employer/jobs')
        return
      }
      setForm({
        title: job.title,
        description: job.description,
        location: job.location,
        payAmount: String(job.payAmount ?? job.pay ?? ''),
      })
      setLoading(false)
    }
    load()
  }, [params.id, user])

  async function onSave() {
    // Validate required fields
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast({ title: 'Validation Error', description: 'Title, description, and location are required', variant: 'destructive' })
      return
    }
    const pay = Number(form.payAmount)
    if (!pay || pay <= 0 || isNaN(pay)) {
      toast({ title: 'Validation Error', description: 'Pay must be a positive number', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const updated = await mockDb.updateJob(params.id as string, {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        payAmount: pay,
        pay: pay,
      })

      if (!updated) {
        toast({ title: 'Error', description: 'Failed to update job', variant: 'destructive' })
        return
      }

      toast({ title: 'Saved', description: 'Job updated successfully' })
      router.push(`/employer/jobs/${params.id}`)
    } catch {
      toast({ title: 'Error', description: 'Failed to update job', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <main className="container mx-auto px-4 py-8">Loading...</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Pay</Label>
              <Input type="number" value={form.payAmount} onChange={(e) => setForm({ ...form, payAmount: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
