'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DailyPoint } from '@/services/analyticsService'

type SegmentKey = 'avgSession' | 'avgSessionPayer' | 'avgSessionNonPayer'

const SEGMENTS: { key: SegmentKey; label: string; color: string }[] = [
  { key: 'avgSession',        label: '전체',    color: '#f59e0b' },
  { key: 'avgSessionPayer',   label: '결제자',  color: '#10b981' },
  { key: 'avgSessionNonPayer',label: '비결제자', color: '#3b82f6' },
]

function fmtSeconds(sec: number): string {
  if (sec <= 0) return '0초'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}초`
  if (s === 0) return `${m}분`
  return `${m}분 ${s}초`
}

export default function SessionTimeChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<Set<SegmentKey>>(new Set(['avgSession']))

  const toggle = (key: SegmentKey) =>
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

  const chartData = data.map(d => ({
    date: d.date,
    avgSession: d.avgSession ?? 0,
    avgSessionPayer: d.avgSessionPayer ?? 0,
    avgSessionNonPayer: d.avgSessionNonPayer ?? 0,
  }))

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">세션 타임 (더미)</h3>
        <div className="flex border border-line rounded-md overflow-hidden">
          {SEGMENTS.map(s => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`px-3 py-1.5 text-xs transition-colors ${
                active.has(s.key)
                  ? 'text-text-primary font-semibold'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
              style={active.has(s.key) ? { backgroundColor: s.color + '33', color: s.color } : {}}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} interval={Math.floor(chartData.length / 6)} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickFormatter={fmtSeconds} width={52} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
              formatter={(v) => [fmtSeconds(Number(v)), '']}
            />
            {SEGMENTS.filter(s => active.has(s.key)).map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3, fill: s.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
