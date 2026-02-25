'use client'

import { useState, useMemo } from 'react'
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
import { mockDb } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { IndianRupee, X, Plus, Calendar, Laptop, MapPin, Briefcase, FileText, AlertCircle, Sparkles, Loader2, TrendingUp, Lightbulb } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { LocationInput } from '@/components/ui/location-input'
import { JOB_CATEGORIES_V2, getRoleSkills, isRoleTechnical, inferJobNature } from '@/lib/roleSkills'
import type { JobMode, JobNature } from '@/lib/types'
import { generateJobDescription, estimateSalary, type GeneratedJobContent, type SalaryEstimate } from '@/lib/gemini'

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
  const [aiGenerating, setAiGenerating] = useState(false)
  const [salaryEstimate, setSalaryEstimate] = useState<SalaryEstimate | null>(null)
  const [estimatingPay, setEstimatingPay] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)

  const [formData, setFormData] = useState({
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
    jobMode: 'local' as JobMode,
    jobNature: 'non-technical' as JobNature,
  })

  // Derive role-based skills when category changes
  const roleSkills = useMemo(() => getRoleSkills(formData.category), [formData.category])
  const isTechnical = useMemo(() => isRoleTechnical(formData.category), [formData.category])

  // When category changes, auto-set job nature and reset skills
  const handleAIGenerate = async () => {
    if (!formData.title) {
      toast({ title: 'Enter a Title First', description: 'AI needs at least the job title to generate content.', variant: 'destructive' })
      return
    }
    setAiGenerating(true)
    try {
      const result = await generateJobDescription(
        formData.title,
        formData.category || 'General',
        formData.location,
        formData.jobMode,
        formData.experienceRequired,
        formData.duration,
      )
      setFormData(prev => ({
        ...prev,
        description: result.description,
        requirements: result.requirements,
        benefits: result.benefits,
        payType: result.suggestedPay.type,
        payAmount: String(result.suggestedPay.min),
      }))
      // Add suggested skills that aren't already selected
      const newSkills = result.suggestedSkills.filter(s => !selectedSkills.includes(s))
      if (newSkills.length > 0) {
        setSelectedSkills(prev => [...prev, ...newSkills])
      }
      setAiApplied(true)
      toast({ title: '✨ AI Generated!', description: 'Job description, requirements, benefits, and skills have been filled. Review and adjust as needed.' })
    } catch {
      toast({ title: 'AI Error', description: 'Could not generate content. Please try again.', variant: 'destructive' })
    } finally {
      setAiGenerating(false)
    }
  }

  const handleEstimatePay = async () => {
    if (!formData.title && !formData.category) {
      toast({ title: 'Add Job Details', description: 'Enter title or category first for salary estimation.', variant: 'destructive' })
      return
    }
    setEstimatingPay(true)
    try {
      const result = await estimateSalary(
        formData.title,
        formData.category || 'General',
        formData.location,
        formData.experienceRequired,
        selectedSkills,
      )
      setSalaryEstimate(result)
      toast({ title: '💰 Pay Estimated', description: `Suggested: ₹${result.minPay}-${result.maxPay}/${result.payType === 'hourly' ? 'hr' : 'fixed'}` })
    } catch {
      toast({ title: 'Error', description: 'Could not estimate pay.', variant: 'destructive' })
    } finally {
      setEstimatingPay(false)
    }
  }

  const handleCategoryChange = (value: string) => {
    const nature = inferJobNature(value)
    setFormData({ ...formData, category: value, jobNature: nature })
    // Reset skills when category changes (user can re-select)
    setSelectedSkills([])
  }

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
        const allJobs = await mockDb.getAllJobs()
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

      const newJob = await mockDb.createJob({
        ...formData,
        employerId: user.id,
        requiredSkills: selectedSkills,
        payAmount: parseFloat(formData.payAmount),
        jobMode: formData.jobMode,
        jobNature: formData.jobNature,
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
    <div className="min-h-screen bg-background">
      <EmployerNav />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Post a New Job</h1>
          <p className="text-muted-foreground">Fill in the details to find the perfect match for your job</p>
        </div>

        {/* AI Smart Assistant Banner */}
        <Card className="mb-6 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Smart Job Posting</h3>
                  <p className="text-sm text-muted-foreground">Enter a job title and let AI write the perfect description, requirements, and suggest fair pay</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAIGenerate}
                disabled={aiGenerating}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {aiGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Auto-Fill with AI</>}
              </Button>
            </div>
            {aiApplied && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <Lightbulb className="h-4 w-4" />
                AI has filled the form. Review each section and adjust to your needs.
              </div>
            )}
          </CardContent>
        </Card>

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

              {/* Job Mode: Remote vs Local */}
              <div className="space-y-2">
                <Label>Job Mode *</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.jobMode === 'local' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setFormData({ ...formData, jobMode: 'local' })}
                  >
                    <MapPin className="h-4 w-4" />
                    On-site / Local
                  </Button>
                  <Button
                    type="button"
                    variant={formData.jobMode === 'remote' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => setFormData({ ...formData, jobMode: 'remote' })}
                  >
                    <Laptop className="h-4 w-4" />
                    Remote
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_non_tech_header" disabled>── Non-Technical ──</SelectItem>
                      {JOB_CATEGORIES_V2.filter(c => !isRoleTechnical(c) && c !== 'Other').map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="_tech_header" disabled>── Technical ──</SelectItem>
                      {JOB_CATEGORIES_V2.filter(c => isRoleTechnical(c)).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <LocationInput
                    id="location"
                    value={formData.location}
                    onChange={(val, latLng) => setFormData({ ...formData, location: val, locationLat: latLng?.lat, locationLng: latLng?.lng })}
                    placeholder="City, Area"
                    required
                  />
                </div>
              </div>

              {/* Job Nature indicator */}
              {formData.category && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
                  isTechnical
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                }`}>
                  {isTechnical ? (
                    <>
                      <FileText className="h-4 w-4 shrink-0" />
                      <span><strong>Technical Job</strong> — Workers will be asked to upload a resume when applying.</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4 shrink-0" />
                      <span><strong>Non-Technical Job</strong> — No resume required for applicants.</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>
                {formData.category
                  ? `Showing skills relevant to ${formData.category}. Add custom skills below.`
                  : 'Select a category first to see relevant skills, or add custom skills.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.category && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please select a job category above to see role-specific skills.</span>
                </div>
              )}

              {roleSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {roleSkills.map((skill) => (
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
              )}

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payAmount">
                      {formData.payType === 'hourly' ? 'Rate per Hour' : 'Fixed Amount'} (₹) *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                      onClick={handleEstimatePay}
                      disabled={estimatingPay}
                    >
                      {estimatingPay ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
                      AI Suggest Pay
                    </Button>
                  </div>
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
                  {salaryEstimate && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm space-y-1">
                      <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                        <TrendingUp className="h-4 w-4" />
                        Market Rate: ₹{salaryEstimate.minPay} – ₹{salaryEstimate.maxPay}/{salaryEstimate.payType === 'hourly' ? 'hr' : 'fixed'}
                      </div>
                      <p className="text-muted-foreground">{salaryEstimate.reasoning}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Confidence: {salaryEstimate.confidence}</Badge>
                        <Badge variant="outline" className="text-xs">Trend: {salaryEstimate.marketTrend}</Badge>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFormData({ ...formData, payAmount: String(salaryEstimate.minPay), payType: salaryEstimate.payType })}>
                          Use ₹{salaryEstimate.minPay}
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFormData({ ...formData, payAmount: String(salaryEstimate.avgPay), payType: salaryEstimate.payType })}>
                          Use ₹{salaryEstimate.avgPay} (avg)
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFormData({ ...formData, payAmount: String(salaryEstimate.maxPay), payType: salaryEstimate.payType })}>
                          Use ₹{salaryEstimate.maxPay}
                        </Button>
                      </div>
                    </div>
                  )}
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
