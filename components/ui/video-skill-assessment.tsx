'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import {
  Loader2,
  Video,
  VideoOff,
  Clock,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Mic,
  MicOff,
  Camera,
  Send,
  Globe,
  ArrowRight,
  SkipForward,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MultilingualQuestion {
  en: string
  hi: string
  te: string
}

export interface VideoAssessmentResult {
  skill: string
  submitted: boolean
  assessmentId?: string
  verdict?: 'approved' | 'rejected' | 'pending'
  verdictReason?: string
  score?: number
}

interface VideoSkillAssessmentProps {
  skills: string[]
  workerId: string
  onComplete: (results: VideoAssessmentResult[]) => void
  onCancel: () => void
  open: boolean
}

type Phase = 'intro' | 'loading' | 'read-question' | 'recording' | 'submitting' | 'skill-done' | 'all-done'
type Language = 'en' | 'hi' | 'te'

const LANG_LABELS: Record<Language, string> = {
  en: '🇬🇧 English',
  hi: '🇮🇳 हिन्दी',
  te: '🇮🇳 తెలుగు',
}

const QUESTION_READ_TIME_S = 60  // 1 minute to read question
const RECORDING_TIME_S = 60      // 1 minute to record answer
const MAX_VIDEO_SIZE_MB = 8      // Keep under Next.js body limit (base64 adds ~33%)

// ── Audio Analysis Helpers ────────────────────────────────────────────────────

interface AudioMetrics {
  avgVolume: number
  volumeVariance: number
  silenceRatio: number
  peakCount: number
  zeroCrossings: number
  speechRateVariance: number
}

