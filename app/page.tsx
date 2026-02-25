import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  BriefcaseBusiness,
  Sparkles,
  LineChart,
  ShieldCheck,
  MessageCircle,
  Star,
  MapPin,
  Clock3,
  Shield,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sky-50 text-slate-800 antialiased transition-colors duration-200 dark:bg-slate-900 dark:text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-slate-800/90">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-7 w-7 text-blue-500 dark:text-blue-400" />
            <span className="text-xl font-bold text-blue-500 dark:text-white">HyperLocal Jobs</span>
          </div>

          <div className="hidden space-x-8 md:flex">
            <Link className="text-gray-600 transition-colors hover:text-blue-500 dark:text-gray-300 dark:hover:text-emerald-400" href="#features">
              Features
            </Link>
            <Link className="text-gray-600 transition-colors hover:text-blue-500 dark:text-gray-300 dark:hover:text-emerald-400" href="#how-it-works">
              How It Works
            </Link>
            <Link className="text-gray-600 transition-colors hover:text-blue-500 dark:text-gray-300 dark:hover:text-emerald-400" href="#safety">
              Safety
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button asChild size="sm" className="hidden min-w-28 sm:inline-flex">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm" className="min-w-28">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[linear-gradient(120deg,#d8eee6_0%,#dbe9f8_38%,#d3e3f6_100%)] pb-24 pt-20 dark:bg-[linear-gradient(120deg,#0f172a_0%,#0f2238_45%,#0f2f2a_100%)] lg:pb-32 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(16,185,129,0.24),transparent_42%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.2),transparent_44%)] dark:hidden" />
          <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_14%_86%,rgba(16,185,129,0.14),transparent_45%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,0.16),transparent_46%)] dark:block" />
          <div className="absolute right-0 top-0 h-[620px] w-[620px] translate-x-1/3 -translate-y-1/4 rounded-full bg-blue-200/35 blur-3xl dark:bg-blue-800/20" />
          <div className="absolute bottom-0 left-0 h-[620px] w-[620px] -translate-x-1/3 translate-y-1/4 rounded-full bg-green-200/35 blur-3xl dark:bg-emerald-800/20" />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-500 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            AI-Powered Job Matching
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white md:text-6xl">
            Find Local Jobs That <br className="hidden md:block" />
            <span className="text-blue-500 dark:text-blue-400">Match Your Skills</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
            Connect with local employers for gig, part-time, and full-time opportunities. Secure payments,
            verified employers, and AI-powered matching ensure you find the perfect job.
          </p>

          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup?role=worker">Find Jobs</Link>
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup?role=employer">Post a Job</Link>
            </Button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">Join 10,000+ workers and employers in your community</p>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white py-12 dark:border-gray-800 dark:bg-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {[['10,000+', 'Active Users', 'text-blue-500'], ['5,000+', 'Jobs Posted', 'text-blue-500'], ['95%', 'Payment Success', 'text-emerald-500'], ['4.8/5', 'Average Rating', 'text-emerald-500']].map(
              ([value, label, tone]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-slate-800"
                >
                  <div className={`mb-2 text-3xl font-bold md:text-4xl ${tone}`}>{value}</div>
                  <div className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">Why Choose HyperLocal Jobs?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Built for local communities with trust, safety, and convenience at the core</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: LineChart, title: 'AI-Powered Matching', desc: 'Get personalized job recommendations based on your skills, experience, and availability.', tone: 'blue' },
              { icon: ShieldCheck, title: 'Secure Escrow', desc: 'Payments held securely until job completion. No fraud, no payment worries.', tone: 'green' },
              { icon: MessageCircle, title: 'Instant Chat', desc: 'Communicate securely without sharing personal contact information.', tone: 'blue' },
              { icon: Star, title: 'Trust Score System', desc: 'Build your reputation through ratings and successful job completions.', tone: 'green' },
              { icon: MapPin, title: 'Hyperlocal Focus', desc: 'Find opportunities right in your neighborhood or nearby areas.', tone: 'blue' },
              { icon: Clock3, title: 'Flexible Work', desc: 'Part-time, full-time, gig work - choose what fits your schedule.', tone: 'green' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-slate-800"
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full ${feature.tone === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}
                >
                  <feature.icon className={`h-7 w-7 ${feature.tone === 'blue' ? 'text-blue-500 dark:text-blue-300' : 'text-emerald-500 dark:text-green-300'}`} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white py-20 dark:border-gray-800 dark:bg-slate-800/50 lg:py-32" id="how-it-works">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">How It Works</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Simple steps to get started</p>
          </div>

          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h3 className="mb-8 text-2xl font-bold text-blue-500 dark:text-blue-400">For Workers</h3>
              <div className="space-y-8">
                {[
                  ['1', 'Sign Up', 'Create your account with phone verification'],
                  ['2', 'Complete Profile', 'Add your skills and availability for better matches'],
                  ['3', 'Browse Jobs', 'Get AI-powered recommendations or search manually'],
                  ['4', 'Apply & Chat', 'Apply to jobs and chat securely with employers'],
                  ['5', 'Get Paid', 'Complete the job and receive secure payment'],
                ].map(([step, title, desc]) => (
                  <div key={String(step)} className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">{step}</div>
                    <div>
                      <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
                      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-8 text-2xl font-bold text-emerald-500 dark:text-green-400">For Employers</h3>
              <div className="space-y-8">
                {[
                  ['1', 'Register', 'Create your business account with verification'],
                  ['2', 'Post a Job', 'Describe your job requirements and pay'],
                  ['3', 'Deposit Escrow', 'Secure payment to make job visible to workers'],
                  ['4', 'Review Applications', 'See matched candidates with AI scores'],
                  ['5', 'Hire & Complete', 'Chat, select worker, and confirm completion'],
                ].map(([step, title, desc]) => (
                  <div key={String(step)} className="flex gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">{step}</div>
                    <div>
                      <h4 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
                      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32" id="safety">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-emerald-500 dark:bg-green-900/30">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">Your Safety is Our Priority</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Multiple layers of protection ensure a safe experience for everyone</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              ['Escrow Payment Protection', 'Money is held securely and only released after job completion', 'blue'],
              ['Phone Verification', 'All users verified with OTP to prevent fake accounts', 'green'],
              ['Trust Score System', 'Behavioral tracking ensures reliable users get priority', 'blue'],
              ['Fraud Detection', 'AI-powered detection of scams and suspicious activity', 'green'],
              ['Report & Support', 'Easy reporting system for issues and 24/7 support', 'blue'],
              ['Rating & Reviews', 'Community feedback helps identify trustworthy users', 'green'],
            ].map(([title, desc, tone]) => (
              <div key={String(title)} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-slate-800">
                <CheckCircle2 className={`mt-1 h-5 w-5 ${tone === 'blue' ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-500 dark:text-green-400'}`} />
                <div>
                  <h4 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-xl dark:border-gray-700 dark:bg-slate-800 md:p-16">
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-green-100 blur-2xl dark:bg-green-900/10" />
            <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-100 blur-2xl dark:bg-blue-900/10" />
            <div className="relative z-10">
              <TrendingUp className="mx-auto mb-6 h-12 w-12 text-emerald-500" />
              <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">Ready to Get Started?</h2>
              <p className="mx-auto mb-10 max-w-lg text-lg text-gray-600 dark:text-gray-300">
                Join thousands of workers and employers finding opportunities in their local community
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/signup?role=worker">Sign Up as Worker</Link>
                </Button>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/signup?role=employer">Sign Up as Employer</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white pb-8 pt-16 dark:border-gray-800 dark:bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <BriefcaseBusiness className="h-6 w-6 text-blue-500" />
                <span className="text-lg font-bold text-blue-500 dark:text-white">HyperLocal Jobs</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                AI-powered local job matching platform connecting workers and employers.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900 dark:text-white">For Workers</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link className="transition-colors hover:text-emerald-500" href="/signup?role=worker">Find Jobs</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#how-it-works">How It Works</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#safety">Safety Tips</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900 dark:text-white">For Employers</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link className="transition-colors hover:text-emerald-500" href="/signup?role=employer">Post Jobs</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Pricing</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Guidelines</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-gray-900 dark:text-white">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Help Center</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Contact Us</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Terms of Service</Link></li>
                <li><Link className="transition-colors hover:text-emerald-500" href="#">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 text-center dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-500">© 2024 HyperLocal Jobs. All rights reserved. Built for local communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
