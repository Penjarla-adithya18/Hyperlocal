'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { mockDb } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { JOB_CATEGORIES } from '@/lib/aiMatching'
import { LocationInput } from '@/components/ui/location-input'
import { IndianRupee, X, Plus, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const SKILLS = [
  'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason', 'Welder',
  'Driver', 'Delivery', 'Cook', 'Cleaner', 'Security Guard', 'Gardener',
  'Mechanic', 'AC Repair', 'Sales', 'Customer Service', 'Data Entry',
  'Content Writing', 'Teaching', 'Photography',
]

const DURATION_PRESETS = [
  '1 hour', '2 hours', '3 hours', '4 hours', 'Half day', 'Full day',
  '2-3 days', '1 week', '2 weeks', '1 month', 'Ongoing',
]

export default function EmployerJobEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const jobId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    locationLat: undefined as number | undefined,
    locationLng: undefined as number | undefined,
    payAmount: '',
    payType: 'hourly' as 'hourly' | 'fixed',
    duration: '',
    slots: 1,
    experienceRequired: 'entry' as 'entry' | 'intermediate' | 'expert',
    startDate: '',
    requirements: '',
    benefits: '',
    escrowRequired: true,
  })

  useEffect(() => {
    if (!user || user.role !== 'employer') { router.push('/login'); return }
    let cancelled = false
    async function load() {
      try {
        const job = await mockDb.getJobById(jobId)
        if (!job || cancelled) return
        setSelectedSkills(job.requiredSkills ?? [])
        setForm({
          title: job.title ?? '',
          description: job.description ?? '',
          category: job.category ?? '',
          location: job.location ?? '',
          locationLat: undefined,
          locationLng: undefined,
          payAmount: String(job.payAmount ?? job.pay ?? ''),
          payType: (job.payType as 'hourly' | 'fixed') ?? 'fixed',
          duration: job.duration ?? '',
          slots: job.slots ?? 1,
          experienceRequired: (job.experienceRequired as 'entry' | 'intermediate' | 'expert') ?? 'entry',
          startDate: job.startDate ? job.startDate.slice(0, 10) : '',
          requirements: job.requirements ?? '',
          benefits: job.benefits ?? '',
          escrowRequired: job.escrowRequired !== false,
        })
      } catch {
        toast({ title: 'Error', description: 'Failed to load job', variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [jobId, user, router])

  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) setSelectedSkills([...selectedSkills, skill])
  }
  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill))
  }
  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills([...selectedSkills, customSkill.trim()])
      setCustomSkill('')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.location || !form.payAmount) {
      toast({ title: 'Missing fields', description: 'Title, description, location and pay are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const updated = await mockDb.updateJob(jobId, {
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        locationLat: form.locationLat,
        locationLng: form.locationLng,
        payAmount: Number(form.payAmount),
        pay: Number(form.payAmount),
        payType: form.payType,
        duration: form.duration,
        slots: form.slots,
        experienceRequired: form.experienceRequired,
        startDate: form.startDate,
        requirements: form.requirements,
        benefits: form.benefits,
        escrowRequired: form.escrowRequired,
        requiredSkills: selectedSkills,
      })
      if (!updated) throw new Error('Update failed')
      toast({ title: 'Job Updated!', description: 'Your changes have been saved.' })
      router.push(`/employer/jobs/${jobId}`)
    } catch {
      toast({ title: 'Error', description: 'Failed to save. Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployerNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/employer/jobs/${jobId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Job</h1>
            <p className="text-muted-foreground">Update your job listing details</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* ── Job Details ─────────────────────────────────────────── */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Basic information about the job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need Experienced Plumber for Bathroom Repair"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work in detail..."
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <LocationInput
                    id="location"
                    value={form.location}
                    onChange={(val, latLng) => setForm({ ...form, location: val, locationLat: latLng?.lat, locationLng: latLng?.lng })}
                    placeholder="City, Area"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Required Skills ──────────────────────────────────────── */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>Select or add skills required for this job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => selectedSkills.includes(skill) ? handleRemoveSkill(skill) : handleAddSkill(skill)}
                  >
                    {skill}
                    {selectedSkills.includes(skill) && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                />
                <Button type="button" variant="outline" onClick={handleAddCustomSkill}><Plus className="h-4 w-4" /></Button>
              </div>
              {selectedSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Selected Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} className="gap-1">
                        {skill}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Payment & Duration ───────────────────────────────────── */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment & Duration</CardTitle>
              <CardDescription>Set the compensation and work duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select
                    value={form.payType}
                    onValueChange={(value: 'hourly' | 'fixed') => setForm({ ...form, payType: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{form.payType === 'hourly' ? 'Rate per Hour' : 'Fixed Amount'} (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="pl-10"
                      placeholder="0"
                      value={form.payAmount}
                      onChange={(e) => setForm({ ...form, payAmount: e.target.value })}
                      required min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration * <span className="text-xs text-muted-foreground">(type or choose)</span></Label>
                  <Input
                    list="duration-presets"
                    placeholder="e.g., Half day, 1 week, Ongoing..."
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    required
                  />
                  <datalist id="duration-presets">
                    {DURATION_PRESETS.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Number of Workers Needed *</Label>
                  <Input
                    type="number" min="1"
                    value={form.slots}
                    onChange={(e) => setForm({ ...form, slots: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Experience Level *</Label>
                  <Select
                    value={form.experienceRequired}
                    onValueChange={(value: 'entry' | 'intermediate' | 'expert') => setForm({ ...form, experienceRequired: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Additional Info ───────────────────────────────────────── */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Requirements and benefits for applicants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Specific Requirements</Label>
                <Textarea
                  placeholder="e.g., Must have own tools, Should arrive by 9 AM..."
                  rows={3}
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Benefits (Optional)</Label>
                <Textarea
                  placeholder="e.g., Lunch provided, Bonus on completion..."
                  rows={3}
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="escrow"
                  checked={form.escrowRequired}
                  onCheckedChange={(checked) => setForm({ ...form, escrowRequired: checked as boolean })}
                />
                <Label htmlFor="escrow" className="text-sm font-normal cursor-pointer">
                  Use escrow payment system (Recommended for secure payments)
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
