'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <Card className="p-8 border-2">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary">HyperLocal Jobs</span>
          </div>

          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold">Password Recovery Disabled</h1>
            <p className="text-sm text-muted-foreground">
              Password recovery is disabled in this build to avoid insecure client-side OTP resets.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact support for account recovery, or log in and change your password from a secure session.
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
