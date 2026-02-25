'use client'

import * as React from 'react'

type SparkParticle = {
  id: number
  tx: number
  ty: number
  size: number
  rotation: number
}

type SparkBurst = {
  id: number
  x: number
  y: number
  particles: SparkParticle[]
}

type ClickSparkProps = {
  children: React.ReactNode
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
}

export default function ClickSpark({
  children,
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
}: ClickSparkProps) {
  const [bursts, setBursts] = React.useState<SparkBurst[]>([])
  const timeoutsRef = React.useRef<number[]>([])

  const clearTimeouts = React.useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutsRef.current = []
  }, [])

  React.useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  const handlePointerDownCapture = React.useCallback(
    (event: React.PointerEvent<HTMLSpanElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      const x = event.clientX
      const y = event.clientY
      const burstId = Date.now() + Math.floor(Math.random() * 10000)

      const particles = Array.from({ length: sparkCount }, (_, index) => {
        const baseAngle = (Math.PI * 2 * index) / sparkCount
        const jitter = (Math.random() - 0.5) * 0.55
        const distance = sparkRadius + Math.random() * sparkRadius * 1.35
        const angle = baseAngle + jitter

        return {
          id: burstId + index,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          size: Math.max(3, sparkSize * (0.65 + Math.random() * 0.8)),
          rotation: Math.random() * 160 - 80,
        }
      })

      setBursts((prev) => [...prev, { id: burstId, x, y, particles }])

      const timeoutId = window.setTimeout(() => {
        setBursts((prev) => prev.filter((burst) => burst.id !== burstId))
      }, duration + 80)

      timeoutsRef.current.push(timeoutId)
    },
    [duration, sparkCount, sparkRadius]
  )

  return (
    <span className="contents" onPointerDownCapture={handlePointerDownCapture}>
      {children}
      {bursts.map((burst) => (
        <React.Fragment key={burst.id}>
          {burst.particles.map((spark) => (
            <span
              key={spark.id}
              aria-hidden="true"
              className="pointer-events-none fixed z-[999] rounded-full"
              style={{
                left: burst.x,
                top: burst.y,
                width: spark.size,
                height: spark.size,
                backgroundColor: sparkColor,
                boxShadow: `0 0 ${Math.max(10, spark.size * 1.8)}px ${sparkColor}`,
                transform: 'translate(-50%, -50%)',
                animation: `click-spark-particle ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                ['--spark-tx' as string]: `${spark.tx}px`,
                ['--spark-ty' as string]: `${spark.ty}px`,
                ['--spark-rot' as string]: `${spark.rotation}deg`,
              } as React.CSSProperties}
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none fixed z-[998] rounded-full border"
            style={{
              left: burst.x,
              top: burst.y,
              width: sparkRadius * 1.9,
              height: sparkRadius * 1.9,
              borderColor: sparkColor,
              transform: 'translate(-50%, -50%)',
              animation: `click-spark-ring ${duration}ms ease-out forwards`,
            }}
          />
        </React.Fragment>
      ))}
      <style jsx>{`
        @keyframes click-spark-particle {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(0deg) scale(0.55);
          }
          15% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform:
              translate(calc(-50% + var(--spark-tx)), calc(-50% + var(--spark-ty)))
              rotate(var(--spark-rot))
              scale(0);
          }
        }

        @keyframes click-spark-ring {
          0% {
            opacity: 0.45;
            transform: translate(-50%, -50%) scale(0.4);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.8);
          }
        }
      `}</style>
    </span>
  )
}
