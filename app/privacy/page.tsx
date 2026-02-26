import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 26, 2026</p>

          <div className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                HyperLocal Jobs (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, store, and share your personal information when you use our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We collect the following types of information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, phone number, email, password, and role (worker/employer)</li>
                <li><strong>Profile Information:</strong> Skills, location, work experience, business details, and profile pictures</li>
                <li><strong>Job and Application Data:</strong> Job postings, applications, messages, and transaction history</li>
                <li><strong>Payment Information:</strong> Payment details processed securely through third-party providers</li>
                <li><strong>Usage Data:</strong> Device information, IP address, browser type, and usage patterns</li>
                <li><strong>Location Data:</strong> Approximate location based on IP address or precise location if you grant permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use your information to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and improve our job matching services</li>
                <li>Facilitate communication between workers and employers</li>
                <li>Process payments and manage escrow transactions</li>
                <li>Verify user identities and maintain trust scores</li>
                <li>Send notifications about jobs, applications, and account activity</li>
                <li>Analyze usage patterns to improve the Platform</li>
                <li>Prevent fraud, abuse, and security threats</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Sharing Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Other Users:</strong> Profile information is visible to help facilitate job matching</li>
                <li><strong>Service Providers:</strong> Payment processors, SMS providers, and hosting services</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect rights and safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                We <strong>do not sell</strong> your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption,
                secure servers, and access controls. However, no internet transmission is completely secure,
                and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Access and review your personal information</li>
                <li>Update or correct your information through your profile</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Lodge a complaint with data protection authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide
                services. After account deletion, we may retain certain data for legal, tax, or regulatory purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Platform is not intended for users under 18 years of age. We do not knowingly collect
                information from children. If you believe a child has provided us with personal information,
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to improve user experience, analyze usage, and remember
                preferences. You can control cookie settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of significant changes through
                the Platform or via email. Continued use after changes indicates acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy or your data, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                Email: privacy@hyperlocaljobs.com<br />
                Phone: +91 (123) 456-7890
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
