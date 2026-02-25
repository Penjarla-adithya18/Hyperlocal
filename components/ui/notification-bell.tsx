'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Bell, CheckCheck, Briefcase, MessageSquare, IndianRupee, Star, Info } from 'lucide-react'
import { mockNotificationOps } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Notification } from '@/lib/types'

const ICON_MAP: Record<string, React.ElementType> = {
  job_match: Briefcase,
  application: Briefcase,
  message: MessageSquare,
  payment: IndianRupee,
  rating: Star,
  system: Info,
}

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const load = async () => {
    if (!user) return
    try {
      const data = await mockNotificationOps.findByUserId(user.id)
      setNotifications(data)
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    if (!user) return
    load()
    // Poll every 30 seconds for new notifications
    timerRef.current = setInterval(load, 30_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [user])

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      // Delay mark-all-read by 1.5s so user can see new ones
      setTimeout(async () => {
        await mockNotificationOps.markAllRead().catch(() => {})
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }, 1500)
    }
  }

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>}
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.map((n) => {
              const Icon = ICON_MAP[n.type] ?? Info
              return (
                <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                  <div className={`mt-0.5 w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${!n.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? 'font-medium' : ''}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </div>
              )
            })}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1 h-8" onClick={async () => { await mockNotificationOps.markAllRead().catch(() => {}); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))) }}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
