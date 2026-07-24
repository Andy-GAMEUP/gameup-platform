'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DailyPoint {
  date: string
  dau: number
  newMembers: number
  payingUsers: number
  revenue: number
}

type MetricKey = 'dau' | 'newMembers' | 'payingUsers'

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'dau',         label: 'DAU',     color: '#10b981' },
  { key: 'newMembers',  label: '신규 유저', color: '#3b82f6' },
  { key: 'payingUsers', label: '결제 유저', color: '#a78bfa' },
]

export default function DailyTrendChart({
  data,
  defaultActive = ['dau', 'newMembers'],
}: {
  data: DailyPoint[]
  defaultActive?: MetricKey[]
}) {
  const [active, setActive] = useState<Set<MetricKey>>(new Set(defaultActive))

  const toggle = (key: MetricKey) =>
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size === 1) return prev
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-lg font-bold">일별 추이</h3>
        <div className="flex border border-line rounded-md overflow-hidden">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`px-3 py-1.5 text-base transition-colors ${
                active.has(m.key)
                  ? 'text-text-primary font-semibold'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
              style={active.has(m.key) ? { backgroundColor: m.color + '33', color: m.color } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            />
            {METRICS.filter(m => active.has(m.key)).map(m => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
