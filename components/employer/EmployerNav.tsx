'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Briefcase, Home, PlusCircle, MessageSquare, Settings, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/ui/notification-bell';

export function EmployerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/employer/dashboard', label: t('nav.dashboard'), icon: Home },
    { href: '/employer/jobs/post', label: t('nav.employer.postJob'), icon: PlusCircle },
    { href: '/employer/jobs', label: t('nav.employer.myJobs'), icon: Briefcase },
    { href: '/employer/resume-search', label: 'AI Search', icon: Search },
    { href: '/employer/chat', label: t('nav.messages'), icon: MessageSquare, badge: 0 },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/employer/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-accent hidden sm:inline">HyperLocal Jobs</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} prefetch={false}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={cn('gap-2', isActive && 'bg-accent text-accent-foreground')}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link href="/settings" prefetch={false}>
              <Button variant="ghost" size="icon" title="Settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-4 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} prefetch={false}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 whitespace-nowrap',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
}

export default EmployerNav;
