'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Briefcase, Home, PlusCircle, Users, MessageSquare, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function EmployerNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { href: '/employer/dashboard', label: 'Home', icon: Home },
    { href: '/employer/jobs/post', label: 'Post', icon: PlusCircle },
    { href: '/employer/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/employer/jobs', label: 'Applicants', icon: Users },
    { href: '/employer/chat', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40">
        <div className="app-header">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/employer/dashboard" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-semibold">HyperLocal</span>
              </Link>

              <div className="flex items-center gap-2">
                <Link href="/employer/dashboard">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
                    <Settings className="w-5 h-5" />
                  </Button>
                </Link>
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
              <Link key={`${item.href}-${item.label}`} href={item.href}>
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

export default EmployerNav;
