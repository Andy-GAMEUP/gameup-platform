'use client'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, className = '' }: StatCardProps) {
  const changeStyles = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-text-muted',
  }

  return (
    <div className={`bg-bg-card rounded-lg border border-line p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
      {change && (
        <p className={`mt-1 text-sm ${changeStyles[changeType]}`}>{change}</p>
      )}
    </div>
  )
}
