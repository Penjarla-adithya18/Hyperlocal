'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Users, Briefcase, AlertTriangle, Shield, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AdminNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Jobs', icon: Briefcase, path: '/admin/dashboard' },
    { label: 'Reports', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Safety', icon: Shield, path: '/admin/reports' },
  ]

  return (
    <>
      <nav className="sticky top-0 z-40">
        <div className="app-header">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button onClick={() => router.push('/admin/dashboard')} className="text-lg font-semibold">
                HyperLocal Admin
              </button>

              <div className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const active = pathname === item.path
                  return (
                    <Button
                      key={`${item.label}-${item.path}`}
                      variant="ghost"
                      onClick={() => router.push(item.path)}
                      className={cn(
                        'gap-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground',
                        active && 'bg-white/15'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  )
                })}
              </div>

              <div className="hidden md:flex items-center gap-4">
                <div className="text-sm text-primary-foreground/90">Admin: {user?.fullName}</div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="gap-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>

              <Button
                variant="ghost"
                className="md:hidden text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>

            {mobileMenuOpen && (
              <div className="md:hidden pt-3 space-y-2">
                {navItems.map((item) => (
                  <Button
                    key={`${item.label}-${item.path}-mobile`}
                    variant="ghost"
                    onClick={() => {
                      router.push(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full justify-start gap-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start gap-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1 px-1 py-2">
          {navItems.map((item) => {
            const active = pathname === item.path
            return (
              <Button
                key={`${item.label}-${item.path}-tab`}
                variant="ghost"
                onClick={() => router.push(item.path)}
                className={cn(
                  'h-auto flex-col gap-1 py-2 text-[11px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </div>
      </nav>

      <div className="h-16 md:hidden" />
    </>
  )
}
