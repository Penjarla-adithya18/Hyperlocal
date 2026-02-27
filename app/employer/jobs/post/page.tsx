'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { IndianRupee, X, Plus, Calendar, MapPin, Laptop, Sparkles, Loader2, TrendingUp, Wand2 } from 'lucide-react'
import { JOB_CATEGORIES } from '@/lib/aiMatching'
import { Checkbox } from '@/components/ui/checkbox'
import { LocationInput } from '@/components/ui/location-input'
import type { JobMode } from '@/lib/types'
import { generateJobDescription, estimateSalary } from '@/lib/gemini'
import type { GeneratedJobContent, SalaryEstimate } from '@/lib/gemini'

// ── Category → Skills mapping ────────────────────────────────────────────────
const CATEGORY_SKILLS: Record<string, string[]> = {
  'Hospitality':       ['Customer Service', 'Communication', 'Housekeeping', 'Food Service', 'Teamwork'],
  'Cooking':           ['Cook', 'Food Preparation', 'Kitchen Management', 'Hygiene', 'Recipe Knowledge'],
  'Cleaning':          ['Cleaner', 'Housekeeping', 'Mopping', 'Attention to Detail', 'Time Management'],
  'Delivery':          ['Delivery', 'Navigation', 'Driving', 'Time Management', 'Customer Service'],
  'Driving':           ['Driver', 'Navigation', 'Vehicle Maintenance', 'Licence', 'Time Management'],
  'Sales':             ['Sales', 'Communication', 'Negotiation', 'Customer Relations', 'Target Achievement'],
  'Retail':            ['Sales', 'Customer Service', 'Inventory Management', 'Billing', 'Product Knowledge'],
  'Construction':      ['Mason', 'Labourer', 'Heavy Lifting', 'Safety', 'Teamwork'],
  'Carpentry':         ['Carpenter', 'Woodwork', 'Tool Handling', 'Measurement', 'Furniture Making'],
  'Plumbing':          ['Plumber', 'Pipe Fitting', 'Maintenance', 'Problem Solving', 'Leak Repair'],
  'Electrical':        ['Electrician', 'Wiring', 'Troubleshooting', 'Safety', 'Circuit Design'],
  'Painting':          ['Painter', 'Color Mixing', 'Surface Preparation', 'Wall Finishing', 'Spray Painting'],
  'Mechanical':        ['Mechanic', 'Vehicle Repair', 'Tool Handling', 'Engine Work', 'Diagnostics'],
  'Security':          ['Security Guard', 'Surveillance', 'Safety', 'Communication', 'First Aid'],
  'Gardening':         ['Gardener', 'Landscaping', 'Plant Care', 'Lawn Maintenance', 'Pruning'],
  'Teaching':          ['Teaching', 'Communication', 'Patience', 'Subject Knowledge', 'Classroom Management'],
  'Office Work':       ['Data Entry', 'MS Office', 'Filing', 'Communication', 'Organization'],
  'Data Entry':        ['Data Entry', 'Typing Speed', 'MS Excel', 'Accuracy', 'Computer Skills'],
  'Customer Service':  ['Customer Service', 'Communication', 'Problem Solving', 'Patience', 'CRM'],
  'Healthcare':        ['Patient Care', 'First Aid', 'Hygiene', 'Communication', 'Empathy'],
  'Beauty & Wellness': ['Hair Styling', 'Skin Care', 'Makeup', 'Customer Service', 'Hygiene'],
  'IT & Tech Support': ['Computer Skills', 'Troubleshooting', 'Networking', 'Software Installation', 'Communication'],
  'Photography':       ['Photography', 'Photo Editing', 'Lighting', 'Camera Handling', 'Creativity'],
  'Event Management':  ['Event Planning', 'Coordination', 'Communication', 'Vendor Management', 'Decoration'],
}

