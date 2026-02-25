'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/contexts/I18nContext'
import { localeLabels, LOCALE_COOKIE, SupportedLocale, locales } from '@/i18n'
import { detectLanguage } from '@/lib/gemini'

// ────────────────────────────────────────────────────────────────────────────
// LanguageSwitcher
// Standalone component with:
//   - Globe dropdown to select en / hi / te
//   - Cookie + localStorage persistence
//   - Optional mic button for voice input language detection
// ────────────────────────────────────────────────────────────────────────────

interface LanguageSwitcherProps {
  /** Show voice input button (defaults to false) */
  showVoice?: boolean
  /** Compact mode — icon only, no label */
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({
  showVoice = false,
  compact = false,
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()
  const [listening, setListening] = useState(false)
  const [detecting, setDetecting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Persist to cookie on locale change so middleware reads it
  useEffect(() => {
    try {
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    } catch {
      // Cookie setting may fail in some environments
    }
  }, [locale])

  const handleSelect = (l: SupportedLocale) => {
    setLocale(l)
  }

  // ── Voice input: record → transcribe → detect language → switch ─────────
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SpeechRecognitionAPI = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Voice input is not supported in this browser.')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionAPI()
    // Allow multiple languages for detection
    recognition.lang = 'hi-IN' // Wide recognition; we detect afterwards
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (!transcript) return
      setDetecting(true)
      try {
        const detected = await detectLanguage(transcript)
        if ((locales as readonly string[]).includes(detected)) {
          setLocale(detected as SupportedLocale)
        }
      } finally {
        setDetecting(false)
        setListening(false)
      }
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const currentLabel = localeLabels[locale as SupportedLocale] ?? localeLabels['en']

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-sm font-medium"
            aria-label="Select language"
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!compact && (
              <span className="hidden sm:inline">{currentLabel}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {(Object.entries(localeLabels) as [SupportedLocale, string][]).map(
            ([code, label]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleSelect(code)}
                className={
                  locale === code ? 'bg-accent font-semibold' : ''
                }
              >
                {label}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showVoice && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleVoice}
          disabled={detecting}
          aria-label={listening ? 'Stop listening' : 'Detect language by voice'}
          title={listening ? 'Stop listening' : 'Speak to auto-detect language'}
          className="relative"
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : listening ? (
            <MicOff className="h-4 w-4 text-red-500 animate-pulse" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

export default LanguageSwitcher