class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private volumes: number[] = []
  private silentFrames = 0
  private totalFrames = 0
  private peaks = 0
  private lastVolume = 0
  private intervalId: ReturnType<typeof setInterval> | null = null

  start(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.source = this.audioContext.createMediaStreamSource(stream)
      this.source.connect(this.analyser)

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.intervalId = setInterval(() => {
        if (!this.analyser) return
        this.analyser.getByteTimeDomainData(dataArray)

        // Calculate RMS volume
        let sum = 0
        let zeroCrossings = 0
        for (let i = 0; i < dataArray.length; i++) {
          const val = (dataArray[i] - 128) / 128
          sum += val * val
          if (i > 0) {
            const prev = (dataArray[i - 1] - 128) / 128
            if ((val >= 0 && prev < 0) || (val < 0 && prev >= 0)) {
              zeroCrossings++
            }
          }
        }
        const rms = Math.sqrt(sum / dataArray.length)
        this.volumes.push(rms)
        this.totalFrames++

        if (rms < 0.02) this.silentFrames++

        // Detect peaks (emphasis)
        if (rms > this.lastVolume + 0.05 && rms > 0.05) this.peaks++
        this.lastVolume = rms
      }, 100) // Sample every 100ms
    } catch (e) {
      console.warn('AudioAnalyzer: Failed to start', e)
    }
  }

  stop(): AudioMetrics {
    if (this.intervalId) clearInterval(this.intervalId)
    if (this.source) this.source.disconnect()
    if (this.audioContext) this.audioContext.close()

    const avgVolume = this.volumes.length > 0
      ? this.volumes.reduce((a, b) => a + b, 0) / this.volumes.length
      : 0

    const volumeVariance = this.volumes.length > 1
      ? this.volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / this.volumes.length
      : 0

    // Calculate speech rate variance using windowed averages
    const windowSize = 10
    const windowAvgs: number[] = []
    for (let i = 0; i + windowSize <= this.volumes.length; i += windowSize) {
      const windowSlice = this.volumes.slice(i, i + windowSize)
      windowAvgs.push(windowSlice.reduce((a, b) => a + b, 0) / windowSize)
    }
    const avgRate = windowAvgs.length > 0
      ? windowAvgs.reduce((a, b) => a + b, 0) / windowAvgs.length
      : 0
    const speechRateVariance = windowAvgs.length > 1
      ? windowAvgs.reduce((sum, v) => sum + Math.pow(v - avgRate, 2), 0) / windowAvgs.length
      : 0

    return {
      avgVolume,
      volumeVariance,
      silenceRatio: this.totalFrames > 0 ? this.silentFrames / this.totalFrames : 0,
      peakCount: this.peaks,
      zeroCrossings: 0, // Simplified — full calculation would need more data
      speechRateVariance,
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VideoSkillAssessment({
  skills,
  workerId,
  onComplete,
  onCancel,
  open,
}: VideoSkillAssessmentProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentSkillIdx, setCurrentSkillIdx] = useState(0)
  const [language, setLanguage] = useState<Language>('en')
  const [question, setQuestion] = useState<MultilingualQuestion | null>(null)
  const [expectedAnswer, setExpectedAnswer] = useState('')
  const [timer, setTimer] = useState(0)
  const [results, setResults] = useState<VideoAssessmentResult[]>([])
  const [error, setError] = useState('')

  // Webcam & recording
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null)
  const audioMetricsRef = useRef<AudioMetrics | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs to avoid stale closures in recording pipeline
  const currentSkillRef = useRef('')
  const questionRef = useRef<MultilingualQuestion | null>(null)
  const expectedAnswerRef = useRef('')
  const languageRef = useRef<Language>('en')
  const submitRecordingRef = useRef<() => Promise<void>>(async () => {})

  const currentSkill = skills[currentSkillIdx] ?? ''

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Keep refs in sync with state (avoids stale closures in intervals/callbacks)
  useEffect(() => { currentSkillRef.current = currentSkill }, [currentSkill])
  useEffect(() => { questionRef.current = question }, [question])
  useEffect(() => { expectedAnswerRef.current = expectedAnswer }, [expectedAnswer])
  useEffect(() => { languageRef.current = language }, [language])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setPhase('intro')
      setCurrentSkillIdx(0)
      setResults([])
      setError('')
      setTimer(0)
    }
  }, [open])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (audioAnalyzerRef.current) {
      audioMetricsRef.current = audioAnalyzerRef.current.stop()
      audioAnalyzerRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Phase: Load question ────────────────────────────────────────────────────
  const loadQuestion = useCallback(async () => {
    setPhase('loading')
    setError('')
    try {
      const res = await fetch('/api/ai/skill-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: currentSkill }),
      })
      if (!res.ok) throw new Error('Failed to generate question')
      const data = await res.json()
      setQuestion(data.question)
      setExpectedAnswer(data.expected_answer)
      startQuestionPhase()
    } catch (e) {
      setError('Failed to load question. Please try again.')
      setPhase('intro')
    }
  }, [currentSkill])

  // ── Phase: Show question for 1 minute ───────────────────────────────────────
  const startQuestionPhase = useCallback(() => {
    setPhase('read-question')
    setTimer(QUESTION_READ_TIME_S)
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0 // useEffect handles startRecording transition
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // ── Phase: Record video for 1 minute ────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setPhase('recording')
    setTimer(RECORDING_TIME_S)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: true,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Start audio analysis
      const analyzer = new AudioAnalyzer()
      analyzer.start(stream)
      audioAnalyzerRef.current = analyzer

      // Start recording
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 250_000,  // 250 kbps — keeps 1 min video under 3 MB
        audioBitsPerSecond: 32_000,   // 32 kbps audio
      })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        // Recording finished — handled in submitRecording
      }

      recorder.start(1000) // Collect data every second

      // Timer countdown — only decrements, useEffect handles finishRecording
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = null
            return 0 // useEffect handles finishRecording transition
          }
          return prev - 1
        })
      }, 1000)
    } catch (e) {
      console.error('Failed to start camera:', e)
      setError('Camera access denied. Please allow camera and microphone permissions.')
      setPhase('intro')
    }
  }, [])

  // ── Stop recording & submit ─────────────────────────────────────────────────
  const finishRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop audio analyzer to get metrics
    if (audioAnalyzerRef.current) {
      audioMetricsRef.current = audioAnalyzerRef.current.stop()
      audioAnalyzerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop camera after a brief delay to let final data chunk flush
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      submitRecordingRef.current() // Use ref to always get latest submitRecording
    }, 500)
  }, [])

  const submitRecording = useCallback(async () => {
    setPhase('submitting')

    // Read from refs to avoid stale closures
    const skill = currentSkillRef.current
    const q = questionRef.current
    const ea = expectedAnswerRef.current

    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })

      if (blob.size < 1000) {
        console.warn('[submit] Recording blob too small:', blob.size, 'bytes')
      }

      const sizeMB = blob.size / (1024 * 1024)
      console.log(`[submit] Video blob: ${sizeMB.toFixed(2)} MB`)

      // Always use FormData — avoids 33% base64 overhead that caused 10MB limit errors
      const fd = new FormData()
      fd.append('video', blob, `assessment-${Date.now()}.webm`)
      fd.append('workerId', workerId)
      fd.append('skill', skill)
      fd.append('question', typeof q === 'string' ? q : JSON.stringify(q))
      fd.append('expectedAnswer', ea)
      fd.append('language', languageRef.current)  // worker's chosen language → Whisper hint
      fd.append('videoDurationMs', String(RECORDING_TIME_S * 1000))
      fd.append('audioMetrics', JSON.stringify(audioMetricsRef.current))

      const res = await fetch('/api/ai/skill-video-submit', {
        method: 'POST',
        body: fd, // Browser sets multipart boundary automatically
      })

      const data = await res.json()

      setResults(prev => [...prev, {
        skill,
        submitted: res.ok,
        assessmentId: data.assessmentId,
        verdict: data.verdict ?? 'pending',
        verdictReason: data.verdictReason ?? (data.error || ''),
        score: data.score ?? undefined,
      }])

      setPhase('skill-done')
    } catch (e) {
      console.error('Submit error:', e)
      setResults(prev => [...prev, {
        skill,
        submitted: false,
        verdict: 'pending',
        verdictReason: 'Submission failed — will be retried.',
      }])
      setPhase('skill-done')
    }
  }, [workerId])

  // Keep submitRecordingRef in sync (finishRecording uses this ref)
  useEffect(() => { submitRecordingRef.current = submitRecording }, [submitRecording])

  // ── Timer-expired phase transitions ─────────────────────────────────────────
  // Clean separation: intervals ONLY count down, useEffect fires side effects.
  // Guard: only transition when timer counts DOWN to 0 (timerRef was active),
  // not when timer is already 0 from init/reset.
  const timerExpiredRef = useRef(false)
  useEffect(() => {
    // Mark that a timer is actively counting (set by startQuestionPhase / startRecording)
    if (timer > 0) {
      timerExpiredRef.current = true
    }
    // Only fire transitions when timer was actively counting and just hit 0
    if (timer === 0 && timerExpiredRef.current) {
      timerExpiredRef.current = false
      if (phase === 'read-question') {
        startRecording()
      } else if (phase === 'recording') {
        finishRecording()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, phase]) // startRecording & finishRecording are stable ([] deps)

  // ── Move to next skill ──────────────────────────────────────────────────────
  const nextSkill = useCallback(() => {
    if (currentSkillIdx + 1 < skills.length) {
      setCurrentSkillIdx(prev => prev + 1)
      setQuestion(null)
      setExpectedAnswer('')
      setTimer(0)
      setPhase('intro')
    } else {
      setPhase('all-done')
    }
  }, [currentSkillIdx, skills.length])

  // ── Format timer ────────────────────────────────────────────────────────────
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stopStream(); onCancel() } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* ── INTRO ─────────────────────────────────────────────────────────── */}
        {phase === 'intro' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Skill Verification — {currentSkill}
              </DialogTitle>
              <DialogDescription>
                Video-based skill assessment ({currentSkillIdx + 1} of {skills.length})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4" /> How it works
                </h3>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li><strong>Read the question</strong> — A practical scenario will appear for 1 minute. Read and think about your answer.</li>
                  <li><strong>Record your answer</strong> — Your webcam turns on and records for 1 minute. Explain your answer verbally.</li>
                  <li><strong>Instant result</strong> — AI analyzes your answer and verifies your skill automatically.</li>
                </ol>
              </Card>

              <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Important
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Your video and audio will be analyzed for authenticity</li>
                  <li>• Do NOT read from a screen, phone, or script</li>
                  <li>• Do NOT use AI voice tools (e.g., Parrot.ai)</li>
                  <li>• Answer in your own words from your experience</li>
                  <li>• You need camera & microphone permission</li>
                </ul>
              </Card>

              {/* Language selector */}
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Globe className="w-4 h-4" /> Question Language
                </label>
                <div className="flex gap-2">
                  {(Object.entries(LANG_LABELS) as [Language, string][]).map(([code, label]) => (
                    <Button
                      key={code}
                      type="button"
                      variant={language === code ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage(code)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={loadQuestion} className="gap-2">
                <ArrowRight className="w-4 h-4" /> Start Assessment
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── LOADING ───────────────────────────────────────────────────────── */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Generating question for <strong>{currentSkill}</strong>...</p>
            <p className="text-sm text-muted-foreground">AI is creating a practical scenario in multiple languages</p>
          </div>
        )}

        {/* ── READ QUESTION (1 minute) ──────────────────────────────────────── */}
        {phase === 'read-question' && question && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Read & Prepare — {currentSkill}
              </DialogTitle>
              <DialogDescription>
                Read the scenario below. Your camera will turn on in {formatTime(timer)}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Timer bar */}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <Progress value={(timer / QUESTION_READ_TIME_S) * 100} className="flex-1" />
                <Badge variant="secondary" className="text-lg font-mono min-w-[60px] justify-center">
                  {formatTime(timer)}
                </Badge>
              </div>

              {/* Language tabs */}
              <div className="flex gap-2 border-b pb-2">
                {(Object.entries(LANG_LABELS) as [Language, string][]).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                      language === code
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setLanguage(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Question display */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <p className="text-lg leading-relaxed font-medium">
                  {question[language] || question.en}
                </p>
              </Card>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="w-4 h-4" />
                <span>Camera will automatically turn on when time is up. Prepare your answer.</span>
              </div>

              {/* Skip to recording button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  // Stop the read-question timer
                  if (timerRef.current) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                  }
                  timerExpiredRef.current = false
                  // Jump straight to recording
                  startRecording()
                }}
              >
                <SkipForward className="w-4 h-4" />
                Skip to Recording
              </Button>
            </div>
          </>
        )}

        {/* ── RECORDING (1 minute) ──────────────────────────────────────────── */}
        {phase === 'recording' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                Recording — {currentSkill}
              </DialogTitle>
              <DialogDescription>
                Explain your answer. Speak clearly and naturally.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Timer bar */}
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-red-500" />
                <Progress value={(timer / RECORDING_TIME_S) * 100} className="flex-1 [&>div]:bg-red-500" />
                <Badge variant="destructive" className="text-lg font-mono min-w-[60px] justify-center animate-pulse">
                  {formatTime(timer)}
                </Badge>
              </div>

              {/* Video preview */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium bg-black/50 px-2 py-0.5 rounded">
                    REC {formatTime(timer)}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-black/50 text-white border-0">
                    <Mic className="w-3 h-3 mr-1" /> Audio recording
                  </Badge>
                </div>
              </div>

              {/* Quick reference of the question */}
              <Card className="p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Question:</p>
                <p className="text-sm">{question?.[language] || question?.en}</p>
              </Card>

              <Button
                variant="destructive"
                onClick={finishRecording}
                className="w-full gap-2"
              >
                <Send className="w-4 h-4" /> Finish & Submit Early
              </Button>
            </div>
          </>
        )}

        {/* ── SUBMITTING ────────────────────────────────────────────────────── */}
        {phase === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-lg font-medium">Analyzing your answer...</p>
            <p className="text-sm text-muted-foreground">Uploading video → Transcribing audio → Checking answer → Auto-verifying skill</p>
            <p className="text-xs text-muted-foreground">This may take 15–30 seconds</p>
          </div>
        )}

        {/* ── SKILL DONE ────────────────────────────────────────────────────── */}
        {phase === 'skill-done' && (() => {
          const latestResult = results[results.length - 1]
          const v = latestResult?.verdict
          return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {v === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {v === 'rejected' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                {v === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                {v === 'approved' ? 'Skill Verified!' : v === 'rejected' ? 'Assessment Not Passed' : 'Under Review'} — {currentSkill}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {v === 'approved' && (
                <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Skill Verified ✓</span>
                    {latestResult?.score != null && (
                      <Badge className="ml-auto bg-green-600">{latestResult.score}/100</Badge>
                    )}
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your <strong>{currentSkill}</strong> skill has been verified automatically.
                    It will now appear as &quot;Verified&quot; on your profile.
                  </p>
                </Card>
              )}
              {v === 'rejected' && (
                <Card className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-700 dark:text-red-400">Not Passed</span>
                    {latestResult?.score != null && (
                      <Badge variant="destructive" className="ml-auto">{latestResult.score}/100</Badge>
                    )}
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {latestResult?.verdictReason || 'Your answer did not meet the required criteria.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can retry this assessment later from your profile.
                  </p>
                </Card>
              )}
              {v === 'pending' && (
                <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Under Review</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your answer for <strong>{currentSkill}</strong> needs additional review.
                    An admin will check it shortly.
                  </p>
                </Card>
              )}

              {currentSkillIdx + 1 < skills.length && (
                <p className="text-sm text-muted-foreground">
                  Next skill: <strong>{skills[currentSkillIdx + 1]}</strong> ({currentSkillIdx + 2} of {skills.length})
                </p>
              )}
            </div>

            <DialogFooter>
              {currentSkillIdx + 1 < skills.length ? (
                <Button onClick={nextSkill} className="gap-2">
                  <ArrowRight className="w-4 h-4" /> Next Skill
                </Button>
              ) : (
                <Button onClick={() => { setPhase('all-done') }} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" /> View Summary
                </Button>
              )}
            </DialogFooter>
          </>
          )
        })()}

        {/* ── ALL DONE ──────────────────────────────────────────────────────── */}
        {phase === 'all-done' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Assessment Complete
              </DialogTitle>
              <DialogDescription>
                {results.filter(r => r.verdict === 'approved').length} of {results.length} skills verified
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {results.map((r, i) => (
                <Card key={i} className={`p-3 flex items-center justify-between ${
                  r.verdict === 'approved'
                    ? 'border-green-200 dark:border-green-800'
                    : r.verdict === 'rejected'
                      ? 'border-red-200 dark:border-red-800'
                      : 'border-amber-200 dark:border-amber-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {r.verdict === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {r.verdict === 'rejected' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {r.verdict === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                    {!r.submitted && <AlertTriangle className="w-5 h-5 text-gray-400" />}
                    <div>
                      <span className="font-medium">{r.skill}</span>
                      {r.verdict === 'rejected' && r.verdictReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 max-w-[280px] truncate">
                          {r.verdictReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={
                    r.verdict === 'approved' ? 'default'
                      : r.verdict === 'rejected' ? 'destructive'
                        : 'secondary'
                  } className={r.verdict === 'approved' ? 'bg-green-600' : undefined}>
                    {r.verdict === 'approved' ? '✓ Verified' : r.verdict === 'rejected' ? '✗ Not Passed' : r.submitted ? 'Under Review' : 'Failed'}
                  </Badge>
                </Card>
              ))}

              {results.some(r => r.verdict === 'rejected') && (
                <Card className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Skills that were not passed can be retried later from your profile.
                  </p>
                </Card>
              )}

              {results.some(r => r.verdict === 'approved') && (
                <Card className="p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Verified skills are now visible on your profile and help you get better job matches!
                  </p>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => onComplete(results)} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Done
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
