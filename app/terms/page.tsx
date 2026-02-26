import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <main className="app-surface py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mb-8 text-muted-foreground">By using HyperLocal Jobs, you agree to follow our platform terms and community policies.</p>

        <div className="space-y-4 rounded-2xl border bg-card p-6 text-muted-foreground">
          <p>• Users must provide accurate account and profile information.</p>
          <p>• Employers and workers are responsible for lawful, respectful interactions.</p>
          <p>• Escrow and payout timelines are governed by platform policy.</p>
          <p>• Violations may result in account restrictions or removal.</p>
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
