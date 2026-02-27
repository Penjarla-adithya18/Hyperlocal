'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import EmployerNav from '@/components/employer/EmployerNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { workerProfileOps, userOps } from '@/lib/api'
import { ragStore, ragSearch, parseRAGQuery, type RAGSearchResult } from '@/lib/ragEngine'
import type { ResumeData, User } from '@/lib/types'
import {
  Search, Send, Bot, User as UserIcon, FileText, Briefcase,
  Star, ChevronRight, Loader2, Database, Sparkles
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  results?: RAGSearchResult[]
  timestamp: Date
}

export default function ResumeSearchPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [indexing, setIndexing] = useState(true)
  const [indexedCount, setIndexedCount] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Index all worker resumes on page load
  useEffect(() => {
    if (!user || user.role !== 'employer') return
    indexWorkerResumes()
  }, [user])

  const indexWorkerResumes = async () => {
    setIndexing(true)
    try {
      // Profiles-first approach: get all worker profiles (employer-accessible endpoint),
      // then fetch user name/phone per profile in parallel — avoids the admin-only GET /users.
      const allProfiles = await workerProfileOps.getAll()

      // Also try userOps.getAll() as a fallback to get richer user data, but don't block on 403
      let userMap: Map<string, { fullName: string; phoneNumber: string }> = new Map()
      try {
        const allUsers = await userOps.getAll()
        allUsers.filter((u) => u.role === 'worker').forEach((u) => {
          userMap.set(u.id, { fullName: u.fullName, phoneNumber: u.phoneNumber })
        })
      } catch {
        // 403 for non-admins is expected — we'll look up names individually below
      }

      let count = 0
      const BATCH = 6
      for (let i = 0; i < allProfiles.length; i += BATCH) {
        await Promise.all(
          allProfiles.slice(i, i + BATCH).map(async (profile) => {
            try {
              // Get user info (name / phone) — either from bulk cache or individual lookup
              let workerName = userMap.get(profile.userId)?.fullName
              let phone = userMap.get(profile.userId)?.phoneNumber
              if (!workerName) {
                const wUser = await userOps.findById(profile.userId).catch(() => null)
                if (!wUser) return
                workerName = wUser.fullName
                phone = wUser.phoneNumber
              }

              if (profile.resumeText && profile.resumeParsed) {
                // Full resume indexing
                ragStore.index({
                  workerId: profile.userId,
                  workerName,
                  phone,
                  text: profile.resumeText,
                  parsed: profile.resumeParsed,
                })
                count++
              } else if (profile.skills?.length || profile.categories?.length) {
                // Synthetic indexing from skills / categories for non-technical workers
                const parts: string[] = []
                if (profile.bio) parts.push(`About: ${profile.bio}`)
                if (profile.skills?.length) parts.push(`Skills: ${profile.skills.join(', ')}`)
                if (profile.categories?.length) parts.push(`Work types: ${profile.categories.join(', ')}`)
                if (profile.experience) parts.push(`Experience: ${profile.experience}`)
                if (profile.location) parts.push(`Location: ${profile.location}`)
                if (profile.availability) parts.push(`Availability: ${profile.availability}`)

                const syntheticText = parts.join('\n')
                const syntheticParsed: ResumeData = {
                  summary: profile.bio,
                  skills: [...(profile.skills ?? []), ...(profile.categories ?? [])],
                  experience: [],
                  education: [],
                  projects: [],
                }

                ragStore.index({
                  workerId: profile.userId,
                  workerName,
                  phone,
                  text: syntheticText,
                  parsed: syntheticParsed,
                })
                count++
              }
            } catch {
              // Skip workers we can't load
            }
          })
        )
      }

      setIndexedCount(count)

      // Add initial assistant message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: count > 0
          ? `I've indexed **${count} worker profile${count > 1 ? 's' : ''}** (resumes + skill profiles). Ask me anything!\n\nTry:\n• "Show workers with Python or React experience"\n• "Find electricians available on weekends"\n• "Who has plumbing and pipe fitting skills?"\n• "Experienced workers in data analytics"`
          : 'No worker profiles found yet. Once workers sign up and complete their profiles, they\'ll appear here.',
        timestamp: new Date(),
      }])
    } catch (err) {
      toast({ title: 'Error loading data', description: 'Could not load worker resumes', variant: 'destructive' })
    } finally {
      setIndexing(false)
    }
  }

  const handleSearch = async () => {
    const query = input.trim()
    if (!query) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSearching(true)

    try {
      // Parse natural language query into structured filters
      const parsedQuery = await parseRAGQuery(query)

      // Search with RAG engine (keyword + AI re-ranking)
      const results = await ragSearch(parsedQuery)

      // Build assistant response
      let response = ''
      if (results.length === 0) {
        response = `No matching resumes found for "${query}". Try broadening your search or using different keywords.`
      } else {
        response = `Found ${results.length} matching resume${results.length > 1 ? 's' : ''}:`
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response,
        results: results.length > 0 ? results : undefined,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, something went wrong with the search. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setSearching(false)
    }
  }

  if (!user || user.role !== 'employer') {
    return (
      <div className="min-h-screen bg-background">
        <EmployerNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Access restricted to employers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EmployerNav />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Resume Search
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search through applicant resumes using natural language
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              {indexedCount} resume{indexedCount !== 1 ? 's' : ''} indexed
            </Badge>
            {indexing && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Indexing...
              </Badge>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-64 max-h-[calc(100vh-320px)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'items-end' : ''}`}>
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>

                  {/* Search Results */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="space-y-2">
                      {msg.results.map((result, idx) => (
                        <Card key={result.workerId} className="border shadow-sm">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {result.workerName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{result.workerName}</p>
                                  {result.phone && (
                                    <p className="text-xs text-muted-foreground">{result.phone}</p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Score: {result.score}
                              </Badge>
                            </div>

                            {/* Matched Skills */}
                            {result.matchedSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {result.matchedSkills.map((skill) => (
                                  <Badge key={skill} variant="default" className="text-xs py-0">{skill}</Badge>
                                ))}
                              </div>
                            )}

                            {/* Experience summary */}
                            {result.parsed.experience.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <strong>Experience:</strong>{' '}
                                {result.parsed.experience.slice(0, 2).map(e =>
                                  `${e.title} at ${e.company}`
                                ).join('; ')}
                                {result.parsed.experience.length > 2 && ` +${result.parsed.experience.length - 2} more`}
                              </div>
                            )}

                            {/* Projects */}
                            {result.parsed.projects.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                <strong>Projects:</strong>{' '}
                                {result.parsed.projects.slice(0, 2).map(p =>
                                  `${p.name} [${p.technologies.slice(0, 3).join(', ')}]`
                                ).join('; ')}
                              </div>
                            )}

                            {/* AI Explanation */}
                            {result.explanation && (
                              <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">
                                {result.explanation}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-xs">
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {searching && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching resumes...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </CardContent>

          {/* Input Bar */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch() }}
              className="flex gap-2"
            >
              <Input
                placeholder={indexedCount > 0 ? 'Ask anything… e.g. "electricians available weekends" or "Python ML developers"' : 'Loading worker profiles...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={searching || indexing}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={searching || !input.trim() || indexing}
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Quick Search Suggestions */}
        {messages.length <= 1 && indexedCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <p className="text-sm text-muted-foreground w-full mb-1">Quick searches:</p>
            {[
              'Find available electricians',
              'Workers with plumbing skills',
              'Python developers with ML experience',
              'React and Node.js engineers',
              'Experienced data analysts',
              'Construction workers near me',
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setInput(suggestion); }}
              >
                <Search className="h-3 w-3 mr-1" />
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
