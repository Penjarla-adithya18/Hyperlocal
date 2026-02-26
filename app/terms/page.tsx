import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 md:p-12 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 26, 2026</p>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using HyperLocal Jobs (&quot;the Platform&quot;), you accept and agree to be bound by the terms
                and provisions of this agreement. If you do not agree to these Terms and Conditions, please do not use this Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To use certain features of the Platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your information to keep it accurate and complete</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Take responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Post false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use the Platform for any illegal purposes</li>
                <li>Attempt to circumvent payment systems or fees</li>
                <li>Request or facilitate payment outside the Platform</li>
                <li>Share personal contact information in violation of our safety guidelines</li>
                <li>Spam, advertise unauthorized services, or engage in commercial solicitation</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Job Postings and Applications</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>For Employers:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                <li>You are responsible for the accuracy of job postings</li>
                <li>Job postings must comply with all applicable laws and regulations</li>
                <li>You must not discriminate based on protected characteristics</li>
                <li>Payment must be released through the Platform&apos;s escrow system</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>For Workers:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You must provide accurate information about your skills and experience</li>
                <li>You agree to complete jobs as described and agreed upon</li>
                <li>You will communicate professionally with employers</li>
                <li>Payment disputes must be handled through Platform channels</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Payment and Escrow</h2>
              <p className="text-muted-foreground leading-relaxed">
                HyperLocal Jobs uses an escrow system to protect both employers and workers. Employers deposit payment
                before work begins, and funds are released upon job completion. The Platform charges a service fee for
                facilitating transactions. All payments must be made through the Platform&apos;s payment system.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Trust Score and Verification</h2>
              <p className="text-muted-foreground leading-relaxed">
                HyperLocal Jobs uses a Trust Score system to help users assess reliability. Trust Scores are calculated
                based on various factors including job completion rate, ratings, and account age. While we strive for
                accuracy, Trust Scores are not guarantees of future performance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms and Conditions are governed by the laws of India. Any disputes arising from these Terms
                shall be subject to the exclusive jurisdiction of courts in Andhra Pradesh, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms, please contact us at support@hyperlocaljobs.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
