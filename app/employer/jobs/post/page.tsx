'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { IndianRupee, X, Plus, Calendar } from 'lucide-react'
import { JOB_CATEGORIES } from '@/lib/aiMatching'
import { Checkbox } from '@/components/ui/checkbox'
import { LocationInput } from '@/components/ui/location-input'

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

export default function PostJobPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    payAmount: '',
    payType: 'hourly' as 'hourly' | 'fixed',
    duration: '',
    slots: 1,
    experienceRequired: 'entry' as 'entry' | 'intermediate' | 'expert',
    startDate: '',
    requirements: '',
    benefits: '',
    escrowRequired: true
  })

  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill))
  }

  const handleAddCustomSkill = () => {
    if (customSkill && !selectedSkills.includes(customSkill)) {
      setSelectedSkills([...selectedSkills, customSkill])
      setCustomSkill('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || user.role !== 'employer') {
      toast({
        title: 'Error',
        description: 'You must be logged in as an employer to post jobs',
        variant: 'destructive'
      })
      return
    }

    if (selectedSkills.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one required skill',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Posting limits: basic trust level employers can only post up to 3 jobs
      if (user.trustLevel === 'basic') {
        const allJobs = await db.getAllJobs()
        const myActiveJobs = allJobs.filter(j => j.employerId === user.id && (j.status === 'active' || j.status === 'draft'))
        if (myActiveJobs.length >= 3) {
          toast({
            title: 'Posting Limit Reached',
            description: 'New accounts can post up to 3 jobs. Complete existing jobs to unlock more postings.',
            variant: 'destructive',
          })
          setLoading(false)
          return
        }
      }

      const newJob = await db.createJob({
        ...formData,
        employerId: user.id,
        requiredSkills: selectedSkills,
        payAmount: parseFloat(formData.payAmount),
        status: 'draft',
        paymentStatus: 'pending',
      })

      toast({
        title: 'Job Created!',
        description: 'Complete escrow payment to make your job live.',
      })

      router.push(`/employer/payment/${newJob.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post job. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-surface">
      <EmployerNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Post a New Job</h1>
          <p className="text-sm md:text-base text-muted-foreground">Fill in the details to find the perfect match for your job</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Provide basic information about the job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need Experienced Plumber for Bathroom Repair"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the work that needs to be done in detail..."
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <LocationInput
                    id="location"
                    value={formData.location}
                    onChange={(val, latLng) => setFormData({ ...formData, location: val, latitude: latLng?.lat, longitude: latLng?.lng })}
                    placeholder="City, Area"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                <Button type="button" onClick={handleAddCustomSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedSkills.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Selected Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <Badge key={skill} className="gap-1">
                        {skill}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment & Duration</CardTitle>
              <CardDescription>Set the compensation and work duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payType">Payment Type *</Label>
                  <Select
                    value={formData.payType}
                    onValueChange={(value: 'hourly' | 'fixed') => setFormData({ ...formData, payType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rate</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payAmount">
                    {formData.payType === 'hourly' ? 'Rate per Hour' : 'Fixed Amount'} (₹) *
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="payAmount"
                      type="number"
                      className="pl-10"
                      placeholder="0"
                      value={formData.payAmount}
                      onChange={(e) => setFormData({ ...formData, payAmount: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration * <span className="text-xs text-muted-foreground">(type or choose)</span></Label>
                  <Input
                    id="duration"
                    list="duration-presets"
                    placeholder="e.g., Half day, 1 week, Ongoing..."
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                  <datalist id="duration-presets">
                    {DURATION_PRESETS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slots">Number of Workers Needed *</Label>
                  <Input
                    id="slots"
                    type="number"
                    min="1"
                    value={formData.slots}
                    onChange={(e) => setFormData({ ...formData, slots: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Preferred Start Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startDate"
                      type="date"
                      className="pl-10"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level *</Label>
                  <Select
                    value={formData.experienceRequired}
                    onValueChange={(value: 'entry' | 'intermediate' | 'expert') => 
                      setFormData({ ...formData, experienceRequired: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Provide more details about requirements and benefits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="requirements">Specific Requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="e.g., Must have own tools, Should arrive by 9 AM..."
                  rows={3}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits (Optional)</Label>
                <Textarea
                  id="benefits"
                  placeholder="e.g., Lunch provided, Bonus on completion..."
                  rows={3}
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="escrow"
                  checked={formData.escrowRequired}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, escrowRequired: checked as boolean })
                  }
                />
                <Label htmlFor="escrow" className="text-sm font-normal cursor-pointer">
                  Use escrow payment system (Recommended for secure payments)
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Posting...' : 'Post Job'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
