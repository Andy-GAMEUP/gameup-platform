'use client'
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number  // percent
  icon?: ReactNode
  color?: string
  hint?: string
}

export default function MetricCard({ label, value, change, icon, color = 'text-text-primary', hint }: MetricCardProps) {
  const trend = change === undefined ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-text-secondary">{label}</span>
        {icon && <span className={color}>{icon}</span>}
      </div>
      <div className={`text-2xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {trend === 'up' && <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3 h-3" />+{change}%</span>}
        {trend === 'down' && <span className="flex items-center gap-1 text-red-400"><TrendingDown className="w-3 h-3" />{change}%</span>}
        {trend === 'flat' && <span className="flex items-center gap-1 text-text-muted"><Minus className="w-3 h-3" />0%</span>}
        {hint && <span className="text-text-muted">{hint}</span>}
      </div>
    </div>
  )
}
