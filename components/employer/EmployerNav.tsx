'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Briefcase, Home, PlusCircle, MessageSquare, LogOut, Sparkles, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/ui/notification-bell';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  mobileLabel: string;
  badge?: number;
  highlight?: boolean;
}

export function EmployerNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [showMenu, setShowMenu] = useState(false);

  const primaryNavItems: NavItem[] = [
    { href: '/employer/dashboard', label: t('nav.dashboard'), icon: Home, mobileLabel: 'Home', badge: undefined, highlight: false },
    { href: '/employer/jobs', label: t('nav.employer.myJobs'), icon: Briefcase, mobileLabel: 'Jobs', badge: undefined, highlight: false },
    { href: '/employer/jobs/post', label: t('nav.employer.postJob'), icon: PlusCircle, mobileLabel: 'Post', highlight: true, badge: undefined },
    { href: '/employer/chat', label: t('nav.messages'), icon: MessageSquare, badge: 0, mobileLabel: 'Chat', highlight: false },
    { href: '/employer/resume-search', label: t('nav.employer.aiSearch'), icon: Sparkles, mobileLabel: 'AI', badge: undefined, highlight: false },
  ];

  const secondaryNavItems: Omit<NavItem, 'mobileLabel' | 'badge' | 'highlight'>[] = [];

  return (
    <>
      {/* Top Bar */}
      <nav className="border-b glass sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/employer/dashboard" className="flex items-center gap-2 touch-target">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-sm">
                <Briefcase className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="font-bold text-accent hidden sm:inline text-lg">HyperLocal</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {primaryNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} prefetch={false}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2 transition-smooth',
                        isActive && 'bg-accent text-accent-foreground shadow-sm',
                        item.highlight && !isActive && 'border border-accent/30 text-accent hover:bg-accent/10'
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
              {secondaryNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} prefetch={false}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2 transition-smooth',
                        isActive && 'bg-accent text-accent-foreground shadow-sm'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-2 touch-target"
                title={t('nav.logout')}
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMenu(!showMenu)}
                className="touch-target"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="absolute top-14 right-0 w-full max-w-xs glass m-4 p-4 rounded-2xl shadow-soft-lg" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              {secondaryNavItems.map((item) => (
                <Link key={item.href} href={item.href} prefetch={false} onClick={() => setShowMenu(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 touch-target">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t pt-2">
                <Button
                  variant="ghost"
                  onClick={() => { logout(); setShowMenu(false); }}
                  className="w-full justify-start gap-3 touch-target text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation with Post button in center */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t shadow-soft-lg pb-safe">
        <div className="relative">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {[primaryNavItems[0], primaryNavItems[1]].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="flex flex-col items-center justify-center touch-target transition-smooth"
                >
                  <div
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-smooth',
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                    <span className={cn('text-[10px] font-medium', isActive && 'text-accent')}>
                      {item.mobileLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
            {/* Placeholder for centered Post button */}
            <div className="col-span-1" />
            {[primaryNavItems[3], primaryNavItems[4]].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="flex flex-col items-center justify-center touch-target transition-smooth"
                >
                  <div
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-smooth',
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground'
                    )}
                  >
                    <div className="relative">
                      <item.icon className={cn('w-5 h-5', isActive && 'scale-110')} />
                      {item.badge !== undefined && item.badge > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-medium">{item.badge}</span>
                        </div>
                      )}
                    </div>
                    <span className={cn('text-[10px] font-medium', isActive && 'text-accent')}>
                      {item.mobileLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Centered FAB for Post Job */}
          <Link
            href="/employer/jobs/post"
            className="absolute left-1/2 -translate-x-1/2 -top-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-soft-lg flex items-center justify-center touch-target border-4 border-background transition-smooth active:scale-95">
              <PlusCircle className="w-6 h-6 text-accent-foreground" />
            </div>
          </Link>
        </div>
      </nav>
    </>
  );
}

export default EmployerNav;
