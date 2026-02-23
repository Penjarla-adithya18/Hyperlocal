'use client'

import { useState, useEffect, useRef } from 'react'
import EmployerNav from '@/components/employer/EmployerNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { mockDb, mockUserOps } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import { filterChatMessage } from '@/lib/chatFilter'
import { ChatConversation, ChatMessage, User } from '@/lib/types'
import { Send, Search, MessageCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

export default function EmployerChatPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usersById, setUsersById] = useState<Record<string, User>>({})
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Realtime subscription — re-subscribe whenever conversation changes
  useEffect(() => {
    if (!selectedConversation) return

    loadMessages(selectedConversation.id)

    const channel = supabase
      .channel(`chat:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation])

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
    if (userConvs.length > 0 && !selectedConversation) {
      setSelectedConversation(userConvs[0])
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
    <div className="min-h-screen bg-background">
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
                    <div>
                      <CardTitle className="text-lg">
                        {getOtherUser(selectedConversation)?.fullName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Worker</p>
                    </div>
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
                              <p className="text-sm">{message.message}</p>
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
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
    </div>
  )
}
