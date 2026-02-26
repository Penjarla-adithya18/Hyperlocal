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
import { Send, Search, MessageCircle, Flag, AlertCircle, Mic, MicOff } from 'lucide-react'
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

  // Poll for new messages every 5s (replaces Supabase realtime)
  useEffect(() => {
    if (!selectedConversation) return

    loadMessages(selectedConversation.id)

    const interval = setInterval(() => {
      loadMessages(selectedConversation.id)
    }, 5000)

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

    const message = await mockDb.sendMessage({
      conversationId: selectedConversation.id,
      senderId: user.id,
      message: newMessage.trim()
    })

    setMessages((prev) => [...prev, message])
    setNewMessage('')
    loadConversations()
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
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">Chat with workers about job applications</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
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
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
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
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isSent = message.senderId === user?.id
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isSent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{isSent ? message.message : maskSensitiveContent(message.message)}</p>
                              <p className={`text-xs mt-1 ${
                                isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <CardContent className="border-t pt-4">
                  {selectedConversation.jobId && jobsById[selectedConversation.jobId]?.status === 'completed' ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      This conversation is closed — job has been completed.
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message… or use 🎤"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleVoiceInput}
                        title={voiceListening ? 'Stop recording' : 'Voice input (Hindi/Telugu/English)'}
                        className={voiceListening ? 'border-red-400 text-red-500 animate-pulse' : ''}
                      >
                        {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
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
