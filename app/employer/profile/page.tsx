'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EmployerNav } from '@/components/employer/EmployerNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Building2, Loader2, Save, Shield, TrendingUp, Trash2, Mail, Phone, MapPin, Globe, CheckCircle2, XCircle, AlertTriangle, User } from 'lucide-react';
import { employerProfileOps, userOps, db, loginUser } from '@/lib/api';
import { verifyGSTIN, validateGSTINFormat } from '@/lib/gstinService';
import type { EmployerProfile, GSTINDetails } from '@/lib/types';
import { getEmployerProfileCompletion, isEmployerProfileComplete } from '@/lib/profileCompletion';
import { LocationInput } from '@/components/ui/location-input';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { resetPassword, sendOTP, verifyOTP } from '@/lib/auth';
import { localeLabels, localeNames, locales, SupportedLocale } from '@/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BUSINESS_TYPES = [
  'Retail Shop',
  'Restaurant/Cafe',
  'Salon/Spa',
  'Construction',
  'IT Company',
  'Manufacturing',
  'Service Provider',
  'Consulting',
  'Healthcare',
  'Education',
  'Real Estate',
  'Other'
];

export default function EmployerProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { toast } = useToast();
  const { t, locale, setLocale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    organizationName: '',
    location: '',
    businessType: '',
    description: '',
    gstin: '',
  });

  // GSTIN verification state
  const [gstinLoading, setGstinLoading] = useState(false);
  const [gstinDetails, setGstinDetails] = useState<GSTINDetails | null>(user?.gstinDetails ?? null);
  const [gstinVerified, setGstinVerified] = useState(user?.gstinVerified ?? false);
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ phone: user?.phoneNumber ?? '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Trust level colors
  const trustColors: Record<string, string> = {
    basic: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    trusted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };

  useEffect(() => {
    if (!user || user.role !== 'employer') {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const findByUserId = employerProfileOps?.findByUserId;
      if (!findByUserId) {
        throw new Error('Employer profile API is unavailable. Please refresh and try again.');
      }

      const employerProfile = await findByUserId(user.id);
      if (employerProfile) {
        setProfile(employerProfile);
        setFormData({
          businessName: employerProfile.businessName || '',
          organizationName: employerProfile.organizationName || '',
          location: employerProfile.location || '',
          businessType: employerProfile.businessType || '',
          description: employerProfile.description || '',
          gstin: user?.gstin ?? '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGSTIN = async () => {
    const trimmed = formData.gstin.trim().toUpperCase();
    if (!trimmed) return;

    const formatError = validateGSTINFormat(trimmed);
    if (formatError) {
      setGstinError(formatError);
      return;
    }

    setGstinLoading(true);
    setGstinError(null);
    try {
      const details = await verifyGSTIN(trimmed);
      setGstinDetails(details);
      setGstinVerified(true);
      setGstinError(null);
      setFormData(prev => ({
        ...prev,
        gstin: trimmed,
        businessName: details.legalName || prev.businessName,
      }));
      toast({ title: 'GSTIN Verified!', description: `${details.legalName} ΓÇö ${details.status}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setGstinError(msg);
      setGstinVerified(false);
      setGstinDetails(null);
    } finally {
      setGstinLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName) {
      toast({
        title: 'Business Name Required',
        description: 'Please provide your business name',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.location) {
      toast({
        title: 'Location Required',
        description: 'Please provide your business location',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        userId: user!.id,
        businessName: formData.businessName,
        organizationName: formData.organizationName || undefined,
        location: formData.location,
        businessType: formData.businessType || undefined,
        description: formData.description || undefined,
      };

      if (profile) {
        await employerProfileOps.update(user!.id, profileData);
      } else {
        await employerProfileOps.create(profileData);
      }

      // Update user profile completion status
      const isComplete = isEmployerProfileComplete(formData);

      await userOps.update(user!.id, {
        profileCompleted: !!isComplete,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        gstinVerified: gstinVerified || undefined,
        gstinDetails: gstinDetails || undefined,
      });
      updateUser({
        profileCompleted: !!isComplete,
        gstin: formData.gstin.trim().toUpperCase(),
        gstinVerified,
        gstinDetails: gstinDetails || undefined,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully',
      });

      router.push('/employer/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await db.deleteAccount(user.id);
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
      });
      logout();
      router.push('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPw !== pwForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (pwForm.newPw.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    try {
      const result = await resetPassword(pwForm.current, pwForm.newPw);
      if (result.success) {
        try {
          const loginResult = await loginUser(user!.phoneNumber, pwForm.newPw);
          if (loginResult.success && loginResult.user) {
            updateUser(loginResult.user);
          }
        } catch {}
        toast({ title: 'Password updated successfully' });
        setPwForm({ current: '', newPw: '', confirm: '' });
      } else {
        toast({ title: result.message, variant: 'destructive' });
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneForm.phone.match(/^[6-9]\d{9}$/)) {
      toast({ title: 'Enter a valid 10-digit Indian mobile number', variant: 'destructive' });
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await sendOTP(phoneForm.phone);
      if (res.success) {
        setOtpSent(true);
        setDisplayOtp(res.otp ?? null);
        toast({ title: 'OTP generated', description: 'Your OTP is shown on screen.' });
      } else {
        toast({ title: res.message ?? 'Failed to generate OTP', variant: 'destructive' });
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyAndUpdatePhone = async () => {
    setPhoneLoading(true);
    try {
      const verifyData = await verifyOTP(phoneForm.phone, phoneForm.otp);
      if (!verifyData.success) {
        toast({ title: verifyData.message ?? 'Invalid OTP', variant: 'destructive' });
        return;
      }

      const result = await userOps.update(user!.id, { phoneNumber: phoneForm.phone });
      if (result) {
        updateUser({ phoneNumber: phoneForm.phone });
        toast({ title: 'Phone number updated' });
        setOtpSent(false);
        setDisplayOtp(null);
        setPhoneForm((prev) => ({ ...prev, otp: '' }));
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Live profile completeness
  const profileCompleteness = useMemo(
    () => getEmployerProfileCompletion(formData),
    [formData.businessName, formData.location, formData.businessType, formData.description],
  );

  if (loading) {
    return (
      <div className="app-surface">
        <EmployerNav />
        <div className="container mx-auto px-4 py-8 pb-28 md:pb-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-surface">
      <EmployerNav />

      <main className="container mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8 max-w-4xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Business Profile
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your business information, verification status and account settings
          </p>
          {/* Live Profile Completeness */}
          <div className="mt-4 rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Profile Completeness</span>
              <span className="text-sm font-bold text-accent">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2" />
            {profileCompleteness < 100 && (
              <p className="text-xs text-muted-foreground mt-1">
                {profileCompleteness < 50 ? 'Complete your business profile to attract quality candidates.' : 'Almost there! Add remaining details for better visibility.'}
              </p>
            )}
          </div>
        </div>

        {/* Trust Level Badge */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Trust Level</p>
                  <Badge className={`mt-1 ${trustColors[user?.trustLevel || 'basic']}`}>
                    {(user?.trustLevel || 'basic').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Trust Score</p>
                <p className="text-sm font-bold mt-1">{user?.trustScore || 50}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Business Information */}
          <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Business Information</h2>
                <p className="text-sm text-muted-foreground">Tell workers about your business</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Business Name */}
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g., ABC Retail Store"
                  className="mt-1.5"
                  required
                />
              </div>

              {/* Organization Name (Optional) */}
              <div>
                <Label htmlFor="organizationName">Organization/Parent Company (Optional)</Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="e.g., ABC Group Ltd."
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">If you're part of a larger organization</p>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Business Location *</Label>
                <LocationInput
                  id="location"
                  value={formData.location}
                  onChange={(location) => setFormData({ ...formData, location })}
                  placeholder="e.g., Indiranagar, Bangalore"
                  className="mt-1.5"
                  required
                />
              </div>

              {/* Business Type */}
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <select
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your business, what you do, and what makes you unique..."
                  rows={4}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          </Card>

          {/* GSTIN Verification */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">GSTIN Verification</h2>
                <p className="text-sm text-muted-foreground">Verify your business to unlock higher trust level and more job posting slots</p>
              </div>
            </div>

            <div className="space-y-4">
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
            </div>
          </Card>

          {/* Trust & Verification */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Trust & Verification</h2>
                <p className="text-sm text-muted-foreground">Build credibility with workers</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="w-5 h-5 text-accent mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Trust Score: {user?.trustScore || 50}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Complete jobs successfully and maintain good communication to increase your trust score
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>

          {/* Danger Zone */}
          <Card className="p-6 border-destructive/50">
            <div className="mb-6 space-y-6 border-b border-destructive/20 pb-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Language & Region</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(locales as readonly SupportedLocale[]).map((code) => {
                    const [flag, ...rest] = localeLabels[code].split(' ');
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLocale(code)}
                        className={[
                          'flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-xs transition-all hover:border-primary',
                          locale === code ? 'border-primary bg-primary/5' : 'border-border',
                        ].join(' ')}
                      >
                        <span className="text-lg">{flag}</span>
                        <span className={`font-medium ${locale === code ? 'text-primary' : ''}`}>{localeNames[code]}</span>
                        <span className="text-[10px] text-muted-foreground">{rest.join(' ')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">{t('settings.changePw')}</h2>
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={t('settings.currentPw')}
                    value={pwForm.current}
                    onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                    required
                  />
                  <Input
                    type="password"
                    placeholder={t('settings.newPw')}
                    value={pwForm.newPw}
                    onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                    required
                    minLength={8}
                  />
                  <Input
                    type="password"
                    placeholder={t('settings.confirmPw')}
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                    required
                  />
                  <Button type="button" onClick={handleChangePassword} disabled={pwLoading}>
                    {pwLoading ? 'Updating...' : t('settings.updatePw')}
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Update Phone Number</h2>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      maxLength={10}
                      value={phoneForm.phone}
                      onChange={(e) => setPhoneForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="9876543210"
                      required
                    />
                    <Button type="button" variant="outline" onClick={handleSendOtp} disabled={phoneLoading}>
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </Button>
                  </div>
                  {displayOtp && <p className="text-sm text-muted-foreground">OTP: {displayOtp}</p>}
                  {otpSent && (
                    <>
                      <Input
                        type="text"
                        maxLength={6}
                        value={phoneForm.otp}
                        onChange={(e) => setPhoneForm((p) => ({ ...p, otp: e.target.value }))}
                        placeholder="123456"
                        required
                      />
                      <Button type="button" onClick={handleVerifyAndUpdatePhone} disabled={phoneLoading}>
                        {phoneLoading ? 'Verifying...' : 'Verify & Update'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Danger Zone</h2>
                <p className="text-sm text-muted-foreground">Irreversible actions</p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" variant="outline" onClick={handleLogout} className="mt-3 w-full sm:w-auto">
              Sign out
            </Button>
          </Card>
        </form>
      </main>
    </div>
  );
}

