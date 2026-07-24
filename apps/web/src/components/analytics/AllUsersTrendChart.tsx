'use client'
import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DailyPoint } from '@/services/analyticsService'
import { DUMMY_NEW_USERS_DAILY } from './newUsersDummy'

type MetricKey = 'dau' | 'newMembers' | 'revenue' | 'arpu' | 'arppu'

const METRICS: { key: MetricKey; label: string; color: string; axis: 'left' | 'right'; type: 'bar' | 'line' }[] = [
  { key: 'revenue',    label: '매출',    color: '#10b981', axis: 'left',  type: 'line' },
  { key: 'arpu',       label: 'ARPU',    color: '#f59e0b', axis: 'left',  type: 'line' },
  { key: 'arppu',      label: 'ARPPU',   color: '#a78bfa', axis: 'left',  type: 'line' },
  { key: 'dau',        label: 'DAU',     color: '#3b82f6', axis: 'right', type: 'bar'  },
  { key: 'newMembers', label: '신규 유저', color: '#34d399', axis: 'right', type: 'bar'  },
]

const fmtMoney = (v: number) =>
  v >= 1000000 ? `₩${(v / 1000000).toFixed(1)}M` :
  v >= 1000    ? `₩${(v / 1000).toFixed(0)}K`    : `₩${v}`

export default function AllUsersTrendChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<Set<MetricKey>>(
    new Set(['dau', 'revenue', 'arpu', 'arppu'])
  )

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

  const hasReal  = data.some(d => d.dau > 0 || d.newMembers > 0)
  const source   = hasReal ? data : DUMMY_NEW_USERS_DAILY
  const isDummy  = !hasReal

  const chartData = source.map(d => ({
    date:       d.date,
    dau:        d.dau,
    newMembers: d.newMembers,
    revenue:    d.revenue,
    arpu:       d.dau > 0         ? Math.round(d.revenue / d.dau)         : 0,
    arppu:      d.payingUsers > 0 ? Math.round(d.revenue / d.payingUsers) : 0,
  }))

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-base font-bold">일별 추이{isDummy && <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>}</h3>
        <div className="flex items-center gap-2">
          {/* 좌축 그룹: 매출·ARPU·ARPPU */}
          <div className="flex items-center gap-1">
            <div className="flex border border-line rounded-md overflow-hidden">
              {METRICS.filter(m => m.axis === 'left').map(m => (
                <button
                  key={m.key}
                  onClick={() => toggle(m.key)}
                  className={`px-3 py-1.5 text-base transition-colors ${
                    active.has(m.key) ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                  style={active.has(m.key) ? { backgroundColor: m.color + '22', color: m.color } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {/* 우축 그룹: DAU */}
          <div className="flex items-center gap-1">
            <div className="flex border border-line rounded-md overflow-hidden">
              {METRICS.filter(m => m.axis === 'right').map(m => (
                <button
                  key={m.key}
                  onClick={() => toggle(m.key)}
                  className={`px-3 py-1.5 text-base transition-colors ${
                    active.has(m.key) ? 'font-semibold' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                  style={active.has(m.key) ? { backgroundColor: m.color + '22', color: m.color } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 48, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            {/* 좌축: 매출·ARPU·ARPPU */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              width={56}
              tickFormatter={fmtMoney}
            />
            {/* 우축: DAU */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#3b82f6"
              tick={{ fontSize: 10, fill: '#3b82f6' }}
              width={40}
              tickFormatter={v => v.toLocaleString()}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(v, name) =>
                (name === 'DAU' || name === '신규 유저')
                  ? [`${Number(v).toLocaleString()}명`, name]
                  : [`₩${Number(v).toLocaleString()}`, name]
              }
            />
            {active.has('revenue') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="매출"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {active.has('arpu') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="arpu"
                name="ARPU"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {active.has('arppu') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="arppu"
                name="ARPPU"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {active.has('dau') && (
              <Bar
                yAxisId="right"
                dataKey="dau"
                name="DAU"
                fill="#3b82f6"
                fillOpacity={0.55}
                radius={[3, 3, 0, 0]}
              />
            )}
            {active.has('newMembers') && (
              <Bar
                yAxisId="right"
                dataKey="newMembers"
                name="신규 유저"
                fill="#34d399"
                fillOpacity={0.55}
                radius={[3, 3, 0, 0]}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
