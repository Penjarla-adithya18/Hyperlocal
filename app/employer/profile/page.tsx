'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { mockUserOps } from '@/lib/api'
import { verifyGSTIN, validateGSTINFormat } from '@/lib/gstinService'
import { Building2, Mail, Phone, MapPin, Globe, CheckCircle2, XCircle, Shield, Loader2, AlertTriangle, User } from 'lucide-react'
import type { GSTINDetails } from '@/lib/types'

export default function EmployerProfilePage() {
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Profile form
  const [formData, setFormData] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    companyName: user?.companyName ?? '',
    companyAddress: user?.companyAddress ?? '',
    companyWebsite: user?.companyWebsite ?? '',
    companyDescription: user?.companyDescription ?? '',
    gstin: user?.gstin ?? '',
  })

  // GSTIN verification state
  const [gstinLoading, setGstinLoading] = useState(false)
  const [gstinDetails, setGstinDetails] = useState<GSTINDetails | null>(user?.gstinDetails ?? null)
  const [gstinVerified, setGstinVerified] = useState(user?.gstinVerified ?? false)
  const [gstinError, setGstinError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'employer') router.replace('/login')
  }, [user, router])

  if (!user || user.role !== 'employer') return null

  // Trust level colors
  const trustColors: Record<string, string> = {
    basic: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    trusted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  }

  const handleVerifyGSTIN = async () => {
    const trimmed = formData.gstin.trim().toUpperCase()
    if (!trimmed) return

    // Format validation first
    const formatError = validateGSTINFormat(trimmed)
    if (formatError) {
      setGstinError(formatError)
      return
    }

    setGstinLoading(true)
    setGstinError(null)
    try {
      const details = await verifyGSTIN(trimmed)
      setGstinDetails(details)
      setGstinVerified(true)
      setGstinError(null)
      // Auto-fill company info from GSTIN
      setFormData(prev => ({
        ...prev,
        gstin: trimmed,
        companyName: details.legalName,
        companyAddress: details.address || prev.companyAddress,
      }))
      toast({ title: 'GSTIN Verified!', description: `${details.legalName} — ${details.status}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setGstinError(msg)
      setGstinVerified(false)
      setGstinDetails(null)
    } finally {
      setGstinLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updated = await mockUserOps.update(user.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        companyAddress: formData.companyAddress.trim(),
        companyWebsite: formData.companyWebsite.trim(),
        companyDescription: formData.companyDescription.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        gstinVerified,
        gstinDetails: gstinDetails || undefined,
      })
      if (updated) {
        updateUser(updated)
        toast({ title: 'Profile updated successfully!' })
      } else {
        toast({ title: 'Update failed', description: 'No data returned', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Update failed', description: 'Please try again', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-surface">
      <EmployerNav />
      
      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Company Profile
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your business information and verification status
          </p>
        </div>

        {/* Trust Level Badge */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Trust Level</p>
                  <Badge className={`mt-1 ${trustColors[user.trustLevel || 'basic']}`}>
                    {(user.trustLevel || 'basic').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">{user.id.slice(0, 8)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSaveProfile}>
          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phoneNumber}
                      disabled
                      className="pl-10 bg-muted cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Change phone in <a href="/settings" className="text-primary hover:underline">Settings</a>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    placeholder="your@company.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Business details visible to workers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="ABC Services Pvt. Ltd."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    placeholder="Street, City, State, PIN"
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description</Label>
                <Textarea
                  id="companyDescription"
                  value={formData.companyDescription}
                  onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                  placeholder="Brief description of your business (what you do, industry, team size...)"
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* GSTIN Verification */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                GSTIN Verification
              </CardTitle>
              <CardDescription>
                Verify your business to unlock higher trust level and more job posting slots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (GST Identification Number)</Label>
                <div className="flex gap-2">
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="22AAAAA0000A1Z5"
                    className="font-mono"
                    maxLength={15}
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyGSTIN}
                    disabled={gstinLoading || !formData.gstin.trim() || gstinVerified}
                    className="shrink-0"
                  >
                    {gstinLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</>
                    ) : gstinVerified ? (
                      <><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                {gstinError && (
                  <div className="flex items-start gap-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{gstinError}</span>
                  </div>
                )}
                {gstinVerified && gstinDetails && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                      <CheckCircle2 className="h-5 w-5" />
                      GSTIN Verified Successfully
                    </div>
                    <Separator className="bg-green-200 dark:bg-green-800" />
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Legal Name:</span> <span className="font-medium">{gstinDetails.legalName}</span></p>
                      <p><span className="text-muted-foreground">Trade Name:</span> {gstinDetails.tradeName || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="ml-1">{gstinDetails.status}</Badge></p>
                      <p><span className="text-muted-foreground">Type:</span> {gstinDetails.taxpayerType}</p>
                      <p className="text-xs text-muted-foreground mt-2">Registered: {gstinDetails.registeredDate || 'N/A'}</p>
                    </div>
                  </div>
                )}
                {!gstinVerified && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600" />
                    <span>
                      GSTIN verification increases trust and allows posting more jobs. Format: 2 digits (state) + 10 digits (PAN) + 1 letter + 1 digit + 1 letter/digit
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/employer/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
