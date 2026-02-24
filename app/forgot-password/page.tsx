'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, ArrowLeft, KeyRound, Loader2 } from 'lucide-react'
import { sendOTP, verifyOTP, forgotPassword } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [displayOtp, setDisplayOtp] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      toast({ title: 'Enter a valid 10-digit phone number', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await sendOTP(phone)
      if (res.success) {
        setDisplayOtp(res.otp ?? null)
        setStep(2)
        toast({ title: 'OTP generated', description: 'Your OTP is shown below.' })
      } else {
        toast({ title: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to generate OTP. Try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await verifyOTP(phone, otp)
      if (res.success) {
        setStep(3)
        setDisplayOtp(null)
        toast({ title: 'Phone verified', description: 'Now set your new password.' })
      } else {
        toast({ title: res.message || 'Invalid OTP', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Verification failed. Try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await forgotPassword(phone, newPassword)
      if (res.success) {
        toast({ title: 'Password reset!', description: 'You can now log in with your new password.' })
        router.push('/login')
      } else {
        toast({ title: res.message || 'Reset failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Something went wrong. Try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <Card className="p-8 border-2">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">HyperLocal Jobs</span>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-2 rounded-full transition-all ${step >= s ? 'w-10 bg-primary' : 'w-4 bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-1">Forgot Password</h1>
                <p className="text-sm text-muted-foreground">Enter your registered phone number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-phone">Phone Number</Label>
                <Input
                  id="fp-phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
              <Button onClick={handleSendOtp} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating OTP...</> : 'Get OTP'}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-1">Verify OTP</h1>
                <p className="text-sm text-muted-foreground">Enter the OTP shown below</p>
              </div>

              {displayOtp && (
                <div className="flex items-center gap-3 rounded-lg border-2 border-green-400 bg-green-50 dark:bg-green-950/30 px-4 py-3">
                  <KeyRound className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">Your OTP (demo mode)</p>
                    <p className="text-2xl font-bold tracking-widest text-green-800 dark:text-green-300">{displayOtp}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fp-otp">Enter OTP</Label>
                <Input
                  id="fp-otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify OTP'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setStep(1); setDisplayOtp(null); setOtp('') }} className="w-full">
                Change Phone Number
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-1">Set New Password</h1>
                <p className="text-sm text-muted-foreground">Minimum 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-newpw">New Password</Label>
                <Input id="fp-newpw" type="password" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-confirmpw">Confirm Password</Label>
                <Input id="fp-confirmpw" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleResetPassword} disabled={loading} className="w-full">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : 'Reset Password'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
