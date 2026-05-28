'use client'
import { useState } from 'react'
import { CohortTable, CohortRow } from '@/services/analyticsService'

const MILESTONES = [1, 7, 14, 30, 60, 90]

function cellColor(rate: number): string {
  if (rate <= 0) return 'transparent'
  const opacity = 0.12 + Math.min(rate, 1) * 0.72
  return `rgba(167, 139, 250, ${opacity.toFixed(2)})`  // purple
}

function buildDummyCohortTable(): CohortTable {
  const today = new Date()
  const baseRates = [1, 0.44, 0.29, 0.22, 0.18, 0.15, 0.13, 0.20, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07]
  const sizes    = [198, 172, 215, 183, 163, 207, 244, 169, 187, 201, 178, 192, 183, 82]
  const numCols  = 14

  const rows: CohortRow[] = []
  for (let i = numCols - 1; i >= 0; i--) {
    const d        = new Date(today.getTime() - i * 86400000)
    const dateStr  = d.toISOString().split('T')[0]
    const size     = sizes[numCols - 1 - i]
    const retentions: Array<number | null> = []
    for (let n = 0; n < numCols; n++) {
      retentions.push(n > i ? null : Math.round(size * (baseRates[n] ?? 0.06)))
    }
    rows.push({ date: dateStr, cohortSize: size, retentions })
  }
  return { rows, numCols }
}

const DUMMY_TABLE = buildDummyCohortTable()

export default function LtvCohortTable({
  cohortTable,
}: {
  cohortTable?: CohortTable
}) {
  const [showPercent, setShowPercent] = useState(false)

  const hasReal     = (cohortTable?.rows ?? []).some(r => r.cohortSize > 0)
  const table       = hasReal ? cohortTable! : DUMMY_TABLE
  const isDummy     = !hasReal
  const { rows, numCols } = table

  // 실제 데이터에 존재하는 마일스톤만 필터
  const milestones = MILESTONES.filter(d => d < numCols)

  const totalSize = rows.reduce((s, r) => s + r.cohortSize, 0)

  // 전체 평균 행
  const summaryByMilestone = milestones.map(d => {
    let totalRetained = 0, totalBase = 0
    rows.forEach(r => {
      const v = r.retentions[d]
      if (v !== null) { totalRetained += v; totalBase += r.cohortSize }
    })
    return { retained: totalRetained, base: totalBase }
  })

  function fmt(retained: number | null, cohortSize: number): string {
    if (retained === null) return ''
    if (showPercent) {
      if (cohortSize === 0) return '0%'
      return `${((retained / cohortSize) * 100).toFixed(1)}%`
    }
    return `${retained.toLocaleString()}명`
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-line bg-bg-tertiary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold">코호트별 잔존 유저</h3>
          {isDummy && <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">더미</span>}
        </div>
        <div className="flex items-center bg-bg-primary rounded-md p-0.5 text-xs gap-0.5">
          <button
            onClick={() => setShowPercent(false)}
            className={`px-3 py-1 rounded transition-colors font-medium ${
              !showPercent ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            유저 수
          </button>
          <button
            onClick={() => setShowPercent(true)}
            className={`px-3 py-1 rounded transition-colors font-medium ${
              showPercent ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            잔존율
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[480px]">
        <table className="w-full text-xs border-separate border-spacing-0 min-w-max">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="px-3 py-2 text-left text-text-secondary font-medium sticky left-0 z-30 bg-bg-tertiary border-b border-line w-36">가입일</th>
              <th className="px-3 py-2 text-right text-text-secondary font-medium bg-bg-tertiary border-b border-line min-w-[72px]">코호트 크기</th>
              {milestones.map(d => (
                <th key={d} className="px-3 py-2 text-center text-text-secondary font-medium bg-bg-tertiary border-b border-line min-w-[72px]">
                  D{d}
                </th>
              ))}
            </tr>
            {/* 전체 평균 행 */}
            <tr>
              <td className="px-3 py-2 sticky left-0 z-30 bg-bg-tertiary border-b-2 border-line font-semibold text-text-primary">전체</td>
              <td className="px-3 py-2 text-right bg-bg-tertiary border-b-2 border-line font-semibold text-text-primary">{totalSize.toLocaleString()}명</td>
              {summaryByMilestone.map(({ retained, base }, i) => (
                <td
                  key={milestones[i]}
                  className="px-3 py-2 text-center bg-bg-tertiary border-b-2 border-line font-semibold text-text-primary"
                >
                  {fmt(retained, base)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.date} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2.5 sticky left-0 z-10 bg-bg-secondary border-b border-line text-text-primary font-mono">
                  {row.date}
                </td>
                <td className="px-3 py-2.5 text-right border-b border-line text-text-secondary">
                  {row.cohortSize.toLocaleString()}명
                </td>
                {milestones.map(d => {
                  const v    = row.retentions[d] ?? null
                  const rate = v !== null ? v / row.cohortSize : 0
                  return (
                    <td
                      key={d}
                      className="px-3 py-2.5 text-center border-b border-line transition-colors"
                      style={{ backgroundColor: cellColor(rate), color: rate > 0.5 ? '#fff' : '#d1d5db' }}
                    >
                      {fmt(v, row.cohortSize)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
