'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DataPoint {
  label: string
  value: number
}

interface SimpleChartProps {
  data: DataPoint[]
  title?: string
  color?: string
  showTrend?: boolean
}

export function SimpleBarChart({ data, title, color = '#6366f1' }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      <div className="space-y-2">
        {data.map((point, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{point.label}</span>
              <span className="font-medium">{point.value}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(point.value / maxValue) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SimpleLineChart({ data, title, color = '#6366f1', showTrend = true }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  const trend = useMemo(() => {
    if (data.length < 2) return 'stable'
    const first = data[0].value
    const last = data[data.length - 1].value
    const change = ((last - first) / (first || 1)) * 100
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }, [data])

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    stable: <Minus className="h-4 w-4 text-muted-foreground" />,
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          {showTrend && trendIcon[trend]}
        </div>
      )}
      <div className="relative h-32 flex items-end gap-1">
        {data.map((point, index) => {
          const percentage = ((point.value - minValue) / range) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${percentage}%`,
                    backgroundColor: color,
                    minHeight: point.value > 0 ? '4px' : '0',
                  }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {point.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  iconBg?: string
  iconColor?: string
}

export function StatsCard({ title, value, change, icon, iconBg, iconColor }: StatsCardProps) {
  const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-muted-foreground'
  const changeIcon = change && change > 0 ? '↑' : change && change < 0 ? '↓' : '−'

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="text-sm text-muted-foreground">{title}</div>
          {icon && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg || 'bg-primary/10'}`}>
              <div className={iconColor || 'text-primary'}>{icon}</div>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {change !== undefined && (
          <div className={`text-xs font-medium ${changeColor}`}>
            {changeIcon} {Math.abs(change)}% vs last period
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>
  title?: string
}

export function SimpleDonutChart({ data, title }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <div className="space-y-4">
      {title && <h4 className="text-sm font-medium">{title}</h4>}
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.reduce((acc, item, index) => {
              const percentage = (item.value / total) * 100
              const circumference = 2 * Math.PI * 40
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
              const prevPercentage = data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 100, 0)
              const strokeDashoffset = -(prevPercentage / 100) * circumference

              acc.push(
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              )
              return acc
            }, [] as React.ReactElement[])}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span className="font-medium">
              {item.value} ({((item.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
