'use client'
import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { OverviewGameRow } from '@/services/analyticsService'

type MetricKey = 'avgDau' | 'revenue' | 'newMembers'

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'avgDau',      label: 'DAU'    },
  { key: 'revenue',     label: '매출'    },
  { key: 'newMembers',  label: '신규유저' },
]

const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#a78bfa',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
]

const DUMMY_GAMES: Pick<OverviewGameRow, 'title' | 'avgDau' | 'revenue' | 'newMembers'>[] = [
  { title: '드래곤 퀘스트 온라인', avgDau: 1820, revenue: 4820000, newMembers: 412 },
  { title: '스타포지 배틀그라운드', avgDau: 1340, revenue: 3150000, newMembers: 287 },
  { title: '마법소녀 키우기',       avgDau:  980, revenue: 2390000, newMembers: 193 },
  { title: '던전 앤 드래곤즈 Z',    avgDau:  760, revenue: 1670000, newMembers: 156 },
  { title: '퍼즐 킹덤',            avgDau:  450, revenue:  940000, newMembers:  98 },
]

const fmtValue = (key: MetricKey, v: number) => {
  if (key === 'revenue') return `₩${v.toLocaleString()}`
  return v.toLocaleString()
}

export default function GamePieChart({ games }: { games: OverviewGameRow[] }) {
  const [metric, setMetric] = useState<MetricKey>('avgDau')
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const allGames = [
    ...games,
    ...DUMMY_GAMES.map((d, i) => ({ ...d, id: `dummy-${i}` }) as OverviewGameRow),
  ]
  const all = allGames.map(g => ({ name: g.title, value: g[metric] as number })).filter(d => d.value > 0)
  const data = all.filter(d => !hidden.has(d.name))

  const toggle = (name: string) =>
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        if (data.length === 1) return prev
        next.add(name)
      }
      return next
    })

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-xs font-bold whitespace-nowrap">지표 (더미)</h3>
        <div className="flex border border-line rounded-md overflow-hidden">
          {METRIC_OPTIONS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-2 py-1 text-[10px] transition-colors ${
                metric === m.key
                  ? 'bg-accent text-text-primary font-semibold'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {all.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-secondary">
          데이터 없음
        </div>
      ) : (
        <>
          {/* 원형 그래프 — 가운데 */}
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="76%"
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={PIE_COLORS[all.findIndex(a => a.name === d.name) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => [fmtValue(metric, Number(v)), name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 게임 목록 — 하단, 클릭으로 토글 */}
          <div className="flex items-center gap-x-3 gap-y-1.5 mt-2 flex-wrap">
            {all.map((d, i) => {
              const isHidden = hidden.has(d.name)
              return (
                <button
                  key={d.name}
                  onClick={() => toggle(d.name)}
                  className="flex items-center gap-1 flex-shrink-0 transition-opacity"
                  style={{ opacity: isHidden ? 0.35 : 1, fontSize: '10px' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className={`whitespace-nowrap ${isHidden ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                    {d.name}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
