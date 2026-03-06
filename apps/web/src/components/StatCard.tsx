'use client'
import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down'
  icon?: ReactNode
  color?: string
  className?: string
}

export default function StatCard({ 
  label, 
  value, 
  change, 
  trend,
  icon, 
  color = 'text-blue-600',
  className = '' 
}: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {trend === 'up' && '↑ '}
                {trend === 'down' && '↓ '}
                {change}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${color}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
