'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { chatOps, userOps } from '@/lib/api'
import { ChatConversation, ChatMessage, User } from '@/lib/types'
import { Send, MessageCircle, ChevronLeft, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <AdminChatContent />
    </Suspense>
  )
}

function AdminChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersById, setUsersById] = useState<Record<string, User>>({})
  const [newMessage, setNewMessage] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeConvIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
    }
  }, [user, router])

  // Load conversations
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        const convs = await chatOps.findSessionsByUserId(user!.id)
        if (cancelled || !convs) return
        setConversations(convs)

        // Fetch all participant names
        const ids = new Set<string>()
        for (const c of convs) {
          for (const p of c.participants) {
            if (p !== user!.id) ids.add(p)
          }
        }
        const fetched = await Promise.all([...ids].map((id) => userOps.findById(id).catch(() => null)))
        if (cancelled) return
        const map: Record<string, User> = {}
        for (const u of fetched) {
          if (u) map[u.id] = u
        }
        setUsersById(map)

        // Auto-open conversation from URL param
        const convParam = searchParams.get('conv')
        if (convParam && convs.length > 0) {
          const target = convs.find((c) => c.id === convParam) || convs[0]
          setActiveConv(target)
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load conversations:', err)
      } finally {
        if (!cancelled) setLoadingConvs(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user, searchParams])

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true)
    try {
      const msgs = await chatOps.getMessages(convId)
      if (activeConvIdRef.current !== convId) return
      if (msgs) setMessages(msgs)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      if (!silent) setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    if (!activeConv) return
    activeConvIdRef.current = activeConv.id
    setMessages([])
    loadMessages(activeConv.id)

    pollRef.current = setInterval(() => {
      if (activeConvIdRef.current === activeConv.id) {
        loadMessages(activeConv.id, true)
      }
    }, 1500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeConv, loadMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConv || !user || sending) return

    const text = newMessage.trim()
    setNewMessage('')
    setSending(true)

    let tempMessage: ChatMessage | undefined
    try {
      tempMessage = {
        id: `temp-${Date.now()}`,
        conversationId: activeConv.id,
        senderId: user.id,
        message: text,
        createdAt: new Date().toISOString(),
        read: false,
      }
      setMessages((prev) => [...prev, tempMessage!])

      const sent = await chatOps.sendMessage({
        conversationId: activeConv.id,
        senderId: user.id,
        message: text,
      })
      if (sent) {
        setMessages((prev) => prev.map((m) => (m.id === tempMessage!.id ? sent : m)))
      }
    } catch {
      if (tempMessage) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage!.id))
      }
      toast({ title: 'Failed to send message', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const getOtherUser = (conv: ChatConversation) => {
    const otherId = conv.participants.find((p) => p !== user?.id)
    return otherId ? usersById[otherId] : undefined
  }

  if (!user) return null

  return (
    <div className="app-surface min-h-screen">
      <AdminNav />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Admin Chat</h1>
          <p className="text-sm text-muted-foreground">Direct messages with users about reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
          {/* Conversation List */}
          <Card className="md:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loadingConvs ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No conversations yet. Start one from a report.
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => {
                    const other = getOtherUser(conv)
                    const isActive = activeConv?.id === conv.id
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b ${
                          isActive ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {other?.fullName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{other?.fullName || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage?.message || 'No messages yet'}
                          </p>
                        </div>
                        {other?.role && (
                          <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                            {other.role}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Area */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setActiveConv(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {(() => {
                    const other = getOtherUser(activeConv)
                    return (
                      <>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {other?.fullName?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{other?.fullName || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {other?.role} • {other?.phoneNumber || other?.email || ''}
                          </p>
                        </div>
                      </>
                    )
                  })()}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8"
                    onClick={() => loadMessages(activeConv.id)}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMsgs ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                          <Skeleton className="h-10 w-48 rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No messages yet. Start the conversation.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user.id
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-muted rounded-bl-none'
                            }`}
                          >
                            {msg.message && <p>{msg.message}</p>}
                            <p
                              className={`text-xs mt-1 ${
                                isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 p-4 border-t shrink-0">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
