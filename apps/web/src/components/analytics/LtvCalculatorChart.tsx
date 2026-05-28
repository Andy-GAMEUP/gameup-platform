'use client'
import { useMemo, useEffect, useState } from 'react'
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { DailyPoint, GameAnalyticsOverview, RetentionPoint } from '@/services/analyticsService'
import { DUMMY_NEW_USERS_DAILY, DUMMY_CUMULATIVE } from './newUsersDummy'

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `₩${(v / 1_000_000).toFixed(2)}M` :
  v >= 1_000     ? `₩${(v / 1_000).toFixed(0)}K`     : `₩${v}`

// 신규 유저 1인당 가입 후 경과일별 실제 결제액 (더미) — 실제 API 연동 시 교체
const DUMMY_COHORT_DAILY_REV: number[] = [
  // D1–D7
  380, 210, 175, 155, 145, 132, 168,
  // D8–D14
  120, 115, 108, 104,  98,  95, 112,
  // D15–D21
   88,  84,  80,  76,  73,  70,  85,
  // D22–D30
   65,  63,  61,  59,  57,  55,  53,  51,  64,
  // D31–D60
   48,  46,  45,  44,  43,  42,  41,  40,  39,  38,
   37,  36,  35,  34,  34,  33,  32,  32,  31,  30,
   30,  29,  29,  28,  28,  27,  27,  26,  26,  25,
  // D61–D90
   25,  24,  24,  23,  23,  23,  22,  22,  21,  21,
   21,  20,  20,  20,  19,  19,  19,  18,  18,  18,
   17,  17,  17,  17,  16,  16,  16,  16,  15,  15,
]

const DUMMY_RETENTION: RetentionPoint[] = [
  { day: 1,  rate: 46, cohortSize: 200 },
  { day: 7,  rate: 21, cohortSize: 200 },
  { day: 14, rate: 14, cohortSize: 200 },
  { day: 30, rate:  8, cohortSize: 200 },
]

function buildDummyOverview(): GameAnalyticsOverview {
  const totalRevenue = DUMMY_NEW_USERS_DAILY.reduce((s, d) => s + d.revenue, 0)
  const totalNew     = DUMMY_NEW_USERS_DAILY.reduce((s, d) => s + d.newMembers, 0)
  const avgDau       = Math.round(DUMMY_NEW_USERS_DAILY.reduce((s, d) => s + d.dau, 0) / DUMMY_NEW_USERS_DAILY.length)
  const avgPaying    = Math.round(DUMMY_NEW_USERS_DAILY.reduce((s, d) => s + d.payingUsers, 0) / DUMMY_NEW_USERS_DAILY.length)
  const payingUsers  = avgPaying * 6
  return {
    cumulativeMembers: DUMMY_CUMULATIVE,
    newMembers:  totalNew,
    totalRevenue,
    payingUsers,
    arpu:        avgDau > 0      ? Math.round(totalRevenue / (avgDau * DUMMY_NEW_USERS_DAILY.length)) : 0,
    arppu:       payingUsers > 0 ? Math.round(totalRevenue / payingUsers) : 0,
    pur:         avgDau > 0      ? +(avgPaying / avgDau * 100).toFixed(1) : 0,
    avgDau,
    mau:         Math.round(avgDau * 4.5),
    activeUsers: avgDau,
  }
}

const DUMMY_OVERVIEW = buildDummyOverview()

// 잔존율 보간: 알려진 포인트 사이는 선형, 이후는 지수 감소
function interpolateRetention(day: number, points: RetentionPoint[]): number {
  if (points.length === 0) return 0
  const sorted = [...points].sort((a, b) => a.day - b.day)
  if (day <= sorted[0].day) return sorted[0].rate / 100
  const last = sorted[sorted.length - 1]
  if (day >= last.day) {
    const prev = sorted[sorted.length - 2] ?? { day: 0, rate: 100 }
    if (last.rate <= 0 || prev.rate <= 0) return 0
    const decayPerDay = Math.pow(last.rate / prev.rate, 1 / Math.max(last.day - prev.day, 1))
    return (last.rate / 100) * Math.pow(Math.max(decayPerDay, 0.001), day - last.day)
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i], b = sorted[i + 1]
    if (day >= a.day && day <= b.day) {
      const t = (day - a.day) / (b.day - a.day)
      return (a.rate + t * (b.rate - a.rate)) / 100
    }
  }
  return 0
}

