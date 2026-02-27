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
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ArrowRight,
  RotateCcw,
  Brain,
  Shield,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: number
  question: string
  options: Record<string, string>
  correct: string
  difficulty: string
}

export interface SkillResult {
  skill: string
  passed: boolean
  score: number
  total: number
  percentage: number
}

interface SkillAssessmentProps {
  /** Skills that need assessment */
  skills: string[]
  /** Skills already verified (won't need re-assessment) */
  verifiedSkills?: string[]
  /** Minimum percentage to pass (default 60) */
  passThreshold?: number
  /** Called when all assessments are complete */
  onComplete: (results: SkillResult[]) => void
  /** Called when user cancels */
  onCancel: () => void
  /** Whether the dialog is open */
  open: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIME_PER_QUESTION_S = 30
const PASS_THRESHOLD_DEFAULT = 60

// ── Component ─────────────────────────────────────────────────────────────────

export function SkillAssessment({
  skills,
  verifiedSkills = [],
  passThreshold = PASS_THRESHOLD_DEFAULT,
  onComplete,
  onCancel,
  open,
}: SkillAssessmentProps) {
  // Filter out already verified skills
  const skillsToAssess = skills.filter(s => !verifiedSkills.includes(s))

  const [currentSkillIdx, setCurrentSkillIdx] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [allResults, setAllResults] = useState<SkillResult[]>([])
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'skill-result' | 'final'>('intro')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Current skill
  const currentSkill = skillsToAssess[currentSkillIdx] ?? ''

  // If no skills to assess, complete immediately
  useEffect(() => {
    if (open && skillsToAssess.length === 0) {
      onComplete([])
    }
  }, [open, skillsToAssess.length])

  // Timer
  useEffect(() => {
    if (phase !== 'quiz' || loading) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-advance on timeout
          handleNextQuestion(true)
          return TIME_PER_QUESTION_S
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, currentQ, loading])

  // Reset on new dialog open
  useEffect(() => {
    if (open) {
      setCurrentSkillIdx(0)
      setQuestions([])
      setCurrentQ(0)
      setSelectedAnswer(null)
      setAnswers({})
      setAllResults([])
      setPhase('intro')
      setError(null)
      setShowResult(false)
    }
  }, [open])

  const fetchQuestions = useCallback(async (skill: string) => {
    setLoading(true)
    setError(null)
    setQuestions([])
    setCurrentQ(0)
    setSelectedAnswer(null)
    setAnswers({})
    setShowResult(false)

    try {
      const res = await fetch('/api/ai/skill-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions generated')
      }
      setQuestions(data.questions)
      setTimeLeft(TIME_PER_QUESTION_S)
      setPhase('quiz')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNextQuestion = useCallback((timeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current)

    const answer = timeout ? '' : (selectedAnswer ?? '')
    const newAnswers = { ...answers, [currentQ]: answer }
    setAnswers(newAnswers)

    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setTimeLeft(TIME_PER_QUESTION_S)
    } else {
      // Quiz done for this skill — calculate result
      let correct = 0
      questions.forEach((q, i) => {
        if (newAnswers[i] === q.correct) correct++
      })
      const percentage = Math.round((correct / questions.length) * 100)
      const result: SkillResult = {
        skill: currentSkill,
        passed: percentage >= passThreshold,
        score: correct,
        total: questions.length,
        percentage,
      }
      setAllResults(prev => [...prev, result])
      setPhase('skill-result')
    }
  }, [selectedAnswer, answers, currentQ, questions, currentSkill, passThreshold])

  const handleNextSkill = () => {
    if (currentSkillIdx < skillsToAssess.length - 1) {
      setCurrentSkillIdx(prev => prev + 1)
      setPhase('intro')
    } else {
      setPhase('final')
    }
  }

  const handleRetry = () => {
    // Remove last result (the failed one) and retry
    setAllResults(prev => prev.slice(0, -1))
    fetchQuestions(currentSkill)
  }

  const handleFinish = () => {
    onComplete(allResults)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">
          Skill Assessment: {currentSkill}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Answer 5 quick questions to verify your knowledge.
          You need <span className="font-semibold text-primary">{passThreshold}%</span> to pass.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <Card className="p-3">
          <div className="font-semibold text-lg">5</div>
          <div className="text-muted-foreground text-xs">Questions</div>
        </Card>
        <Card className="p-3">
          <div className="font-semibold text-lg">{TIME_PER_QUESTION_S}s</div>
          <div className="text-muted-foreground text-xs">Per Question</div>
        </Card>
        <Card className="p-3">
          <div className="font-semibold text-lg">{passThreshold}%</div>
          <div className="text-muted-foreground text-xs">To Pass</div>
        </Card>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        Assessment {currentSkillIdx + 1} of {skillsToAssess.length}
      </div>
      {error && (
        <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}
      <Button
        className="w-full"
        onClick={() => fetchQuestions(currentSkill)}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Questions with AI...
          </>
        ) : error ? (
          <>
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4 mr-2" />
            Start Assessment
          </>
        )}
      </Button>
    </div>
  )

