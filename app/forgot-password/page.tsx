'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Briefcase, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { sendOTP, verifyOTP, resetPassword, setUserPassword } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');

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
        const otpMatch = result.message.match(/OTP is: (\d{6})/);
        if (otpMatch) {
          setGeneratedOtp(otpMatch[1]);
        }
        toast({
          title: 'OTP Sent',
          description: result.message,
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
          description: 'You can now set a new password',
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(formData.phoneNumber, formData.newPassword);
      if (result.success) {
        // Update password in mock storage
        setUserPassword(formData.phoneNumber, formData.newPassword);

        setStep(3);
        toast({
          title: 'Password Reset Successful',
          description: 'Your password has been updated',
        });

        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast({
          title: 'Reset Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
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

          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
                <p className="text-sm text-muted-foreground">
                  We'll send an OTP to verify your identity
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter your registered mobile number"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
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
                        Sending OTP...
                      </>
                    ) : (
                      'Send OTP'
                    )}
                  </Button>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={formData.otp}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            otp: e.target.value.replace(/\D/g, '').slice(0, 6),
                          })
                        }
                        maxLength={6}
                      />
                      {generatedOtp && (
                        <p className="text-xs text-muted-foreground">
                          Demo OTP: <span className="font-mono font-bold text-primary">{generatedOtp}</span>
                        </p>
                      )}
                    </div>

                    <Button onClick={handleVerifyOTP} disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify OTP'
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
          ) : step === 2 ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a strong password for your account
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
              <p className="text-muted-foreground mb-4">
                Your password has been updated successfully
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login page...
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