export default function LtvCalculatorChart({
  daily,
  overview,
  retention,
  cac,
  targetDays,
  onPaybackResult,
  onStatsResult,
}: {
  daily:             DailyPoint[]
  overview:          GameAnalyticsOverview | null
  retention:         RetentionPoint[]
  cac:               number | ''
  targetDays:        number | ''
  onPaybackResult?:  (day: number | null) => void
  onStatsResult?:    (stats: { retainedAtTarget: number; avgPct: number; newMembers: number }) => void
}) {
  const hasReal      = daily.some(d => d.dau > 0 || d.revenue > 0) && overview !== null
  const ov           = hasReal ? overview! : DUMMY_OVERVIEW
  const retPoints    = (hasReal && retention.length > 0) ? retention : DUMMY_RETENTION
  const isDummy      = !hasReal

  const cacNum        = cac        === '' ? 0 : cac
  const targetDaysNum = targetDays === '' ? 0 : targetDays

  const newMembers = ov.newMembers > 0 ? ov.newMembers : 1

  // TODO: 실제 API 연동 시 DUMMY_COHORT_DAILY_REV → 코호트별 일별 결제액 배열로 교체
  const chartData = useMemo(() => {
    if (cacNum <= 0 || targetDaysNum <= 0) return []
    const maxDays = Math.min(targetDaysNum, DUMMY_COHORT_DAILY_REV.length)
    let cumLtv = 0
    return Array.from({ length: maxDays }, (_, i) => {
      const day      = i + 1
      cumLtv        += DUMMY_COHORT_DAILY_REV[i]
      const ltv      = Math.round(cumLtv)
      const ret      = interpolateRetention(day, retPoints)
      const retained = Math.round(newMembers * ret)
      const paying   = Math.round(retained * (ov.pur / 100))
      return {
        label: `D${day}`,
        day,
        ltv,
        pct:      +((ltv / cacNum) * 100).toFixed(1),
        retained,
        paying,
      }
    })
  }, [cacNum, targetDaysNum, newMembers, retPoints, ov.pur])

  const [showRetained, setShowRetained] = useState(true)
  const [showPaying,   setShowPaying]   = useState(true)

  const finalLtv   = chartData[chartData.length - 1]?.ltv ?? 0
  const paybackDay = cacNum > 0 ? (chartData.find(p => p.ltv >= cacNum)?.day ?? null) : null
  const maxPct     = chartData.length > 0 ? Math.max(...chartData.map(d => d.pct), 100) : 100

  useEffect(() => {
    if (cacNum > 0 && targetDaysNum > 0) onPaybackResult?.(paybackDay)
  }, [paybackDay, cacNum, targetDaysNum])

  useEffect(() => {
    const retainedAtTarget = chartData[chartData.length - 1]?.retained ?? 0
    const avgPct = chartData.length > 0 ? +(chartData.reduce((s, d) => s + d.pct, 0) / chartData.length).toFixed(1) : 0
    onStatsResult?.({ retainedAtTarget, avgPct, newMembers: ov.newMembers })
  }, [chartData, ov.newMembers])

  const dummyTag = isDummy
    ? <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>
    : null

  const milestones = [7, 30].filter(d => d < targetDaysNum)

  return (
    <div className="space-y-4">
      {/* 회수율 곡선 */}
      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-line bg-bg-tertiary flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold">목표 금액 회수율 곡선{dummyTag}</h3>
            <p className="text-[10px] text-text-muted mt-0.5">가입 후 경과일 기준 · 평균 ARPU × 잔존율 누적</p>
          </div>
          <div className="flex items-center bg-bg-primary rounded-md p-0.5 text-xs gap-0.5">
            <button
              onClick={() => setShowRetained(p => p && !showPaying ? p : !p)}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                showRetained ? 'bg-[#34d399]/20 text-[#34d399]' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              잔존 인원
            </button>
            <button
              onClick={() => setShowPaying(p => p && !showRetained ? p : !p)}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                showPaying ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              결제 인원
            </button>
          </div>
        </div>

        <div className="p-5 h-[300px]">
          {(cacNum <= 0 || targetDaysNum <= 0) ? (
            <div className="h-full flex items-center justify-center text-text-muted text-sm">
              목표 금액과 목표 기간을 입력 후 계산하기를 눌러주세요
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 48, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="ltvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="label"
                  stroke="#9ca3af"
                  tick={{ fontSize: 9 }}
                  interval={Math.max(0, Math.floor(chartData.length / 10))}
                />
                {/* 좌축: 회수율 % */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#a78bfa"
                  tick={{ fontSize: 10, fill: '#a78bfa' }}
                  width={44}
                  domain={[0, maxPct]}
                  tickFormatter={v => `${v}%`}
                />
                {/* 우축: 잔존/결제 인원 */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#34d399"
                  tick={{ fontSize: 10, fill: '#34d399' }}
                  width={48}
                  tickFormatter={v => `${v.toLocaleString()}명`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
                  formatter={(v, name, props) => {
                    if (name === '잔존 인원' || name === '결제 인원') return [`${Number(v).toLocaleString()}명`, name]
                    const ltv = props.payload?.ltv ?? 0
                    return [`${v}%  (${fmtMoney(ltv)})`, '목표 금액 회수율']
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={v => <span style={{ color: '#9ca3af' }}>{v}</span>}
                />
                <ReferenceLine
                  yAxisId="left"
                  y={100}
                  stroke="#10b981"
                  strokeDasharray="4 3"
                  label={{ value: `목표 ${fmtMoney(cacNum)}`, position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
                />
                {milestones.map(d => (
                  <ReferenceLine
                    key={d}
                    yAxisId="left"
                    x={`D${d}`}
                    stroke="#4b5563"
                    strokeDasharray="3 3"
                    label={{ value: `D${d}`, position: 'top', fontSize: 9, fill: '#6b7280' }}
                  />
                ))}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="pct"
                  name="목표 금액 회수율"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  fill="url(#ltvGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#a78bfa' }}
                />
                {showRetained && (
                  <Bar
                    yAxisId="right"
                    dataKey="retained"
                    name="잔존 인원"
                    fill="#34d399"
                    fillOpacity={0.45}
                    radius={[2, 2, 0, 0]}
                  />
                )}
                {showPaying && (
                  <Bar
                    yAxisId="right"
                    dataKey="paying"
                    name="결제 인원"
                    fill="#f59e0b"
                    fillOpacity={0.55}
                    radius={[2, 2, 0, 0]}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