  const renderQuiz = () => {
    const q = questions[currentQ]
    if (!q) return null

    const progress = ((currentQ) / questions.length) * 100
    const isUrgent = timeLeft <= 10

    return (
      <div className="space-y-4 py-2">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <div className="flex items-center gap-1">
              <Badge variant={
                q.difficulty === 'easy' ? 'secondary' :
                q.difficulty === 'hard' ? 'destructive' : 'default'
              } className="text-[10px] px-1.5 py-0">
                {q.difficulty}
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Timer */}
        <div className={`flex items-center justify-center gap-1.5 text-sm font-mono ${
          isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {timeLeft}s
        </div>

        {/* Question */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="font-medium text-sm leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {Object.entries(q.options).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedAnswer(key)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                selectedAnswer === key
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold mr-2.5">
                {key}
              </span>
              {text}
            </button>
          ))}
        </div>

        {/* Next button */}
        <Button
          className="w-full"
          onClick={() => handleNextQuestion()}
          disabled={!selectedAnswer}
        >
          {currentQ < questions.length - 1 ? 'Next Question' : 'Finish Assessment'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    )
  }

  const renderSkillResult = () => {
    const result = allResults[allResults.length - 1]
    if (!result) return null

    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {result.passed
              ? <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              : <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />}
          </div>
          <h3 className="text-lg font-semibold">
            {result.passed ? 'Assessment Passed!' : 'Not Passed'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {result.passed
              ? `Great job! Your "${result.skill}" skill is now verified.`
              : `You scored ${result.percentage}%. You need at least ${passThreshold}% to pass.`}
          </p>
        </div>
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className={`text-3xl font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
              {result.percentage}%
            </div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{result.score}/{result.total}</div>
            <div className="text-xs text-muted-foreground">Correct</div>
          </div>
        </div>
        <div className="flex gap-3">
          {!result.passed && (
            <Button variant="outline" className="flex-1" onClick={handleRetry}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
          <Button className="flex-1" onClick={handleNextSkill}>
            {currentSkillIdx < skillsToAssess.length - 1
              ? <>Next Skill <ArrowRight className="w-4 h-4 ml-2" /></>
              : <>View Results <Award className="w-4 h-4 ml-2" /></>}
          </Button>
        </div>
      </div>
    )
  }

  const renderFinal = () => {
    const passed = allResults.filter(r => r.passed)
    const failed = allResults.filter(r => !r.passed)

    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Assessment Complete</h3>
          <p className="text-sm text-muted-foreground">
            {passed.length} of {allResults.length} skill{allResults.length !== 1 ? 's' : ''} verified
          </p>
        </div>

        <div className="space-y-2">
          {allResults.map((r) => (
            <div
              key={r.skill}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                r.passed
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {r.passed
                  ? <Shield className="w-4 h-4 text-green-600" />
                  : <XCircle className="w-4 h-4 text-red-500" />}
                <span className="font-medium text-sm">{r.skill}</span>
              </div>
              <Badge variant={r.passed ? 'default' : 'destructive'} className="text-xs">
                {r.percentage}%
              </Badge>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Failed skills will not be added to your profile. You can try again later.
          </p>
        )}

        <Button className="w-full" onClick={handleFinish}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Save Verified Skills
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Skill Verification
          </DialogTitle>
          <DialogDescription>
            {phase === 'quiz'
              ? `Assessing: ${currentSkill}`
              : phase === 'final'
              ? 'Review your results'
              : `Verify your skills through quick assessments`}
          </DialogDescription>
        </DialogHeader>

        {phase === 'intro' && renderIntro()}
        {phase === 'quiz' && renderQuiz()}
        {phase === 'skill-result' && renderSkillResult()}
        {phase === 'final' && renderFinal()}
      </DialogContent>
    </Dialog>
  )
}
