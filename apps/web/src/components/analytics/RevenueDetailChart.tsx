'use client'
import { useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { DailyPoint } from '@/services/analyticsService'

type BarKey  = 'revenue' | 'arpu' | 'arppu'
type LineKey = 'dau' | 'newMembers' | 'payingUsers'

const BAR_METRICS:  { key: BarKey;  label: string; color: string }[] = [
  { key: 'revenue', label: '매출',  color: '#f59e0b' },
  { key: 'arpu',    label: 'ARPU',  color: '#3b82f6' },
  { key: 'arppu',   label: 'ARPPU', color: '#a78bfa' },
]

const LINE_METRICS: { key: LineKey; label: string; color: string }[] = [
  { key: 'dau',         label: 'DAU',    color: '#06b6d4' },
  { key: 'newMembers',  label: '신규 유저', color: '#10b981' },
  { key: 'payingUsers', label: '결제유저', color: '#a78bfa' },
]

const DUMMY_TOP_PAYERS = [
  { rank: 1,  nickname: 'DragonSlayer99', total: 420000 },
  { rank: 2,  nickname: '별빛전사',        total: 385000 },
  { rank: 3,  nickname: 'IronWolf77',     total: 312000 },
  { rank: 4,  nickname: '퍼플나이트',      total: 278000 },
  { rank: 5,  nickname: 'StarBreaker',    total: 241000 },
  { rank: 6,  nickname: '천둥검사',        total: 198000 },
  { rank: 7,  nickname: 'NightOwl42',     total: 175000 },
  { rank: 8,  nickname: '레드드래곤',      total: 152000 },
  { rank: 9,  nickname: 'SilverArrow',    total: 134000 },
  { rank: 10, nickname: '골든이글',        total: 118000 },
]

const DUMMY_DATA: DailyPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000)
  const date = d.toISOString().split('T')[0]
  const dau = 1200 + Math.round(Math.sin(i / 3) * 300 + Math.random() * 200)
  const payingUsers = Math.round(dau * (0.04 + Math.random() * 0.02))
  const revenue = payingUsers * (8000 + Math.round(Math.random() * 4000))
  return { date, dau, newMembers: Math.round(dau * 0.08), payingUsers, revenue, sessionTime: 18 + Math.random() * 10 }
})

export default function RevenueDetailChart({ data, title = '매출 추이', showRanking = true }: { data: DailyPoint[]; title?: string; showRanking?: boolean }) {
  const hasRealData = data.some(d => d.revenue > 0 || d.dau > 0)
  const displayData = hasRealData ? data : DUMMY_DATA

  const [activeBars,  setActiveBars]  = useState<Set<BarKey>>(new Set(['revenue']))
  const [activeLines, setActiveLines] = useState<Set<LineKey>>(new Set(['dau']))

  const toggleBar = (key: BarKey) =>
    setActiveBars(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const toggleLine = (key: LineKey) =>
    setActiveLines(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const chartData = displayData.map(d => ({
    date:        d.date,
    revenue:     d.revenue,
    dau:         d.dau,
    newMembers:  d.newMembers,
    payingUsers: d.payingUsers,
    arpu:        d.dau         > 0 ? Math.round(d.revenue / d.dau)         : 0,
    arppu:       d.payingUsers > 0 ? Math.round(d.revenue / d.payingUsers) : 0,
  }))

  const hasRight = activeLines.size > 0

  return (
    <div className="flex gap-4 items-stretch">
    <div className="flex-1 min-w-0 bg-bg-secondary border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-lg font-bold">{title}</h3>
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

      {/* 최대 결제자 순위 — 별도 박스 */}{showRanking &&
      <div className="w-[21%] flex-shrink-0 bg-bg-secondary border border-line rounded-lg flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-line bg-bg-tertiary flex-shrink-0">
          <h4 className="text-sm font-bold">최대 결제자 순위</h4>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {DUMMY_TOP_PAYERS.map((p) => (
            <div key={p.rank} className="flex items-center gap-2 px-3 py-2 border-b border-line/50 hover:bg-bg-tertiary transition-colors">
              <span className={`text-xs font-bold w-4 flex-shrink-0 ${
                p.rank === 1 ? 'text-yellow-400' :
                p.rank === 2 ? 'text-gray-300'   :
                p.rank === 3 ? 'text-amber-600'  : 'text-text-muted'
              }`}>{p.rank}</span>
              <span className="flex-1 text-xs truncate text-text-secondary">{p.nickname}</span>
              <span className="text-xs font-semibold text-accent flex-shrink-0">₩{p.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>}
    </div>
  )
}
