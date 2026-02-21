'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mockDb } from '@/lib/mockDb'
import { Job } from '@/lib/types'

export default function EmployerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    async function load() {
      const data = await mockDb.getJobById(params.id as string)
      setJob(data)
    }
    load()
  }, [params.id])

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-10 text-center">Job not found</CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <Badge>{job.status}</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Category:</strong> {job.category}</p>
            <p><strong>Location:</strong> {job.location}</p>
            <p><strong>Pay:</strong> ₹{job.payAmount ?? job.pay}</p>
            <p><strong>Duration:</strong> {job.duration ?? job.timing}</p>
            <p><strong>Description:</strong> {job.description}</p>
            <div className="pt-4 flex gap-2">
              <Button onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}>Edit Job</Button>
              <Button variant="outline" onClick={() => router.push('/employer/jobs')}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
