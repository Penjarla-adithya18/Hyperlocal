'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Shield, Sparkles, MessageSquare, Clock, MapPin, Star, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary">HyperLocal Jobs</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </Link>
            <Link href="#safety" className="text-sm font-medium hover:text-primary transition-colors">
              Safety
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Job Matching
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-balance mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Find Local Jobs That Match Your Skills
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance mb-10 leading-relaxed">
            Connect with local employers for gig, part-time, and full-time opportunities. 
            Secure payments, verified employers, and AI-powered matching ensure you find the perfect job.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=worker">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg px-8">
                Find Jobs
              </Button>
            </Link>
            <Link href="/signup?role=employer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                Post a Job
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Join 10,000+ workers and employers in your community
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: '10,000+', label: 'Active Users' },
            { value: '5,000+', label: 'Jobs Posted' },
            { value: '95%', label: 'Payment Success' },
            { value: '4.8/5', label: 'Average Rating' },
          ].map((stat, i) => (
            <Card key={i} className="p-6 text-center border-2 hover:border-primary/50 transition-colors">
              <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose HyperLocal Jobs?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for local communities with trust, safety, and convenience at the core
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: 'AI-Powered Matching',
                description: 'Get personalized job recommendations based on your skills, experience, and availability.',
                color: 'text-primary',
              },
              {
                icon: Shield,
                title: 'Secure Escrow Payments',
                description: 'Payments held securely until job completion. No fraud, no payment worries.',
                color: 'text-accent',
              },
              {
                icon: MessageSquare,
                title: 'Safe In-App Chat',
                description: 'Communicate securely without sharing personal contact information.',
                color: 'text-primary',
              },
              {
                icon: Star,
                title: 'Trust Score System',
                description: 'Build your reputation through ratings and successful job completions.',
                color: 'text-accent',
              },
              {
                icon: MapPin,
                title: 'Hyperlocal Focus',
                description: 'Find opportunities right in your neighborhood or nearby areas.',
                color: 'text-primary',
              },
              {
                icon: Clock,
                title: 'Flexible Work',
                description: 'Part-time, full-time, gig work - choose what fits your schedule.',
                color: 'text-accent',
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6 hover:shadow-lg transition-all hover:scale-105 hover:border-primary/50">
                <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple steps to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* For Workers */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-primary">For Workers</h3>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Sign Up', desc: 'Create your account with phone verification' },
                  { step: '2', title: 'Complete Profile', desc: 'Add your skills and availability for better matches' },
                  { step: '3', title: 'Browse Jobs', desc: 'Get AI-powered recommendations or search manually' },
                  { step: '4', title: 'Apply & Chat', desc: 'Apply to jobs and chat securely with employers' },
                  { step: '5', title: 'Get Paid', desc: 'Complete the job and receive secure payment' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Employers */}
            <div>
              <h3 className="text-2xl font-bold mb-6 text-accent">For Employers</h3>
              <div className="space-y-6">
                {[
                  { step: '1', title: 'Register', desc: 'Create your business account with verification' },
                  { step: '2', title: 'Post a Job', desc: 'Describe your job requirements and pay' },
                  { step: '3', title: 'Deposit Escrow', desc: 'Secure payment to make job visible to workers' },
                  { step: '4', title: 'Review Applications', desc: 'See matched candidates with AI scores' },
                  { step: '5', title: 'Hire & Complete', desc: 'Chat, select worker, and confirm completion' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Safety is Our Priority</h2>
              <p className="text-lg text-muted-foreground">
                Multiple layers of protection ensure a safe experience for everyone
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Escrow Payment Protection',
                  desc: 'Money is held securely and only released after job completion',
                },
                {
                  title: 'Phone Verification',
                  desc: 'All users verified with OTP to prevent fake accounts',
                },
                {
                  title: 'Trust Score System',
                  desc: 'Behavioral tracking ensures reliable users get priority',
                },
                {
                  title: 'Fraud Detection',
                  desc: 'AI-powered detection of scams and suspicious activity',
                },
                {
                  title: 'Report & Support',
                  desc: 'Easy reporting system for issues and 24/7 support',
                },
                {
                  title: 'Rating & Reviews',
                  desc: 'Community feedback helps identify trustworthy users',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg bg-background">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-10 md:p-16 text-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border-2 border-primary/20">
            <TrendingUp className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of workers and employers finding opportunities in their local community
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup?role=worker">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  Sign Up as Worker
                </Button>
              </Link>
              <Link href="/signup?role=employer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign Up as Employer
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-primary">HyperLocal Jobs</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered local job matching platform connecting workers and employers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Workers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup?role=worker" className="hover:text-primary transition-colors">Find Jobs</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">How It Works</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Safety Tips</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup?role=employer" className="hover:text-primary transition-colors">Post Jobs</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 HyperLocal Jobs. All rights reserved. Built for local communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
