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
import { mockDb } from '@/lib/api'

export default function EmployerJobEditPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', location: '', payAmount: '' })

  useEffect(() => {
    async function load() {
      const job = await mockDb.getJobById(params.id as string)
      if (job) {
        setForm({
          title: job.title,
          description: job.description,
          location: job.location,
          payAmount: String(job.payAmount ?? job.pay),
        })
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function onSave() {
    const updated = await mockDb.updateJob(params.id as string, {
      title: form.title,
      description: form.description,
      location: form.location,
      payAmount: Number(form.payAmount),
      pay: Number(form.payAmount),
    })

    if (!updated) return

    toast({ title: 'Saved', description: 'Job updated successfully' })
    router.push(`/employer/jobs/${params.id}`)
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
              <Button onClick={onSave}>Save</Button>
              <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
