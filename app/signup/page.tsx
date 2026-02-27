'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Briefcase, Loader2, Phone, ShieldCheck, Lock, Building2, Store, CreditCard, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendOTP, verifyOTP, registerUser, setUserPassword } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { toast } = useToast();
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
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // PAN KYC state
  const [panNumber, setPanNumber] = useState('');
  const [panVerified, setPanVerified] = useState(false);
  const [panVerifying, setPanVerifying] = useState(false);
  const [panResult, setPanResult] = useState<{
    verified: boolean;
    panName?: string;
    nameMatch?: boolean;
    similarity?: number;
    message?: string;
  } | null>(null);

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
        toast({
          title: 'OTP Sent',
          description: result.message,
        });
      } else {
        toast({
          title: 'Failed to Send OTP',
          description: result.message || 'Unable to send OTP right now. Please try again.',
          variant: 'destructive',
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

  // ── PAN KYC Verification ──────────────────────────────────────────────
  const handleVerifyPAN = async () => {
    const pan = panNumber.toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      toast({
        title: 'Invalid PAN',
        description: 'Enter a valid 10-character PAN (e.g. ABCDE1234F)',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.fullName || formData.fullName.length < 3) {
      toast({
        title: 'Enter Name First',
        description: 'Please enter your full name before verifying PAN',
        variant: 'destructive',
      });
      return;
    }

    setPanVerifying(true);
    setPanResult(null);
    try {
      const res = await fetch('/api/kyc/verify-pan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan, fullName: formData.fullName }),
      });
      const data = await res.json();
      setPanResult(data);

      if (data.verified && data.nameMatch) {
        setPanVerified(true);
        toast({
          title: 'PAN Verified ✓',
          description: `Identity confirmed: ${data.panName}`,
        });
      } else if (data.verified && !data.nameMatch) {
        setPanVerified(false);
        toast({
          title: 'Name Mismatch',
          description: data.message || 'The name you entered does not match the PAN card.',
          variant: 'destructive',
        });
      } else {
        setPanVerified(false);
        toast({
          title: 'PAN Verification Failed',
          description: data.message || 'Could not verify PAN. Please check and try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      setPanVerified(false);
      toast({
        title: 'Error',
        description: 'PAN verification service unavailable. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setPanVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!agreeToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the Terms and Conditions to continue',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.fullName || formData.fullName.length < 3) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your full name (minimum 3 characters)',
        variant: 'destructive',
      });
      return;
    }

    if (!panVerified) {
      toast({
        title: 'PAN Verification Required',
        description: 'Please verify your PAN card to complete registration',
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
        // Attach PAN KYC data to user
        result.user.panNumber = panNumber.toUpperCase().trim();
        result.user.panVerified = true;
        result.user.panName = panResult?.panName ?? formData.fullName;
        result.user.panVerifiedAt = new Date().toISOString();
        result.user.isVerified = true;

        // Store password for mock auth
        setUserPassword(formData.phoneNumber, formData.password);

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
    <div suppressHydrationWarning className="flex min-h-screen items-start justify-center overflow-y-auto bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-100 p-3 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:items-center sm:p-4 md:p-6">
      <div suppressHydrationWarning className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-blue-50/95 shadow-2xl sm:rounded-3xl md:h-[90vh] md:flex-row md:overflow-hidden dark:border-slate-700 dark:bg-slate-900/90">
        <section suppressHydrationWarning className="relative hidden h-full w-full flex-col items-center justify-start bg-emerald-50 p-7 pt-16 text-slate-900 md:flex md:w-1/2 md:items-start md:p-10 md:pt-16 lg:w-5/12 lg:p-12 lg:pt-16 dark:bg-slate-900 dark:text-slate-100">
          <div className="absolute left-8 top-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-bl-none rounded-lg rounded-tr-none bg-gradient-to-r from-emerald-500 to-blue-500 text-xl font-bold text-white shadow-sm">
              H
            </div>
            <span className="text-lg font-bold tracking-wide">HyperLocal</span>
          </div>

          <div className="z-10 mt-4 max-w-md md:mt-0">
            <h1 className="mb-6 text-5xl font-bold leading-[1.05] text-slate-900 md:text-6xl dark:text-white">
              Join your <br />
              local <br />
              <span className="relative inline-block text-emerald-500 dark:text-emerald-400">
                workforce
                <svg className="absolute -bottom-1 left-0 -z-10 h-3 w-full text-blue-200 dark:text-blue-900/70" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="8" />
                </svg>
              </span>{' '}
              network.
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              Create your account to discover nearby opportunities, connect with trusted people,
              and grow in your community.
            </p>

            <div className="relative mt-8 hidden h-56 w-full md:block">
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-100 dark:bg-slate-800/80" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 dark:text-emerald-400">
                <Store className="h-[124px] w-[124px]" strokeWidth={2.1} />
              </div>
              <div className="absolute right-10 top-10 h-4 w-4 rounded-full bg-slate-700 opacity-20" />
              <div className="absolute bottom-12 left-12 h-6 w-6 rounded-full bg-emerald-400 opacity-40" />
              <div className="absolute right-4 top-1/2 h-3 w-3 rotate-45 bg-blue-500 opacity-30" />
            </div>
          </div>
        </section>

        <section suppressHydrationWarning className="relative z-20 flex w-full flex-col items-center justify-center bg-white p-5 pt-6 shadow-2xl sm:p-6 md:w-1/2 md:rounded-l-[2.5rem] md:p-10 md:shadow-none lg:w-7/12 lg:p-14 dark:bg-slate-950">
          <Link href="/" className="mb-4 inline-flex items-center self-start text-sm font-medium text-slate-500 transition-colors hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 md:absolute md:left-8 md:top-8 md:mb-0">
            ← Back to Home
          </Link>
          <div className="w-full max-w-sm space-y-6 sm:space-y-7">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sign up</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('worker')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  role === 'worker'
                    ? 'border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <User className="h-4 w-4" />
                Worker
              </button>
              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  role === 'employer'
                    ? 'border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Employer
              </button>
            </div>

            {step === 1 ? (
              <div className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {role === 'worker'
                    ? 'Verify your phone number to continue as a worker.'
                    : 'Verify your phone number to continue as an employer.'}
                </p>

                <div className="space-y-6">
                  <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="phoneNumber"
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      disabled={otpSent}
                      maxLength={10}
                      className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  {!otpSent ? (
                    <>
                      <button
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="group relative flex w-full transform justify-center rounded-xl border border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-emerald-600 hover:to-blue-600 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-100" />
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-5 w-5 text-emerald-100" />
                            SEND OTP
                          </>
                        )}
                      </button>

                      <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link className="font-medium text-emerald-500 transition-colors hover:text-blue-500" href="/login">
                          Log in
                        </Link>
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <ShieldCheck className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={formData.otp}
                          onChange={(e) =>
                            setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })
                          }
                          maxLength={6}
                          className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </div>

                      <button
                        onClick={handleVerifyOTP}
                        disabled={loading}
                        className="group relative flex w-full transform justify-center rounded-xl border border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-emerald-600 hover:to-blue-600 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-100" />
                            Verifying...
                          </>
                        ) : (
                          'VERIFY OTP'
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setFormData({ ...formData, otp: '' });
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Change Phone Number
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <p className="text-sm text-gray-500 dark:text-slate-400">Complete your profile to finish creating your account.</p>

                <div className="space-y-6">
                  <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>

                  {role === 'employer' && (
                    <>
                      <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Store className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          id="businessName"
                          type="text"
                          placeholder="Business / Shop Name"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                          required
                        />
                      </div>

                      <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Building2 className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          id="organizationName"
                          type="text"
                          placeholder="Organization Name (Optional)"
                          value={formData.organizationName}
                          onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                          className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </>
                  )}

                  {/* ── PAN Card KYC Verification ── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      <CreditCard className="h-3.5 w-3.5" />
                      PAN Card Verification (KYC)
                    </div>

                    <div className={`group relative border-b pb-3 ${
                      panVerified ? 'border-emerald-300 dark:border-emerald-700' : 'border-gray-200 dark:border-slate-700'
                    }`}>
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                        <CreditCard className={`h-5 w-5 transition-colors ${
                          panVerified ? 'text-emerald-500' : 'text-gray-400 group-focus-within:text-emerald-500'
                        }`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="panNumber"
                          type="text"
                          placeholder="PAN Number (e.g. ABCDE1234F)"
                          value={panNumber}
                          onChange={(e) => {
                            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                            setPanNumber(v);
                            if (panVerified) { setPanVerified(false); setPanResult(null); }
                          }}
                          disabled={panVerified}
                          maxLength={10}
                          className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                        {panVerified && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mr-1" />
                        )}
                      </div>
                    </div>

                    {!panVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyPAN}
                        disabled={panVerifying || panNumber.length !== 10 || !formData.fullName}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                      >
                        {panVerifying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verifying PAN...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Verify PAN Card
                          </>
                        )}
                      </button>
                    )}

                    {/* PAN result feedback */}
                    {panResult && (
                      <div className={`rounded-xl border p-3 text-sm ${
                        panResult.verified && panResult.nameMatch
                          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : panResult.verified && !panResult.nameMatch
                            ? 'border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'border-red-200 bg-red-50/80 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        <div className="flex items-start gap-2">
                          {panResult.verified && panResult.nameMatch ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                          ) : panResult.verified && !panResult.nameMatch ? (
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                          ) : (
                            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{panResult.message}</p>
                            {panResult.panName && (
                              <p className="text-xs mt-1 opacity-80">
                                PAN registered to: <strong>{panResult.panName}</strong>
                                {panResult.similarity !== undefined && ` (${panResult.similarity}% match)`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {panVerified && (
                      <button
                        type="button"
                        onClick={() => { setPanVerified(false); setPanResult(null); setPanNumber(''); }}
                        className="text-xs text-gray-500 hover:text-emerald-500 transition-colors dark:text-slate-400"
                      >
                        Change PAN Number
                      </button>
                    )}
                  </div>

                  <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password (minimum 8 characters)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      minLength={8}
                      className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div className="group relative border-b border-gray-200 pb-3 dark:border-slate-700">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="relative block w-full appearance-none border-0 bg-transparent px-3 py-1 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-0 sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-emerald-500 hover:text-emerald-600 font-medium underline">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-emerald-500 hover:text-emerald-600 font-medium underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !agreeToTerms}
                  className="group relative flex w-full transform justify-center rounded-xl border border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-emerald-600 hover:to-blue-600 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-100" />
                      Creating Account...
                    </>
                  ) : (
                    'CREATE ACCOUNT'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-500 dark:text-slate-400">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="app-surface" />}>
      <SignupPageContent />
    </Suspense>
  );
}
