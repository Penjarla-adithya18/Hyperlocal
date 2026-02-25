import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Help Center</h1>
        <p className="mb-8 text-muted-foreground">Quick answers for common questions.</p>

        <div className="space-y-4 rounded-2xl border bg-card p-6 text-muted-foreground">
          <p><span className="font-semibold text-foreground">How do I apply for jobs?</span> Create a worker account, complete your profile, then apply from the Jobs page.</p>
          <p><span className="font-semibold text-foreground">How does payment work?</span> Employers deposit funds into escrow, released after job completion confirmation.</p>
          <p><span className="font-semibold text-foreground">How do I report issues?</span> Use in-app support/report features or contact us directly.</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
