'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { 
  LayoutDashboard, Users, AlertTriangle, 
  LogOut, Menu, X, IndianRupee, MessageSquare
} from 'lucide-react'
import { useState } from 'react'
import { NotificationBell } from '@/components/ui/notification-bell'
import { cn } from '@/lib/utils'

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
    { label: 'Reports', icon: AlertTriangle, path: '/admin/reports' },
    { label: 'Escrow', icon: IndianRupee, path: '/admin/escrow' },
    { label: 'Chat', icon: MessageSquare, path: '/admin/chat' },
  ]

  return (
    <nav className="glass border-b sticky top-0 z-50 shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/admin/dashboard')} className="text-lg font-bold text-primary touch-target flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline">HyperLocal Admin</span>
            </button>
            <div className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => router.push(item.path)}
                  className="gap-2 touch-target transition-smooth"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="text-sm text-muted-foreground px-3 py-1.5 bg-muted/50 rounded-lg">
              {user?.fullName}
            </div>
            <NotificationBell />
            <Button variant="outline" onClick={handleLogout} className="gap-2 touch-target transition-smooth">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          <Button
            variant="ghost"
            className="md:hidden touch-target"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => {
                  router.push(item.path)
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start gap-2 touch-target"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <div className="px-4 py-2 text-sm text-muted-foreground border-t">
              {user?.fullName}
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-2 touch-target"
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
