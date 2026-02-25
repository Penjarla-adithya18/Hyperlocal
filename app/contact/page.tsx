import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Contact Us</h1>
        <p className="mb-8 text-muted-foreground">Reach our support team for help with account, jobs, or payments.</p>

        <div className="space-y-3 rounded-2xl border bg-card p-6 text-muted-foreground">
          <p><span className="font-semibold text-foreground">Email:</span> support@hyperlocaljobs.example</p>
          <p><span className="font-semibold text-foreground">Support Hours:</span> Monday to Saturday, 9 AM - 7 PM</p>
          <p><span className="font-semibold text-foreground">Response Time:</span> Usually within 24 hours</p>
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
