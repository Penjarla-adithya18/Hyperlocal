'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { resetPassword, logout, sendOTP, verifyOTP } from '@/lib/auth'
import { loginUser, mockUserOps } from '@/lib/api'
import WorkerNav from '@/components/worker/WorkerNav'
import EmployerNav from '@/components/employer/EmployerNav'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Shield, Lock, Phone, LogOut, Star, AlertTriangle, KeyRound, Globe, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'
import { localeLabels, localeNames, locales, SupportedLocale } from '@/i18n'
import { verifyGSTIN, validateGSTINFormat } from '@/lib/gstinService'
import type { GSTINDetails } from '@/lib/types'

export default function SettingsPage() {
  const { user, updateUser, login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { t, locale, setLocale } = useI18n()

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  // Update phone form
  const [phoneForm, setPhoneForm] = useState({ phone: user?.phoneNumber ?? '', otp: '' })
  const [otpSent, setOtpSent] = useState(false)
  const [displayOtp, setDisplayOtp] = useState<string | null>(null)
  const [phoneLoading, setPhoneLoading] = useState(false)

  // GSTIN verification (employer only)
  const [gstinInput, setGstinInput] = useState(user?.gstin ?? '')
  const [gstinLoading, setGstinLoading] = useState(false)
  const [gstinDetails, setGstinDetails] = useState<GSTINDetails | null>(user?.gstinDetails ?? null)
  const [gstinVerified, setGstinVerified] = useState(user?.gstinVerified ?? false)
  const [gstinError, setGstinError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  if (!user) return null

  const NavComponent =
    user.role === 'worker'
      ? WorkerNav
      : user.role === 'employer'
      ? EmployerNav
      : AdminNav

  // ── Trust level colors ──────────────────────────────────────
  const trustColors: Record<string, string> = {
    basic: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-700',
    trusted: 'bg-green-100 text-green-700',
  }

  // ── Change Password ──────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (pwForm.newPw.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    setPwLoading(true)
    try {
      const result = await resetPassword(pwForm.current, pwForm.newPw)
      if (result.success) {
        // Re-login immediately so the new token replaces the old one
        // This prevents the old token from being invalidated causing data loss
        try {
          const loginResult = await loginUser(user!.phoneNumber, pwForm.newPw)
          if (loginResult.success && loginResult.user) {
            login(loginResult.user)
          }
        } catch { /* best-effort */ }
        toast({ title: 'Password updated successfully' })
        setPwForm({ current: '', newPw: '', confirm: '' })
      } else {
        toast({ title: result.message, variant: 'destructive' })
      }
    } finally {
      setPwLoading(false)
    }
  }

  // ── Update Phone ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phoneForm.phone.match(/^[6-9]\d{9}$/)) {
      toast({ title: 'Enter a valid 10-digit Indian mobile number', variant: 'destructive' })
      return
    }
    setPhoneLoading(true)
    try {
      const res = await sendOTP(phoneForm.phone)
      if (res.success) {
        setOtpSent(true)
        setDisplayOtp(res.otp ?? null)
        toast({ title: 'OTP generated', description: 'Your OTP is shown on screen.' })
      } else {
        toast({ title: res.message ?? 'Failed to generate OTP', variant: 'destructive' })
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyAndUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneLoading(true)
    try {
      const verifyData = await verifyOTP(phoneForm.phone, phoneForm.otp)
      if (!verifyData.success) {
        toast({ title: verifyData.message ?? 'Invalid OTP', variant: 'destructive' })
        return
      }

      // Update phone via users edge function
      const result = await mockUserOps.update(user.id, { phoneNumber: phoneForm.phone })
      if (result) {
        updateUser({ phoneNumber: phoneForm.phone })
        toast({ title: 'Phone number updated' })
        setOtpSent(false)
        setDisplayOtp(null)
        setPhoneForm((prev) => ({ ...prev, otp: '' }))
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  // ── GSTIN Verification (Employer) ──────────────────────────────
  const handleVerifyGSTIN = async () => {
    const formatErr = validateGSTINFormat(gstinInput)
    if (formatErr) {
      setGstinError(formatErr)
      return
    }
    setGstinLoading(true)
    setGstinError(null)
    try {
      const details = await verifyGSTIN(gstinInput.trim().toUpperCase())
      setGstinDetails(details)
      setGstinVerified(details.verified)
      // Save GSTIN to user profile
      const updated = await mockUserOps.update(user.id, {
        gstin: gstinInput.trim().toUpperCase(),
        gstinVerified: details.verified,
        gstinDetails: details,
      })
      if (updated) {
        updateUser({
          gstin: gstinInput.trim().toUpperCase(),
          gstinVerified: details.verified,
          gstinDetails: details,
        })
      }
      toast({
        title: details.verified ? 'GSTIN Verified Successfully' : 'GSTIN Found (Inactive)',
        description: details.verified
          ? `Business: ${details.tradeName || details.legalName}`
          : `Status: ${details.status}. This GSTIN is not currently active.`,
        variant: details.verified ? 'default' : 'destructive',
      })
    } catch (err) {
      setGstinError(err instanceof Error ? err.message : 'Verification failed')
      setGstinDetails(null)
      setGstinVerified(false)
      toast({ title: 'GSTIN Verification Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setGstinLoading(false)
    }
  }

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="app-surface">
      <NavComponent />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>

        {/* ── Language & Region ────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Language & Region
            </CardTitle>
            <CardDescription>Choose your preferred display language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(locales as readonly SupportedLocale[]).map((code) => {
                const [flag, ...rest] = localeLabels[code].split(' ')
                return (
                  <button
                    key={code}
                    onClick={() => setLocale(code)}
                    className={[
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:border-primary focus:outline-none',
                      locale === code
                        ? 'border-primary bg-primary/5'
                        : 'border-border',
                    ].join(' ')}
                  >
                    <span className="text-3xl">{flag}</span>
                    <span className={`text-sm font-medium ${locale === code ? 'text-primary' : ''}`}>
                      {localeNames[code]}
                    </span>
                    <span className="text-xs text-muted-foreground">{rest.join(' ')}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Trust Score Card ─────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Trust & Reputation
            </CardTitle>
            <CardDescription>Your current standing on the platform</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-400" />
              <div>
                <p className="text-3xl font-bold">{Math.round(user.trustScore ?? 50)}</p>
                <p className="text-xs text-muted-foreground">Trust Score</p>
              </div>
            </div>
            <Badge
              className={`capitalize text-sm px-3 py-1 ${
                trustColors[user.trustLevel ?? 'basic']
              }`}
            >
              {user.trustLevel ?? 'basic'}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Complete more jobs and maintain good ratings to level up.
            </p>
          </CardContent>
        </Card>

        {/* ── GSTIN Verification (Employer Only) ──────────── */}
        {user.role === 'employer' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                GSTIN Verification
              </CardTitle>
              <CardDescription>
                Verify your business GSTIN to build trust with workers. Uses{' '}
                <a href="https://cleartax.in/f/compliance-report/" target="_blank" rel="noopener noreferrer" className="text-primary underline">ClearTax</a> for verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gstinVerified && gstinDetails ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border-2 border-green-400 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">GSTIN Verified</p>
                      <p className="text-xs text-green-700 dark:text-green-400">{user.gstin}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Trade Name</p>
                      <p className="font-medium">{gstinDetails.tradeName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Legal Name</p>
                      <p className="font-medium">{gstinDetails.legalName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <p className="font-medium">{gstinDetails.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Taxpayer Type</p>
                      <p className="font-medium">{gstinDetails.taxpayerType}</p>
                    </div>
                    {gstinDetails.address && (
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground text-xs">Address</p>
                        <p className="font-medium">{gstinDetails.address}</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGstinVerified(false)
                      setGstinDetails(null)
                    }}
                  >
                    Re-verify / Change GSTIN
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="gstin-input">GSTIN Number</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="gstin-input"
                        placeholder="29ABCDE1234F1Z5"
                        maxLength={15}
                        value={gstinInput}
                        onChange={(e) => {
                          setGstinInput(e.target.value.toUpperCase())
                          setGstinError(null)
                        }}
                        className={gstinError ? 'border-destructive' : ''}
                      />
                      <Button onClick={handleVerifyGSTIN} disabled={gstinLoading || !gstinInput.trim()}>
                        {gstinLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying…
                          </>
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </div>
                    {gstinError && (
                      <div className="flex items-center gap-1.5 mt-2 text-destructive text-sm">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {gstinError}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your 15-character GSTIN (e.g., 29ABCDE1234F1Z5)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Change Password ───────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t('settings.changePw')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="current-pw">{t('settings.currentPw')}</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new-pw">{t('settings.newPw')}</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={pwForm.newPw}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="confirm-pw">{t('settings.confirmPw')}</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? t('settings.updatingPw') || 'Updating…' : t('settings.updatePw')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Update Phone ──────────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Update Phone Number
            </CardTitle>
            <CardDescription>
              An OTP will be displayed on screen to verify your new number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyAndUpdatePhone} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="phone">Mobile Number (10 digits)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    value={phoneForm.phone}
                    onChange={(e) => setPhoneForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={phoneLoading}
                  >
                    {otpSent ? 'Resend OTP' : 'Send OTP'}
                  </Button>
                </div>
              </div>

              {otpSent && (
                <div>
                  {displayOtp && (
                    <div className="flex items-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 dark:bg-green-950/30 px-4 py-3 mb-3">
                      <KeyRound className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">Your OTP (demo mode)</p>
                        <p className="text-2xl font-bold tracking-widest text-green-800 dark:text-green-300">{displayOtp}</p>
                      </div>
                    </div>
                  )}
                  <Label htmlFor="otp">Enter OTP (6 digits)</Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={phoneForm.otp}
                    onChange={(e) => setPhoneForm((p) => ({ ...p, otp: e.target.value }))}
                    placeholder="123456"
                    required
                  />
                </div>
              )}

              {otpSent && (
                <Button type="submit" disabled={phoneLoading}>
                  {phoneLoading ? 'Verifying…' : 'Verify & Update'}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Danger Zone ───────────────────────────────────── */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('settings.signOut')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
