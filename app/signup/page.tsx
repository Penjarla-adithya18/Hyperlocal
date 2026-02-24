'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, User, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendOTP, verifyOTP, registerUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [role, setRole] = useState<'worker' | 'employer'>(
    (searchParams.get('role') as 'worker' | 'employer') || 'worker'
  );

  // Form state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    organizationName: '',
    otp: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'worker' || roleParam === 'employer') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSendOTP = async () => {
    if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await sendOTP(formData.phoneNumber);
      if (result.success) {
        setOtpSent(true);
        setDisplayOtp(result.otp ?? null);
        toast({
          title: 'OTP Generated',
          description: 'Your OTP is displayed on screen.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp || formData.otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(formData.phoneNumber, formData.otp);
      if (result.success) {
        setStep(2);
        toast({
          title: 'OTP Verified',
          description: 'Phone number verified successfully',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || formData.fullName.length < 3) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your full name (minimum 3 characters)',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (role === 'employer' && !formData.businessName) {
      toast({
        title: 'Business Name Required',
        description: 'Please enter your business or shop name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        role: role,
        businessName: formData.businessName,
        organizationName: formData.organizationName,
      });

      if (result.success && result.user) {
        login(result.user);
        toast({
          title: 'Registration Successful',
          description: `Welcome to HyperLocal Jobs!`,
        });

        // Redirect based on role
        if (role === 'worker') {
          router.push('/worker/dashboard');
        } else {
          router.push('/employer/dashboard');
        }
      } else {
        toast({
          title: 'Registration Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('auth.backHome')}
        </Link>

        <Card className="p-8 border-2">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">HyperLocal Jobs</span>
          </div>

          {/* Role Selection */}
          <Tabs value={role} onValueChange={(v) => setRole(v as 'worker' | 'employer')} className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="worker" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('auth.signup.workerTab')}
              </TabsTrigger>
              <TabsTrigger value="employer" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {t('auth.signup.employerTab')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {step === 1 ? (
            // Step 1: Phone Verification
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">{t('auth.signup.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {role === 'worker'
                    ? 'Find local jobs that match your skills'
                    : 'Post jobs and find skilled workers'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('auth.phoneLabel')}</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
                    }
                    disabled={otpSent}
                    maxLength={10}
                  />
                </div>

                {!otpSent ? (
                  <Button onClick={handleSendOTP} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('auth.signup.sending')}
                      </>
                    ) : (
                      t('auth.signup.sendOtp')
                    )}
                  </Button>
                ) : (
                  <>
                    {/* OTP display banner */}
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
                      <Label htmlFor="otp">{t('auth.signup.enterOtp')}</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={formData.otp}
                        onChange={(e) =>
                          setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                        maxLength={6}
                      />
                    </div>

                    <Button onClick={handleVerifyOTP} disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('auth.signup.verifying')}
                        </>
                      ) : (
                        t('auth.signup.verifyOtp')
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOtpSent(false);
                        setFormData({ ...formData, otp: '' });
                      }}
                      className="w-full"
                    >
                      Change Phone Number
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Step 2: Complete Registration
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
                <p className="text-sm text-muted-foreground">Just a few more details to get started</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.signup.fullName')} *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.signup.fullNamePh')}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                {role === 'employer' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessName">{t('auth.signup.businessName')} *</Label>
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="Enter your business name"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationName">{t('auth.signup.orgName')}</Label>
                      <Input
                        id="organizationName"
                        type="text"
                        placeholder="If applicable"
                        value={formData.organizationName}
                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.passwordLabel')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.signup.confirmPassword')} *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('auth.signup.creating')}
                  </>
                ) : (
                  t('auth.signup.createBtn')
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="w-full"
              >
                {t('common.back')}
              </Button>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('auth.signup.hasAccount')} </span>
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t('auth.signup.loginLink')}
            </Link>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupPageContent />
    </Suspense>
  );
}
