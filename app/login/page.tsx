'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Phone, Lock, Store, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(120deg,#d8eee6_0%,#dbe9f8_45%,#d3e3f6_100%)] p-4 dark:bg-[linear-gradient(120deg,#0f172a_0%,#10253a_50%,#0f2f2a_100%)] md:p-6">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-[#eef5fb]/95 shadow-2xl md:h-[90vh] md:flex-row md:overflow-hidden dark:border-slate-700 dark:bg-slate-900/90">
        <section className="relative hidden h-full w-full flex-col items-center justify-start bg-[#e8f4ea] p-7 pt-16 text-slate-900 md:flex md:w-1/2 md:items-start md:p-10 md:pt-16 lg:w-5/12 lg:p-12 lg:pt-16 dark:bg-slate-900 dark:text-slate-100">
          <div className="absolute left-8 top-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-bl-none rounded-lg rounded-tr-none bg-gradient-to-r from-emerald-500 to-blue-500 text-xl font-bold text-white shadow-sm">
              H
            </div>
            <span className="text-lg font-bold tracking-wide">HyperLocal</span>
          </div>

          <div className="z-10 mt-4 max-w-md md:mt-0">
            <h1 className="mb-6 text-5xl font-bold leading-[1.05] text-slate-900 md:text-6xl dark:text-white">
              Welcome to <br />
              your <br />
              <span className="relative inline-block text-emerald-500 dark:text-emerald-400">
                neighborhood
                <svg className="absolute -bottom-1 left-0 -z-10 h-3 w-full text-blue-200 dark:text-blue-900/70" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="8" />
                </svg>
              </span>{' '}
              <br />
              workspace.
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              Connect with local opportunities that matter. Whether you&apos;re hiring or looking for work,
              start right here in your community.
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

        <section className="relative z-20 flex w-full flex-col items-center justify-center bg-white p-6 shadow-2xl md:w-1/2 md:rounded-l-[2.5rem] md:p-10 md:shadow-none lg:w-7/12 lg:p-14 dark:bg-slate-950">
          <Link href="/" className="absolute left-6 top-6 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 md:left-8 md:top-8">
            ← Back to Home
          </Link>
          <div className="w-full max-w-sm space-y-7">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sign in</h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="sr-only" htmlFor="phone-number">Phone Number</label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-0">
                      <Phone className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="phone-number"
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      value={formData.phoneNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      maxLength={10}
                      className="relative block w-full appearance-none border-0 border-b-2 border-gray-200 bg-transparent px-3 py-4 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:z-10 focus:border-emerald-500 focus:outline-none focus:ring-0 sm:text-lg dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="sr-only" htmlFor="password">Password</label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-0">
                      <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="relative block w-full appearance-none border-0 border-b-2 border-gray-200 bg-transparent px-3 py-4 pl-10 text-gray-900 placeholder-gray-400 transition-colors focus:z-10 focus:border-emerald-500 focus:outline-none focus:ring-0 sm:text-lg dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" id="remember-me" name="remember-me" type="checkbox" />
                  <label className="ml-2 block cursor-pointer text-sm text-gray-600 dark:text-slate-300" htmlFor="remember-me">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <Link className="font-medium text-gray-500 transition-colors hover:text-emerald-500 dark:text-slate-400" href="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full transform justify-center rounded-xl border border-transparent bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-emerald-600 hover:to-blue-600 hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-100" />
                    ) : (
                      <LogIn className="h-5 w-5 text-emerald-100 group-hover:text-white" />
                    )}
                  </span>
                  {loading ? 'Logging in...' : 'LOG IN'}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-slate-400">
                New to HyperLocal?{' '}
                <Link className="font-medium text-emerald-500 transition-colors hover:text-blue-500" href="/signup">
                  Create an account
                </Link>
              </p>
            </form>

            <div className="mt-8 border-t border-gray-100 pt-6 text-xs text-gray-400 dark:border-slate-800 dark:text-slate-500">
              <h3 className="mb-2 font-bold uppercase tracking-widest text-gray-300 dark:text-slate-600">Demo Access</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  className="cursor-pointer transition-colors hover:text-emerald-500"
                  title="Use 9876543210 / Password@123"
                  onClick={() => setFormData({ phoneNumber: '9876543210', password: 'Password@123' })}
                >
                  Worker: 9876543210
                </button>
                <button
                  type="button"
                  className="cursor-pointer transition-colors hover:text-emerald-500"
                  title="Use 9876543212 / Password@123"
                  onClick={() => setFormData({ phoneNumber: '9876543212', password: 'Password@123' })}
                >
                  Employer: 9876543212
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Demo password: Password@123</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
