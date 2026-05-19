'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { CohortTable, RetentionPoint } from '@/services/analyticsService'

interface Props {
  data: RetentionPoint[]
  cohortTable?: CohortTable
  chartOnly?: boolean
}

function cellColor(count: number | null, cohortSize: number, colIndex: number): string {
  if (colIndex === 0) return 'transparent'
  if (count === null || count === 0 || cohortSize === 0) return 'transparent'
  const rate = Math.min(count / cohortSize, 1)
  const opacity = 0.15 + rate * 0.75
  return `rgba(59, 130, 246, ${opacity.toFixed(2)})`
}


export default function RetentionChart({ data, cohortTable, chartOnly = false }: Props) {
  const [showPercent, setShowPercent] = useState(true)
  const searchParams = useSearchParams()
  const retentionHref = `/analytics?tab=retention${searchParams.get('gameId') ? `&gameId=${searchParams.get('gameId')}` : ''}`

  const numCols = cohortTable?.numCols ?? 0
  const rows = cohortTable?.rows ?? []

  const totals: number[] = Array(numCols).fill(0)
  rows.forEach(row => {
    row.retentions.forEach((v, i) => { if (v !== null) totals[i] += v })
  })
  const lineData = totals.map((count, i) => ({ name: `${i}일`, count }))

  const summaryRetentions: Array<number | null> = Array(numCols).fill(0)
  rows.forEach(row => {
    row.retentions.forEach((v, i) => {
      if (v !== null) (summaryRetentions[i] as number) += v
    })
  })
  const totalCohortSize = rows.reduce((s, r) => s + r.cohortSize, 0)

  const cols = Array.from({ length: numCols }, (_, i) => i)

  function formatCell(count: number | null, cohortSize: number, colIndex: number): string {
    if (count === null) return ''
    if (showPercent) {
      if (colIndex === 0) return '100%'
      if (cohortSize === 0) return '0%'
      return `${parseFloat(((count / cohortSize) * 100).toFixed(2))}%`
    }
    return count.toLocaleString()
  }

  function formatSummary(val: number | null, colIndex: number): string {
    if (val === null) return ''
    if (showPercent) {
      if (colIndex === 0) return '100%'
      if (totalCohortSize === 0) return '0%'
      return `${parseFloat(((val / totalCohortSize) * 100).toFixed(2))}%`
    }
    return val.toLocaleString()
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold">유저 리텐션</h3>
      </div>

      {/* 선 그래프 */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} interval={Math.floor(numCols / 7)} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#ffffff' }}
              formatter={(v) => [`${v}명`, '활성 유저']}
            />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {chartOnly && (
        <div className="flex justify-end">
          <Link
            href={retentionHref}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            리텐션 보드
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 테이블 헤더 + 토글 */}
      {!chartOnly && rows.length > 0 && (
        <>
          <div className="flex items-center justify-end">
            <div className="flex items-center bg-bg-tertiary rounded-lg p-1 text-xs gap-1">
              <button
                onClick={() => setShowPercent(true)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  showPercent ? 'bg-accent text-text-inverse' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                잔존율
              </button>
              <button
                onClick={() => setShowPercent(false)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  !showPercent ? 'bg-accent text-text-inverse' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                유저 수
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 text-text-secondary font-medium w-32 sticky left-0 bg-bg-secondary z-10">날짜</th>
                  {cols.map(i => (
                    <th key={i} className="px-2 py-2 text-center text-text-secondary font-medium min-w-[52px]">{i}일</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-3 py-2 sticky left-0 bg-bg-secondary z-10">
                    <div className="font-semibold text-text-primary">모든 사용자</div>
                    <div className="text-text-secondary">{totalCohortSize.toLocaleString()}명</div>
                  </td>
                  {cols.map(i => (
                    <td
                      key={i}
                      className="px-2 py-2 text-center font-semibold transition-colors text-black"
                      style={{ backgroundColor: cellColor(summaryRetentions[i], totalCohortSize, i) }}
                    >
                      {formatSummary(summaryRetentions[i], i)}
                    </td>
                  ))}
                </tr>

                {rows.map(row => (
                  <tr key={row.date} className="border-t border-line hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-bg-secondary z-10">
                      <div className="text-text-primary">{row.date}</div>
                      <div className="text-text-secondary">{row.cohortSize.toLocaleString()}명</div>
                    </td>
                    {row.retentions.map((count, i) => (
                      <td
                        key={i}
                        className="px-2 py-2 text-center transition-colors text-black"
                        style={{ backgroundColor: cellColor(count, row.cohortSize, i) }}
                      >
                        {formatCell(count, row.cohortSize, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
