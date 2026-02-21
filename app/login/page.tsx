'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Briefcase, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser, getUserPassword } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.password) {
      toast({
        title: 'Password Required',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(formData.phoneNumber, formData.password);

      if (result.success && result.user) {
        // Verify password (mock auth)
        const storedPassword = getUserPassword(formData.phoneNumber);
        if (storedPassword !== formData.password) {
          toast({
            title: 'Login Failed',
            description: 'Invalid phone number or password',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        login(result.user);
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${result.user.fullName}!`,
        });

        // Redirect based on role
        if (result.user.role === 'worker') {
          router.push('/worker/dashboard');
        } else if (result.user.role === 'employer') {
          router.push('/employer/dashboard');
        } else if (result.user.role === 'admin') {
          router.push('/admin/dashboard');
        }
      } else {
        toast({
          title: 'Login Failed',
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
          Back to Home
        </Link>

        <Card className="p-8 border-2">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">HyperLocal Jobs</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Log in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your 10-digit mobile number"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <p className="text-xs font-semibold mb-2 text-center">Demo Credentials</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold">Worker:</span> 9876543210 (create account to set password)
              </div>
              <div>
                <span className="font-semibold">Employer:</span> 9876543212 (create account to set password)
              </div>
              <div>
                <span className="font-semibold">Admin:</span> 9999999999 (password: admin123)
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
