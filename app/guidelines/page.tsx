import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Community Guidelines</h1>
        <p className="mb-8 text-muted-foreground">
          Keep HyperLocal Jobs safe and useful for everyone by following these guidelines.
        </p>

        <div className="space-y-4 rounded-2xl border bg-card p-6 text-muted-foreground">
          <p>• Post accurate job descriptions and fair compensation details.</p>
          <p>• Communicate respectfully through in-app chat.</p>
          <p>• Never request or share sensitive personal information unnecessarily.</p>
          <p>• Confirm work completion honestly before escrow release.</p>
          <p>• Report abusive or suspicious behavior immediately.</p>
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