// Title keyword → additional skills (for more granular suggestions)
const TITLE_KEYWORD_SKILLS: Record<string, string[]> = {
  plumber:     ['Plumber', 'Pipe Fitting', 'Leak Repair'],
  electrician: ['Electrician', 'Wiring', 'Safety'],
  carpenter:   ['Carpenter', 'Woodwork', 'Tool Handling'],
  driver:      ['Driver', 'Navigation', 'Vehicle Maintenance'],
  cook:        ['Cook', 'Food Preparation', 'Hygiene'],
  chef:        ['Cook', 'Kitchen Management', 'Menu Planning'],
  waiter:      ['Customer Service', 'Food Service', 'Communication'],
  delivery:    ['Delivery', 'Navigation', 'Time Management'],
  mechanic:    ['Mechanic', 'Vehicle Repair', 'Diagnostics'],
  painter:     ['Painter', 'Surface Preparation', 'Wall Finishing'],
  security:    ['Security Guard', 'Surveillance', 'First Aid'],
  gardener:    ['Gardener', 'Landscaping', 'Plant Care'],
  teacher:     ['Teaching', 'Communication', 'Patience'],
  tutor:       ['Teaching', 'Subject Knowledge', 'Patience'],
  cleaner:     ['Cleaner', 'Housekeeping', 'Attention to Detail'],
  maid:        ['Cleaner', 'Housekeeping', 'Cooking'],
  receptionist:['Customer Service', 'Communication', 'Computer Skills'],
  accountant:  ['Accounting', 'MS Excel', 'Tally', 'GST Knowledge'],
  welder:      ['Welder', 'Metal Work', 'Safety', 'Blueprint Reading'],
  mason:       ['Mason', 'Brick Laying', 'Plastering', 'Construction'],
  ac:          ['AC Repair', 'Troubleshooting', 'Installation'],
  repair:      ['Troubleshooting', 'Tool Handling', 'Maintenance'],
  salon:       ['Hair Styling', 'Skin Care', 'Customer Service'],
  barber:      ['Hair Cutting', 'Shaving', 'Customer Service'],
  nurse:       ['Patient Care', 'First Aid', 'Medication'],
  helper:      ['Labourer', 'Heavy Lifting', 'Teamwork'],
  data:        ['Data Entry', 'Typing Speed', 'Computer Skills'],
  sales:       ['Sales', 'Communication', 'Negotiation'],
  photography: ['Photography', 'Photo Editing', 'Camera Handling'],
}

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
  const [aiGenerating, setAiGenerating] = useState(false)
  const [salaryEstimating, setSalaryEstimating] = useState(false)
  const [salaryEstimate, setSalaryEstimate] = useState<SalaryEstimate | null>(null)
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([])

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
    escrowRequired: true,
    jobMode: 'local' as JobMode,
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

  // ── Auto-suggest skills based on category + title ──────────────────────────
  useEffect(() => {
    const suggestions = new Set<string>()

    // From category mapping
    if (formData.category && CATEGORY_SKILLS[formData.category]) {
      CATEGORY_SKILLS[formData.category].forEach(s => suggestions.add(s))
    }

    // From title keywords
    const titleLower = formData.title.toLowerCase()
    for (const [keyword, skills] of Object.entries(TITLE_KEYWORD_SKILLS)) {
      if (titleLower.includes(keyword)) {
        skills.forEach(s => suggestions.add(s))
      }
    }

    // Filter out already-selected skills
    const filtered = Array.from(suggestions).filter(s => !selectedSkills.includes(s))
    setSuggestedSkills(filtered)
  }, [formData.category, formData.title, selectedSkills])

  const handleAcceptAllSuggestions = useCallback(() => {
    const newSkills = [...new Set([...selectedSkills, ...suggestedSkills])]
    setSelectedSkills(newSkills)
  }, [selectedSkills, suggestedSkills])

  const handleAIAutoFill = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Enter a job title first', description: 'AI needs at least a title to generate content', variant: 'destructive' })
      return
    }
    setAiGenerating(true)
    try {
      const result = await generateJobDescription(
        formData.title,
        formData.category || 'General',
        formData.location || '',
        formData.jobMode,
        formData.experienceRequired,
        formData.duration || '',
      )
      setFormData(prev => ({
        ...prev,
        description: result.description,
        requirements: result.requirements,
        benefits: result.benefits,
      }))
      if (result.suggestedSkills) {
        const newSkills = [...new Set([...selectedSkills, ...result.suggestedSkills])]
        setSelectedSkills(newSkills)
      }
      if (result.suggestedPay) {
        setFormData(prev => ({
          ...prev,
          payAmount: String(result.suggestedPay.max),
          payType: result.suggestedPay.type,
        }))
      }
      toast({ title: 'AI Auto-Fill Complete', description: 'Review and edit the generated content as needed' })
    } catch {
      toast({ title: 'AI generation failed', description: 'Please fill in the details manually', variant: 'destructive' })
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSalaryEstimate = async () => {
    if (!formData.title.trim() || !formData.category) {
      toast({ title: 'Enter title and category first', variant: 'destructive' })
      return
    }
    setSalaryEstimating(true)
    try {
      const estimate = await estimateSalary(
        formData.title,
        formData.category,
        formData.location || '',
        formData.experienceRequired,
        selectedSkills,
      )
      setSalaryEstimate(estimate)
      toast({ title: 'Salary estimate ready', description: estimate.reasoning })
    } catch {
      toast({ title: 'Estimation failed', variant: 'destructive' })
    } finally {
      setSalaryEstimating(false)
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Job Title *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAIAutoFill}
                    disabled={aiGenerating || !formData.title.trim()}
                    className="gap-1.5"
                  >
                    {aiGenerating ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" /> Auto-Fill with AI</>
                    )}
                  </Button>
                </div>
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

              {/* Job Mode Toggle */}
              <div className="space-y-2">
                <Label>Work Mode *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jobMode: 'local' })}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.jobMode === 'local'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    On-site
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jobMode: 'remote' })}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.jobMode === 'remote'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Laptop className="h-4 w-4" />
                    Remote
                  </button>
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
              {/* AI Suggested Skills based on title/category */}
              {suggestedSkills.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Wand2 className="h-3.5 w-3.5 text-primary" />
                      Suggested Skills
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        (based on {formData.category || 'title'})
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleAcceptAllSuggestions}
                    >
                      <Plus className="h-3 w-3" />
                      Add All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 border-primary/30 text-primary transition-colors"
                        onClick={() => handleAddSkill(skill)}
                      >
                        <Plus className="h-2.5 w-2.5 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payAmount">
                      {formData.payType === 'hourly' ? 'Rate per Hour' : 'Fixed Amount'} (₹) *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSalaryEstimate}
                      disabled={salaryEstimating}
                      className="gap-1 text-xs h-7"
                    >
                      {salaryEstimating ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Estimating…</>
                      ) : (
                        <><TrendingUp className="h-3 w-3" /> AI Suggest Pay</>
                      )}
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
                    <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-3 space-y-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                        AI Market Estimate: ₹{salaryEstimate.minPay} – ₹{salaryEstimate.maxPay}/{salaryEstimate.payType === 'hourly' ? 'hr' : 'fixed'}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">{salaryEstimate.reasoning}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">
                          {salaryEstimate.confidence} confidence
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Market: {salaryEstimate.marketTrend}
                        </Badge>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0"
                          onClick={() => setFormData(prev => ({ ...prev, payAmount: String(salaryEstimate!.avgPay), payType: salaryEstimate!.payType }))}
                        >
                          Use ₹{salaryEstimate.avgPay}
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
