'use client'

const STAGES = [
  '캐릭터 생성',
  '첫 전투',
  '아이템 획득',
  '스킬 습득',
  '첫 던전',
  '튜토리얼 완료',
]

interface CohortRow {
  week:       string
  cohortSize: number
  rates:      number[]   // 각 스테이지 완료율 (0~100)
}

function genRows(): CohortRow[] {
  const base = [96, 81, 67, 54, 43, 34]
  const weeks: CohortRow[] = []
  for (let w = 5; w >= 0; w--) {
    const d = new Date(Date.now() - w * 7 * 86400000)
    const label = `${d.getMonth() + 1}/${d.getDate()} 주`
    const seed  = d.getDate() + d.getMonth() * 3
    const size  = 180 + Math.round(Math.sin(seed * 1.7) * 60 + seed * 2.1)
    // 이번 주(w=0)는 아직 진행 중이므로 후반 스테이지 null 처리
    const available = w === 0 ? 3 : STAGES.length
    const rates = STAGES.map((_, i) => {
      if (i >= available) return -1   // 아직 미집계
      const noise = Math.round(Math.sin(seed * (i + 1) * 2.3) * 3)
      return Math.max(0, Math.min(100, base[i] + noise + Math.round(Math.sin(w * 1.1 + i) * 4)))
    })
    weeks.push({ week: label, cohortSize: size, rates })
  }
  return weeks
}

const DUMMY_ROWS = genRows()

function cellBg(rate: number): string {
  if (rate < 0) return 'transparent'
  const opacity = 0.1 + (rate / 100) * 0.75
  return `rgba(16, 185, 129, ${opacity.toFixed(2)})`
}

function cellText(rate: number): string {
  if (rate < 0) return 'text-text-muted'
  if (rate >= 70) return 'text-white font-bold'
  if (rate >= 40) return 'text-text-primary font-semibold'
  return 'text-text-secondary'
}

export default function TutorialCohortTable() {
  return (
    <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-line bg-bg-tertiary flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">튜토리얼 진행 코호트 <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span></h3>
          <p className="text-[10px] text-text-muted mt-0.5">주별 신규 유저의 튜토리얼 단계별 완료율</p>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>낮음</span>
          {[0.15, 0.35, 0.55, 0.75, 0.9].map((o, i) => (
            <span
              key={i}
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(16,185,129,${o})` }}
            />
          ))}
          <span>높음</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-line bg-bg-tertiary text-text-secondary">
              <th className="px-4 py-2.5 text-left font-semibold w-24">코호트</th>
              <th className="px-3 py-2.5 text-right font-semibold w-16">가입자</th>
              {STAGES.map(s => (
                <th key={s} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {DUMMY_ROWS.map(row => (
              <tr key={row.week} className="hover:bg-bg-tertiary/50 transition-colors">
                <td className="px-4 py-2.5 text-text-secondary font-mono">{row.week}</td>
                <td className="px-3 py-2.5 text-right text-text-muted">{row.cohortSize.toLocaleString()}</td>
                {row.rates.map((rate, i) => (
                  <td
                    key={i}
                    className="px-3 py-2.5 text-center"
                    style={{ backgroundColor: cellBg(rate) }}
                  >
                    <span className={`text-[11px] ${cellText(rate)}`}>
                      {rate < 0 ? '—' : `${rate}%`}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
