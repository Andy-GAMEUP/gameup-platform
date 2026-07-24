'use client'
import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { DailyOverviewPoint } from '@/services/analyticsService'

type BarKey  = 'revenue' | 'arpu' | 'arppu'
type LineKey = 'dau' | 'newMembers' | 'payingUsers'

const BAR_METRICS: { key: BarKey; label: string; color: string }[] = [
  { key: 'revenue', label: '매출',  color: '#f59e0b' },
  { key: 'arpu',    label: 'ARPU',  color: '#3b82f6' },
  { key: 'arppu',   label: 'ARPPU', color: '#a78bfa' },
]

const LINE_METRICS: { key: LineKey; label: string; color: string }[] = [
  { key: 'dau',         label: 'DAU',    color: '#06b6d4' },
  { key: 'newMembers',  label: '신규 유저', color: '#10b981' },
  { key: 'payingUsers', label: '결제 유저', color: '#a78bfa' },
]

export default function DashboardTrendChart({ data }: { data: DailyOverviewPoint[] }) {
  const [activeBars,  setActiveBars]  = useState<Set<BarKey>>(new Set(['revenue']))
  const [activeLines, setActiveLines] = useState<Set<LineKey>>(new Set(['dau']))

  const toggleBar = (key: BarKey) =>
    setActiveBars(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const toggleLine = (key: LineKey) =>
    setActiveLines(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const chartData = data.map(d => ({
    date:        d.date,
    dau:         d.dau,
    newMembers:  d.newMembers,
    payingUsers: d.payingUsers,
    revenue:     d.revenue,
    arpu:        d.dau         > 0 ? Math.round(d.revenue / d.dau)         : 0,
    arppu:       d.payingUsers > 0 ? Math.round(d.revenue / d.payingUsers) : 0,
  }))

  const hasRight = activeLines.size > 0

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-lg font-bold">주요 지표</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-line rounded-md overflow-hidden">
            {BAR_METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleBar(m.key)}
                className={`px-3 py-1.5 text-base transition-colors ${
                  activeBars.has(m.key)
                    ? 'text-text-primary font-semibold'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                }`}
                style={activeBars.has(m.key) ? { backgroundColor: m.color + '33', color: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex border border-line rounded-md overflow-hidden">
            {LINE_METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleLine(m.key)}
                className={`px-3 py-1.5 text-base transition-colors ${
                  activeLines.has(m.key)
                    ? 'text-text-primary font-semibold'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                }`}
                style={activeLines.has(m.key) ? { backgroundColor: m.color + '33', color: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              tick={{ fontSize: 11 }}
              width={72}
              tickFormatter={v => `₩${Number(v).toLocaleString()}`}
            />
            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                width={52}
              />
            )}
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => {
                if (['매출', 'ARPU', 'ARPPU'].includes(name as string))
                  return [`₩${Number(v).toLocaleString()}`, name]
                return [Number(v).toLocaleString(), name]
              }}
            />
            {BAR_METRICS.filter(m => activeBars.has(m.key)).map(m => (
              <Bar
                key={m.key}
                yAxisId="left"
                dataKey={m.key}
                name={m.label}
                fill={m.color + '55'}
                stroke={m.color}
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
              />
            ))}
            {LINE_METRICS.filter(m => activeLines.has(m.key)).map(m => (
              <Line
                key={m.key}
                yAxisId="right"
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
