import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <main className="app-surface py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-8 text-muted-foreground">Your privacy matters. We collect only necessary data to operate secure job matching and payments.</p>

        <div className="space-y-4 rounded-2xl border bg-card p-6 text-muted-foreground">
          <p>• We collect account, profile, and transaction-related data.</p>
          <p>• We use your data to match jobs, verify identities, and secure transactions.</p>
          <p>• We do not sell personal data to third parties.</p>
          <p>• You may request account data review or deletion where applicable.</p>
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
