import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  return (
    <main className="app-surface py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Pricing</h1>
        <p className="mb-8 text-muted-foreground">
          HyperLocal Jobs keeps pricing simple: workers can join for free, and employers pay only when posting verified jobs.
        </p>

        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Current Plan</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Workers: Free profile creation and job applications</li>
            <li>Employers: Job posting and candidate matching features</li>
            <li>Escrow-backed payments for secure transactions</li>
          </ul>
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/signup?role=employer">Get Started as Employer</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
