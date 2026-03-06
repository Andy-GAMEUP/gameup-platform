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
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={`mt-1 text-sm ${changeStyles[changeType]}`}>{change}</p>
      )}
    </div>
  )
}
