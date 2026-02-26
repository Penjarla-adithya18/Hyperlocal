'use client'

import { useState, useEffect, useRef } from 'react'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb, mockUserOps, mockReportOps } from '@/lib/api'
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

export default function EmployerChatPage() {
  const { user } = useAuth()
  const { toast } = useToast()
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Poll for new messages every 3s for lower latency (replaces Supabase realtime)
  useEffect(() => {
    if (!selectedConversation) return

    loadMessages(selectedConversation.id)

    const interval = setInterval(() => {
      loadMessages(selectedConversation.id)
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedConversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    if (!user) return
    const userConvs = await mockDb.getConversationsByUser(user.id)
    setConversations(userConvs)
    const participantIds = [...new Set(
      userConvs
        .flatMap((conversation) => conversation.participants)
        .filter((participantId) => participantId !== user.id)
    )]
    if (participantIds.length > 0) {
      const fetchedUsers = await Promise.all(participantIds.map((id) => mockUserOps.findById(id)))
      setUsersById((previous) => {
        const next = { ...previous }
        for (const fetched of fetchedUsers) {
          if (fetched) next[fetched.id] = fetched
        }
        return next
      })
    }
    // Check sessionStorage for a conversation to pre-select (from employer/jobs chat button)
    const targetConvId = sessionStorage.getItem('targetChatConvId')
    if (targetConvId) {
      sessionStorage.removeItem('targetChatConvId')
      const targetConv = userConvs.find(c => c.id === targetConvId)
      if (targetConv) {
        setSelectedConversation(targetConv)
        return
      }
    }
    if (userConvs.length > 0 && !selectedConversation) {
      setSelectedConversation(userConvs[0])
    }
    // Load jobs for completion check
    const jobIds = [...new Set(userConvs.map(c => c.jobId).filter(Boolean) as string[])]
    if (jobIds.length > 0) {
      const allJobs = await mockDb.getAllJobs()
      const jMap: Record<string, Job> = {}
      for (const j of allJobs) {
        if (jobIds.includes(j.id)) jMap[j.id] = j
      }
      setJobsById(jMap)
    }
  }

  const loadMessages = async (conversationId: string) => {
    const convMessages = await mockDb.getMessagesByConversation(conversationId)
    setMessages(convMessages)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    // Safety filter
    const filterResult = filterChatMessage(newMessage.trim())
    if (filterResult.blocked) {
      toast({
        title: 'Message blocked',
        description: filterResult.reason,
        variant: 'destructive',
      })
      return
    }

    // Optimistic UI: show message immediately
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user.id,
      message: newMessage.trim(),
      createdAt: new Date().toISOString(),
      read: false
    }
    setMessages((prev) => [...prev, tempMessage])
    const messageToSend = newMessage.trim()
    setNewMessage('')

    try {
      const message = await mockDb.sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        message: messageToSend
      })
      // Replace temp message with real one
      setMessages((prev) => prev.map(m => m.id === tempMessage.id ? message : m))
      loadConversations()
    } catch (error) {
      // Remove temp message on error
      setMessages((prev) => prev.filter(m => m.id !== tempMessage.id))
      toast({
        title: 'Failed to send message',
        description: 'Please try again',
        variant: 'destructive'
      })
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleReportAbuse = async () => {
    if (!user || !selectedConversation) return
    const otherUser = getOtherUser(selectedConversation)
    if (!otherUser) return
    setSubmittingReport(true)
    try {
      await mockReportOps.create({
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
    recognition.lang = 'hi-IN'
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
                {filteredConversations.length === 0 ? (
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
              <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-2">
                {messages.length === 0 ? (
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

              {/* Mobile Input Area */}
              <div className="pt-4 border-t mt-4">
                {selectedConversation.jobId && jobsById[selectedConversation.jobId]?.status === 'completed' ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-2xl text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    This conversation is closed — job has been completed.
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
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
                      disabled={!newMessage.trim()}
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
                  {filteredConversations.length === 0 ? (
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

            <Card className="lg:col-span-2 flex flex-col">
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
                <ScrollArea className="flex-1 p-4 md:p-6 bg-background">
                  <div className="space-y-2">
                    {messages.length === 0 ? (
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
                </ScrollArea>
                <CardContent className="border-t pt-4 pb-4 bg-background/50">
                  {selectedConversation.jobId && jobsById[selectedConversation.jobId]?.status === 'completed' ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-2xl text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      This conversation is closed — job has been completed.
                    </div>
                  ) : (
                    <div className="flex gap-2 items-end">
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
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
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
