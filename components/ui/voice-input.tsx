'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onResult: (transcript: string) => void
  lang?: string
  className?: string
  /** When true, appends transcript to existing value. Default: replace */
  append?: boolean
}

/* Web Speech API type shim */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
declare global {
  interface Window {
    readonly SpeechRecognition?: new () => SpeechRecognitionInstance
    readonly webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

type State = 'idle' | 'listening' | 'processing'

/**
 * Mic button that uses the Web Speech API.
 * - Works in Chrome/Edge (Chromium). Safari & Firefox lack support.
 * - On unsupported browsers, button is hidden.
 */
export function VoiceInput({ onResult, lang = 'en-IN', className, append }: VoiceInputProps) {
  const [state, setState] = useState<State>('idle')
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (SR) setSupported(true)
  }, [])

  if (!supported) return null

  const start = () => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      setState('processing')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(' ')
        .trim()
        .replace(/[.!?,;:]+$/, '') // strip trailing punctuation added by speech recognition
      onResult(transcript)
      setTimeout(() => setState('idle'), 600)
    }

    rec.onerror = () => setState('idle')
    rec.onend = () => { if (state === 'listening') setState('idle') }

    recognitionRef.current = rec
    rec.start()
    setState('listening')
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setState('idle')
  }

  const toggle = () => (state === 'listening' ? stop() : start())

  return (
    <Button
      type="button"
      variant={state === 'listening' ? 'destructive' : 'outline'}
      size="icon"
      className={cn('shrink-0 transition-all', state === 'listening' && 'animate-pulse', className)}
      onClick={toggle}
      title={state === 'listening' ? 'Stop recording' : 'Speak to fill'}
    >
      {state === 'processing' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : state === 'listening' ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  )
}
