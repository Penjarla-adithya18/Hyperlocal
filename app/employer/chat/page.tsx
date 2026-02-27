'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { db, jobOps, reportOps, userOps } from '@/lib/api'
import { ChatConversation, ChatMessage, Job, User } from '@/lib/types'
import { Send, Search, MessageCircle, Flag, AlertCircle, Mic, MicOff, ChevronLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { filterChatMessage, maskSensitiveContent } from '@/lib/chatFilter'
import { FileUpload } from '@/components/ui/file-upload'
import { uploadChatAttachment, getSignedUrl, isImageFile, isPdfFile, formatFileSize } from '@/lib/supabase/storage'
import { Download, FileText, Image as ImageIcon, File } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/contexts/I18nContext'

export default function EmployerChatPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <EmployerChatPage />
    </Suspense>
  )
}

function EmployerChatPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersById, setUsersById] = useState<Record<string, User>>({})
  const [jobsById, setJobsById] = useState<Record<string, Job>>({})
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportReason, setReportReason] = useState('spam')
  const [reportDescription, setReportDescription] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const activeConvIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (user) {
      const convId = searchParams.get('convId')
      const workerId = searchParams.get('workerId')
      const jobId = searchParams.get('jobId')
      const appId = searchParams.get('appId')
      loadConversations(convId, workerId, jobId, appId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])

  // Poll for new messages every 1.5s for lower latency
  useEffect(() => {
    if (!selectedConversation) return

    // Clear messages immediately when switching conversations
    setMessages([])
    setLoadingMsgs(true)
    isAtBottomRef.current = true
    activeConvIdRef.current = selectedConversation.id
    loadMessages(selectedConversation.id)

    const interval = setInterval(() => {
      loadMessages(selectedConversation.id)
    }, 1500) // 1.5s polling for fast message delivery

    return () => clearInterval(interval)
  }, [selectedConversation?.id])

  // Poll for new conversations every 10s
  useEffect(() => {
    if (!user) return
    const convInterval = setInterval(() => {
      loadConversations()
    }, 10000)
    return () => clearInterval(convInterval)
  }, [user])

  // Only auto-scroll on poll if user is already at the bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Track scroll position on the message container
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const threshold = 80 // px from bottom
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  const loadConversations = async (
    targetConvId?: string | null,
    targetWorkerId?: string | null,
    targetJobId?: string | null,
    targetAppId?: string | null,
  ) => {
    if (!user) return
    setLoadingConvs(true)
    try {
      const userConvs = await db.getConversationsByUser(user.id)
      setConversations(userConvs)
      const participantIds = [...new Set(
        userConvs
          .flatMap((conversation) => conversation.participants)
          .filter((participantId) => participantId !== user.id)
      )]
      if (participantIds.length > 0) {
        const fetchedUsers = await Promise.all(participantIds.map((id) => userOps.findById(id)))
        setUsersById((previous) => {
          const next = { ...previous }
          for (const fetched of fetchedUsers) {
            if (fetched) next[fetched.id] = fetched
          }
          return next
        })
      }

      // Load jobs for completion status checks (include targetJobId in case it's a new conv)
      const jobIds = [...new Set(
        [...userConvs.map(c => c.jobId), targetJobId].filter(Boolean) as string[]
      )]
      if (jobIds.length > 0) {
        const allJobs = await jobOps.getAll()
        const jMap: Record<string, Job> = {}
        for (const j of allJobs) { if (jobIds.includes(j.id)) jMap[j.id] = j }
        setJobsById(jMap)
      }

      const hasTarget = !!(targetConvId || targetWorkerId)

      // 1. Exact conversation ID (passed via URL param ?convId=xxx from handleChatWithWorker)
      if (targetConvId) {
        const found = userConvs.find(c => c.id === targetConvId)
        if (found) { setSelectedConversation(found); return }
      }

      // 2. Fallback: find existing conv by worker + job (when convId lookup misses)
      if (targetWorkerId) {
        let found: typeof userConvs[0] | null = userConvs.find(c =>
          c.participants.includes(targetWorkerId) &&
          (!targetJobId || c.jobId === targetJobId)
        ) ?? null

        // 2b. No existing conv found — create it now (handles failed creation on job detail page)
        if (!found) {
          try {
            found = await db.createConversation({
              workerId: targetWorkerId,
              employerId: user.id,
              jobId: targetJobId || '',
              applicationId: targetAppId || undefined,
              participants: [targetWorkerId, user.id],
            })
            if (found) setConversations(prev => [found!, ...prev])
          } catch { /* ignore */ }
        }

        if (found) { setSelectedConversation(found); return }
      }

      // 3. No specific target — auto-select first conversation (direct /employer/chat navigation)
      if (!hasTarget && userConvs.length > 0 && !selectedConversation) {
        setSelectedConversation(userConvs[0])
      }
    } finally {
      setLoadingConvs(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const convMessages = await db.getMessagesByConversation(conversationId)
      // Stale-fetch guard: discard if conversation changed while fetching
      if (activeConvIdRef.current !== conversationId) return
      setMessages(convMessages)
      setLoadingMsgs(false)
      if (user) {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id !== conversationId || !conv.lastMessage) return conv
            if (conv.lastMessage.senderId === user.id || conv.lastMessage.read) return conv
            return {
              ...conv,
              lastMessage: { ...conv.lastMessage, read: true },
            }
          })
        )
      }
    } catch {
      // Silently swallow timeout/network errors during polling — the next poll will retry
      setLoadingMsgs(false)
    }
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !user) return

    // Safety filter
    if (newMessage.trim()) {
      const filterResult = filterChatMessage(newMessage.trim())
      if (filterResult.blocked) {
        toast({
          title: 'Message blocked',
          description: filterResult.reason,
          variant: 'destructive',
        })
        return
      }
    }

    setUploading(true)
    let attachmentData: { url: string; name: string; type: string; size: number } | undefined
    let tempMessage: ChatMessage | undefined

    try {
      // Upload file if attached
      if (selectedFile) {
        const uploadResult = await uploadChatAttachment(
          selectedFile,
          user.id,
          selectedConversation.id
        )
        attachmentData = {
          url: uploadResult.url,
          name: uploadResult.name,
          type: uploadResult.type,
          size: uploadResult.size,
        }
      }

      // Optimistic UI: show message immediately
      tempMessage = {
        id: `temp-${Date.now()}`,
        conversationId: selectedConversation.id,
        senderId: user.id,
        message: newMessage.trim() || (attachmentData ? `Sent ${attachmentData.name}` : ''),
        createdAt: new Date().toISOString(),
        read: false,
        ...(attachmentData && {
          attachmentUrl: attachmentData.url,
          attachmentName: attachmentData.name,
          attachmentType: attachmentData.type,
          attachmentSize: attachmentData.size,
        }),
      }
      setMessages((prev) => [...prev, tempMessage!])
      const messageToSend = tempMessage!.message
      setNewMessage('')
      setSelectedFile(null)
      scrollToBottom(true)

      const message = await db.sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        message: messageToSend,
        ...(attachmentData && {
          attachmentUrl: attachmentData.url,
          attachmentName: attachmentData.name,
          attachmentType: attachmentData.type,
          attachmentSize: attachmentData.size,
        }),
      })
      // Replace temp message with real one
      setMessages((prev) => prev.map(m => m.id === tempMessage!.id ? message : m))
      loadConversations()
    } catch (error) {
      // Remove only the failed temp message
      if (tempMessage) setMessages((prev) => prev.filter(m => m.id !== tempMessage!.id))
      toast({
        title: 'Failed to send message',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const scrollToBottom = (force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      isAtBottomRef.current = true
    }
  }

  const handleReportAbuse = async () => {
    if (!user || !selectedConversation) return
    const otherUser = getOtherUser(selectedConversation)
    if (!otherUser) return
    setSubmittingReport(true)
    try {
      await reportOps.create({
        reporterId: user.id,
        reportedUserId: otherUser.id,
        type: 'chat_abuse',
        reason: reportReason,
        description: reportDescription || reportReason,
        status: 'pending',
      })
      toast({ title: 'Report submitted', description: 'Our team will review and take action.' })
      setReportDialogOpen(false)
      setReportReason('spam')
      setReportDescription('')
    } catch {
      toast({ title: 'Failed to submit report', variant: 'destructive' })
    } finally {
      setSubmittingReport(false)
    }
  }

  const toggleVoiceInput = () => {
    if (voiceListening) {
      recognitionRef.current?.stop()
      setVoiceListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SpeechRecognitionAPI = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      toast({ title: 'Voice input not supported in this browser', variant: 'destructive' })
      return
    }

    const recognition = new SpeechRecognitionAPI()
    const localeToSpeechLang: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }
    recognition.lang = localeToSpeechLang[locale] ?? 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setVoiceListening(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript) {
        setNewMessage((prev: string) => (prev ? prev + ' ' + transcript : transcript))
      }
      setVoiceListening(false)
    }

    recognition.onerror = () => setVoiceListening(false)
    recognition.onend = () => setVoiceListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  const getOtherUser = (conversation: ChatConversation): User | null => {
    if (!user) return null
    const otherUserId = conversation.participants.find(id => id !== user.id)
    return otherUserId ? usersById[otherUserId] || null : null
  }

  const filteredConversations = conversations.filter(conv => {
    const otherUser = getOtherUser(conv)
    if (!otherUser) return false
    return otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="app-surface">
      <EmployerNav />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 md:py-8 pb-28 md:pb-8">
        {/* Mobile: Full-screen conversation list or chat */}
        <div className="lg:hidden h-screen flex flex-col">
          {!selectedConversation ? (
            // Mobile: Conversation List
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-foreground mb-2">Messages</h1>
                <p className="text-sm text-muted-foreground">Chat with workers about your jobs</p>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {loadingConvs ? (
                  <div className="space-y-3 px-1 pt-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const otherUser = getOtherUser(conv)
                    if (!otherUser) return null

                    const unreadCount = conv.lastMessage?.senderId !== user?.id && 
                                       !conv.lastMessage?.read ? 1 : 0
                    const lastMessageTime = conv.lastMessage?.createdAt 
                      ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''

                    return (
                      <div
                        key={conv.id}
                        className="card-modern flex items-center gap-3 p-4 cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                            {otherUser.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-base truncate">
                              {otherUser.fullName}
                            </p>
                            {lastMessageTime && (
                              <p className="text-xs text-muted-foreground ml-2 shrink-0">
                                {lastMessageTime}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {conv.lastMessage ? (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.message}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No messages yet</p>
                            )}
                            {unreadCount > 0 && (
                              <Badge variant="default" className="ml-2 shrink-0">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            // Mobile: Individual Chat View
            <div className="flex flex-col h-full">
              {/* Mobile Chat Header with Back Button */}
              <div className="flex items-center gap-3 pb-4 border-b mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                  className="shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar>
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {getOtherUser(selectedConversation)?.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {getOtherUser(selectedConversation)?.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">Worker</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  title="Report abuse"
                  onClick={() => setReportDialogOpen(true)}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Messages Area with Independent Scroll */}
              <div
                className="flex-1 min-h-0 overflow-y-auto px-2 space-y-2"
                onScroll={handleMessagesScroll}
              >
                {loadingMsgs ? (
                  <div className="space-y-3 py-4">
                    {[true, false, true, false, true].map((isSent, i) => (
                      <div key={i} className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                        {!isSent && <Skeleton className="h-7 w-7 rounded-full shrink-0" />}
                        <Skeleton className={`h-10 rounded-2xl ${isSent ? 'w-40' : 'w-52'}`} />
                        {isSent && <div className="w-7" />}
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isSent = message.senderId === user?.id
                    const showAvatar = !isSent && (idx === 0 || messages[idx - 1].senderId !== message.senderId)
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        {!isSent && (
                          <Avatar className={`h-7 w-7 shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                            <AvatarFallback className="bg-accent/10 text-accent text-xs">
                              {getOtherUser(selectedConversation)?.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[75%] px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
                            isSent
                              ? 'bg-gradient-to-br from-accent to-accent/90 text-accent-foreground rounded-[20px] rounded-br-md'
                              : 'bg-muted/80 text-foreground rounded-[20px] rounded-bl-md'
                          }`}
                        >
                          {message.attachmentUrl && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              {isImageFile(message.attachmentName || '') ? (
                                <img
                                  src={message.attachmentUrl}
                                  alt={message.attachmentName}
                                  className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                                />
                              ) : (
                                <a
                                  href={message.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    isSent ? 'bg-accent-foreground/10' : 'bg-background/50'
                                  } hover:opacity-80 transition-opacity`}
                                >
                                  {isPdfFile(message.attachmentName || '') ? (
                                    <FileText className="h-5 w-5" />
                                  ) : (
                                    <File className="h-5 w-5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{message.attachmentName}</p>
                                    {message.attachmentSize && (
                                      <p className="text-[10px] opacity-70">{formatFileSize(message.attachmentSize)}</p>
                                    )}
                                  </div>
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          )}
                          {message.message && (
                            <p className="text-[15px] leading-relaxed break-words">{isSent ? message.message : maskSensitiveContent(message.message)}</p>
                          )}
                          <p className={`text-[11px] mt-1.5 ${
                            isSent ? 'text-accent-foreground/60' : 'text-muted-foreground/60'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {isSent && <div className="w-7" />}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Mobile Input Area */}
              <div className="pt-4 border-t mt-4">
                {selectedConversation.jobId && jobsById[selectedConversation.jobId]?.status === 'completed' ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-2xl text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This conversation is closed — job has been completed.
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <FileUpload
                      onFileSelect={setSelectedFile}
                      onFileRemove={() => setSelectedFile(null)}
                      selectedFile={selectedFile}
                      accept="image/*,.pdf,.doc,.docx"
                      maxSizeMB={5}
                      disabled={uploading}
                    />
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        className="rounded-full border-2 pr-12 h-11 focus-visible:ring-accent/30 transition-all"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleVoiceInput}
                        title={voiceListening ? 'Stop recording' : 'Voice input'}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full ${voiceListening ? 'text-red-500 animate-pulse bg-red-50' : 'text-muted-foreground hover:text-accent'}`}
                      >
                        {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      size="icon" 
                      className="h-11 w-11 rounded-full bg-accent hover:bg-accent/90 shadow-md hover:shadow-lg transition-all"
                      disabled={!newMessage.trim() && !selectedFile}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden lg:block">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Messages</h1>
            <p className="text-sm md:text-base text-muted-foreground">Chat with workers about your jobs</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 h-[calc(100vh-250px)]">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <ScrollArea className="h-[calc(100vh-380px)]">
                <CardContent className="space-y-2">
                  {loadingConvs ? (
                    <div className="space-y-3 py-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => {
                      const otherUser = getOtherUser(conv)
                      if (!otherUser) return null

                      const isSelected = selectedConversation?.id === conv.id
                      const unreadCount = conv.lastMessage?.senderId !== user?.id && 
                                         !conv.lastMessage?.read ? 1 : 0

                      return (
                        <div
                          key={conv.id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-accent/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <Avatar>
                            <AvatarFallback className="bg-accent text-accent-foreground">
                              {otherUser.fullName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-semibold text-sm truncate">
                                {otherUser.fullName}
                              </p>
                              {unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage.message}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </ScrollArea>
            </Card>

            <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getOtherUser(selectedConversation)?.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {getOtherUser(selectedConversation)?.fullName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Worker</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      title="Report abuse"
                      onClick={() => setReportDialogOpen(true)}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <div
                  className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-background"
                  onScroll={handleMessagesScroll}
                >
                  <div className="space-y-2">
                    {loadingMsgs ? (
                      <div className="space-y-3 py-4">
                        {[true, false, true, false, true].map((isSent, i) => (
                          <div key={i} className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                            {!isSent && <Skeleton className="h-7 w-7 rounded-full shrink-0" />}
                            <Skeleton className={`h-10 rounded-2xl ${isSent ? 'w-40' : 'w-52'}`} />
                            {isSent && <div className="w-7" />}
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="h-16 w-16 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message, idx) => {
                        const isSent = message.senderId === user?.id
                        const showAvatar = !isSent && (idx === 0 || messages[idx - 1].senderId !== message.senderId)
                        return (
                          <div
                            key={message.id}
                            className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                          >
                            {!isSent && (
                              <Avatar className={`h-7 w-7 shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                  {getOtherUser(selectedConversation)?.fullName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[75%] sm:max-w-[60%] px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
                                isSent
                                  ? 'bg-gradient-to-br from-accent to-accent/90 text-accent-foreground rounded-[20px] rounded-br-md'
                                  : 'bg-muted/80 text-foreground rounded-[20px] rounded-bl-md'
                              }`}
                            >
                              {message.attachmentUrl && (
                                <div className="mb-2 rounded-lg overflow-hidden">
                                  {isImageFile(message.attachmentName || '') ? (
                                    <img
                                      src={message.attachmentUrl}
                                      alt={message.attachmentName}
                                      className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                                    />
                                  ) : (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 p-2 rounded-lg ${
                                        isSent ? 'bg-accent-foreground/10' : 'bg-background/50'
                                      } hover:opacity-80 transition-opacity`}
                                    >
                                      {isPdfFile(message.attachmentName || '') ? (
                                        <FileText className="h-5 w-5" />
                                      ) : (
                                        <File className="h-5 w-5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{message.attachmentName}</p>
                                        {message.attachmentSize && (
                                          <p className="text-[10px] opacity-70">{formatFileSize(message.attachmentSize)}</p>
                                        )}
                                      </div>
                                      <Download className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className="text-[15px] leading-relaxed break-words">{isSent ? message.message : maskSensitiveContent(message.message)}</p>
                              <p className={`text-[11px] mt-1.5 ${
                                isSent ? 'text-accent-foreground/60' : 'text-muted-foreground/60'
                              }`}>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {isSent && <div className="w-7" />}
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <CardContent className="border-t pt-4 pb-4 bg-background/50">
                  {selectedConversation.jobId && jobsById[selectedConversation.jobId]?.status === 'completed' ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-2xl text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      This conversation is closed — job has been completed.
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
                      <FileUpload
                        onFileSelect={setSelectedFile}
                        onFileRemove={() => setSelectedFile(null)}
                        selectedFile={selectedFile}
                        accept="image/*,.pdf,.doc,.docx"
                        maxSizeMB={5}
                        disabled={uploading}
                      />
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                          className="rounded-full border-2 pr-12 h-11 focus-visible:ring-accent/30 transition-all"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleVoiceInput}
                          title={voiceListening ? 'Stop recording' : 'Voice input'}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full ${voiceListening ? 'text-red-500 animate-pulse bg-red-50' : 'text-muted-foreground hover:text-accent'}`}
                        >
                          {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button 
                        onClick={handleSendMessage} 
                        size="icon" 
                        className="h-11 w-11 rounded-full bg-accent hover:bg-accent/90 shadow-md hover:shadow-lg transition-all"
                        disabled={!newMessage.trim() && !selectedFile}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                {loadingConvs ? (
                  <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ) : (
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the list to start chatting
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
        </div>
      </main>

      {/* Report Abuse Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Abuse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-3 block">Reason for report</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="spam" id="er-spam" />
                  <Label htmlFor="er-spam">Spam or fake profile</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="inappropriate" id="er-inappropriate" />
                  <Label htmlFor="er-inappropriate">Inappropriate or offensive content</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="payment_outside_platform" id="er-payment" />
                  <Label htmlFor="er-payment">Requesting payment outside platform</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="harassment" id="er-harassment" />
                  <Label htmlFor="er-harassment">Harassment or threats</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="scam" id="er-scam" />
                  <Label htmlFor="er-scam">Scam or fraudulent activity</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="er-report-desc" className="text-sm font-medium mb-1 block">
                Additional details <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="er-report-desc"
                placeholder="Describe the issue..."
                rows={3}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReportAbuse} disabled={submittingReport}>
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
