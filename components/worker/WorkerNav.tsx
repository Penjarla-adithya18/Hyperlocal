'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Briefcase, Home, Search, MessageSquare, User, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function WorkerNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { href: '/worker/dashboard', label: 'Home', icon: Home },
    { href: '/worker/jobs', label: 'Jobs', icon: Search },
    { href: '/worker/applications', label: 'Applied', icon: Briefcase },
    { href: '/worker/chat', label: 'Messages', icon: MessageSquare },
    { href: '/worker/profile', label: 'Account', icon: User },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40">
        <div className="app-header">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/worker/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">HyperLocal</span>
              </Link>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="container mx-auto">
          <div className="grid grid-cols-5 gap-1 px-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto w-full flex-col gap-1 py-2 text-[11px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                {item.label}
              </Button>
            </Link>
          );
        })}
          </div>
        </div>
      </nav>

      <div className="h-16" />
    </>
  );
}

export default WorkerNav;
