'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, Users, Briefcase, AlertTriangle, 
  Shield, LogOut, Menu, X 
} from 'lucide-react'
import { useState } from 'react'

export default function AdminNav() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Jobs', icon: Briefcase, path: '/admin/jobs' },
    { label: 'Reports', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Trust & Safety', icon: Shield, path: '/admin/trust' },
  ]

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/admin/dashboard')} className="text-xl font-bold text-primary">
              HyperLocal Admin
            </button>
            <div className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => router.push(item.path)}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Admin: {user?.fullName}
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          <Button
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => {
                  router.push(item.path)
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
