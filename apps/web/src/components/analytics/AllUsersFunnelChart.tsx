'use client'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

const STAGES     = ['앱 설치', '앱 첫 실행', '회원가입', '튜토리얼 시작', '튜토리얼 완료', '게임 진입']
const BASE_RATES = [100, 89, 74, 67, 54, 46]
const BASE_TIMES = [0, 18, 95, 40, 320, 60]

const SEED = 37
const DATA = {
  cohortSize: 4820,
  rates:    BASE_RATES.map((base, i) => i === 0 ? 100 : Math.max(0, Math.min(100, base + Math.round(Math.sin(SEED * (i + 1) * 2.3) * 3)))),
  avgTimes: BASE_TIMES.map((base, i) => i === 0 ? 0 : Math.max(30, base + Math.round(Math.sin(SEED * (i + 2) * 1.7) * 20))),
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}초`
  if (s === 0) return `${m}분`
  return `${m}분 ${s}초`
}

const BAR_COLOR = '#3b82f6'

const CustomTooltip = ({
  active, payload, label, cohortSize,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
  cohortSize: number
}) => {
  if (!active || !payload?.length) return null
  const rate  = payload[0].value
  const count = Math.round(cohortSize * rate / 100)
  return (
    <div className="bg-[#111827] border border-[#374151] rounded-lg p-3 text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-white mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-[#9ca3af]">완료율</span>
        <span className="font-bold text-white">{rate}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[#9ca3af]">완료 인원</span>
        <span className="font-bold text-white">{count.toLocaleString()}명</span>
      </div>
    </div>
  )
}

export default function AllUsersFunnelChart() {
  const { cohortSize, rates, avgTimes } = DATA

  const chartData = STAGES.map((stage, i) => ({
    stage,
    rate: rates[i],
  }))

  return (
    <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-line bg-bg-tertiary">
        <h3 className="text-sm font-bold">
          게임 시작 퍼널
          <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>
        </h3>
      </div>

      {/* Chart */}
      <div className="px-5 pt-5 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="stage"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              width={36}
              tickFormatter={v => `${v}%`}
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={50} stroke="#374151" strokeDasharray="4 4" />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  active={props.active}
                  payload={props.payload as { value: number }[]}
                  label={props.label as string}
                  cohortSize={cohortSize}
                />
              )}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLOR} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats table */}
      <div className="overflow-x-auto px-5 pb-5 pt-3">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pr-4 text-left text-text-muted font-medium w-28">지표</th>
              {STAGES.map(s => (
                <th key={s} className="py-2 px-2 text-center text-text-secondary font-semibold whitespace-nowrap">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {/* 완료율 + 완료 인원 */}
            <tr className="hover:bg-bg-tertiary/50 transition-colors">
              <td className="py-2.5 pr-4 text-text-muted font-medium whitespace-nowrap">완료율</td>
              {rates.map((r, i) => (
                <td key={i} className="py-2.5 px-2 text-center">
                  <span className="font-bold text-blue-600">{r}%</span>
                  <span className="text-text-muted ml-1">({Math.round(cohortSize * r / 100).toLocaleString()}명)</span>
                </td>
              ))}
            </tr>

            {/* 이탈 비율 + 이탈 인원 */}
            <tr className="hover:bg-bg-tertiary/50 transition-colors">
              <td className="py-2.5 pr-4 text-text-muted font-medium whitespace-nowrap">이탈 비율</td>
              {rates.map((r, i) => {
                const prev     = i === 0 ? 100 : rates[i - 1]
                const dropRate = Math.round((prev - r) / prev * 1000) / 10
                const dropN    = Math.round(cohortSize * prev / 100) - Math.round(cohortSize * r / 100)
                return (
                  <td key={i} className="py-2.5 px-2 text-center">
                    {i === 0
                      ? <span className="text-text-muted">—</span>
                      : <>
                          <span className="text-red-400 font-semibold">-{dropRate}%</span>
                          <span className="text-text-muted ml-1">(-{dropN.toLocaleString()}명)</span>
                        </>
                    }
                  </td>
                )
              })}
            </tr>

            {/* 평균 진행 시간 */}
            <tr className="hover:bg-bg-tertiary/50 transition-colors">
              <td className="py-2.5 pr-4 text-text-muted font-medium whitespace-nowrap">평균 진행 시간</td>
              {avgTimes.map((t, i) => (
                <td key={i} className="py-2.5 px-2 text-center text-text-secondary">
                  {t === 0 ? <span className="text-text-muted">—</span> : fmtTime(t)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
