import Link from 'next/link'
import { Briefcase, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | HyperLocal Jobs',
  description: 'Privacy Policy explaining how HyperLocal Jobs collects and uses your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/signup" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-slate-400">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">HyperLocal Jobs</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 pb-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-slate-500 mb-8">
          Last updated: 28 February 2026 &nbsp;&middot;&nbsp; Effective immediately
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700 dark:text-slate-300">

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">1. Introduction</h2>
            <p>HyperLocal Technologies Pvt. Ltd. (&ldquo;HyperLocal Jobs&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to protecting your personal data. This Privacy Policy explains what data we collect, how we use it, who we share it with, and your rights under the Information Technology Act, 2000, the IT (Amendment) Act, 2008, and the Digital Personal Data Protection Act, 2023 (DPDPA).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">2. Information We Collect</h2>

            <h3 className="font-medium text-gray-800 dark:text-slate-200 mt-3 mb-1">2.1 Information You Provide Directly</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Identity:</strong> Full name, date of birth, gender</li>
              <li><strong>Contact:</strong> Mobile number, email address</li>
              <li><strong>Worker Profile:</strong> Skills, work categories, years of experience, availability, bio/description, expected salary</li>
              <li><strong>Employer Profile:</strong> Business name, business type, business description, GST number (optional)</li>
              <li><strong>KYC:</strong> PAN card number for identity verification and verified badge</li>
              <li><strong>Financial:</strong> Payment methods for escrow transactions (processed via certified third-party gateways; we do not store raw card or bank account details)</li>
              <li><strong>Resume:</strong> Resume files and parsed text you upload for job applications</li>
            </ul>

            <h3 className="font-medium text-gray-800 dark:text-slate-200 mt-3 mb-1">2.2 Automatically Collected</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Location:</strong> City/area-level location when you enable location features for job matching. We do not continuously track your GPS location.</li>
              <li><strong>Device &amp; Usage:</strong> IP address, browser type, device type, pages visited, session duration, feature usage</li>
              <li><strong>Session Data:</strong> Authentication tokens stored in your browser&apos;s localStorage for maintaining your login session</li>
            </ul>

            <h3 className="font-medium text-gray-800 dark:text-slate-200 mt-3 mb-1">2.3 From Third-Party Services</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>PAN Verification (Sandbox.co.in):</strong> We receive only the verification status (verified/unverified) and name-match result. PAN numbers are encrypted at rest.</li>
              <li><strong>WhatsApp (WATI):</strong> Delivery receipts for OTP and job notification messages sent via WhatsApp Business API</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account management:</strong> Registration, login, profile creation and updates</li>
              <li><strong>Job matching:</strong> AI-powered skill matching between Workers and job postings, using your skills, location, categories, and availability</li>
              <li><strong>Resume search:</strong> Employers who received applications from you can search candidate resumes using natural-language queries</li>
              <li><strong>Communication:</strong> Sending OTPs, job alerts, application status updates, and in-platform chat messages</li>
              <li><strong>Escrow payments:</strong> Processing and releasing payments between Employers and Workers</li>
              <li><strong>Trust &amp; safety:</strong> Calculating trust scores, detecting fraudulent listings, verifying identity via PAN</li>
              <li><strong>Platform improvement:</strong> Analysing aggregated usage patterns to improve features and fix issues</li>
              <li><strong>Legal compliance:</strong> Responding to lawful requests from government authorities or courts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">4. AI &amp; Automated Processing</h2>
            <p>We use artificial intelligence and machine learning to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Match Workers&apos; skill profiles with job requirements (including synonym-aware matching: e.g. &ldquo;Chef&rdquo; = &ldquo;Cook&rdquo;, &ldquo;Watchman&rdquo; = &ldquo;Security Guard&rdquo;, &ldquo;Driver&rdquo; = &ldquo;Chauffeur&rdquo;, &ldquo;Maid&rdquo; = &ldquo;Housekeeper&rdquo;)</li>
              <li>Generate natural-language match score explanations for each job</li>
              <li>Enable Employers to search resumes using natural-language queries (RAG-powered semantic search)</li>
              <li>Detect potentially fraudulent or misleading job listings</li>
              <li>Translate platform content between English, Hindi, and Telugu</li>
            </ul>
            <p className="mt-2">AI outputs are advisory recommendations and do not constitute final hiring or rejection decisions. You may request a human review of any AI-generated outcome by contacting our support team.</p>
            <p className="mt-2"><strong>AI Providers:</strong> We use Groq (primary) and Ollama (fallback) for AI inference. Your data is sent securely and is not used to train these providers&apos; models under our agreements with them.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">5. Sharing of Your Data</h2>
            <p>We do <strong>not</strong> sell your personal data to third parties. We share data only as follows:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Between Platform users:</strong> When a Worker applies to a job, the Employer sees the Worker&apos;s name, skills, experience, area, and AI match score. Mobile numbers and email addresses are hidden until both parties have connected through the Platform.</li>
              <li><strong>Service Providers:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Supabase (PostgreSQL database and authentication) — data stored in Singapore/US data centres</li>
                  <li>WATI (WhatsApp Business API for OTPs and notifications)</li>
                  <li>Sandbox.co.in (PAN KYC verification)</li>
                  <li>Groq / Ollama (AI inference for matching and resume search)</li>
                </ul>
              </li>
              <li><strong>Legal requirements:</strong> To comply with court orders, government directives, or applicable Indian law (IT Act, DPDPA, PMLA, etc.).</li>
              <li><strong>Business transfer:</strong> In the event of a merger or acquisition, with at least 30 days&apos; prior notice to users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Active account data is retained for as long as your account exists.</li>
              <li>After account deletion, personal data is anonymised or deleted within 30 days, except where Indian law requires longer retention (financial and escrow records are retained for 7 years under the Income Tax Act).</li>
              <li>Resume files are stored until you explicitly delete them from your profile settings.</li>
              <li>Chat messages are retained for 12 months after the job is closed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">7. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All data is transmitted over HTTPS (TLS 1.2 or higher).</li>
              <li>Passwords are hashed using bcrypt — we never store plain-text passwords.</li>
              <li>PAN numbers are encrypted at rest using AES-256.</li>
              <li>Session authentication tokens expire and are refreshed automatically.</li>
              <li>Our database uses Row-Level Security (RLS) policies — users can only read and modify their own data.</li>
              <li>Access to production data is restricted to authorised engineers via role-based access controls.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">8. Your Rights Under DPDPA 2023</h2>
            <p>As a Data Principal under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a summary of your personal data we hold</li>
              <li><strong>Correction &amp; Completeness:</strong> Request correction of inaccurate or incomplete personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (subject to lawful retention requirements)</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time; this may affect your ability to use certain features</li>
              <li><strong>Nominate:</strong> Nominate another individual to exercise your rights in the event of death or incapacity</li>
              <li><strong>Grievance:</strong> Lodge a complaint with our Grievance Officer below; if unresolved, escalate to the Data Protection Board of India</li>
            </ul>
            <p className="mt-2">To exercise any right, email us at: <a href="mailto:privacy@hyperlocal.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">privacy@hyperlocal.in</a> with the subject &ldquo;DPDPA Rights Request&rdquo;. We will respond within 72 hours.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">9. Cookies &amp; Local Storage</h2>
            <p>The Platform does not serve third-party tracking or advertising cookies. We use browser <code className="bg-gray-100 dark:bg-slate-800 rounded px-1 font-mono">localStorage</code> exclusively for session management — storing your authentication token, session expiry timestamp, and user role. This data stays on your device and is never shared with advertisers or analytics providers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">10. Children&apos;s Privacy</h2>
            <p>The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal data from minors. If you believe we have inadvertently collected data from a minor, please contact us immediately and we will delete it within 7 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via their registered mobile number or email at least 7 days before the updated policy takes effect. Continued use of the Platform after the effective date constitutes your consent to the updated terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">12. Grievance Officer</h2>
            <address className="not-italic bg-gray-100 dark:bg-slate-800 rounded-lg p-3 text-sm">
              <strong>HyperLocal Technologies Pvt. Ltd.</strong><br />
              Data Protection &amp; Grievance Officer<br />
              Email: <a href="mailto:privacy@hyperlocal.in" className="text-emerald-600 dark:text-emerald-400 hover:underline">privacy@hyperlocal.in</a><br />
              Address: Hyderabad, Telangana, India — 500081<br />
              Response time: Within 72 hours of receipt of grievance
            </address>
          </section>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-6 text-xs text-gray-500 dark:text-slate-500">
            By creating an account, you acknowledge that you have read and understood this Privacy Policy.<br />
            Also see:{' '}
            <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Terms and Conditions
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
