'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/formatDate'

type VipTier = 'Diamond' | 'Gold' | 'Silver' | 'Bronze'

const TIER_CONFIG: Record<VipTier, { color: string; bg: string; text: string; border: string }> = {
  Diamond: { color: '#a78bfa', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  Gold:    { color: '#f59e0b', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  Silver:  { color: '#9ca3af', bg: 'bg-gray-500/20',   text: 'text-gray-300',   border: 'border-gray-500/40'   },
  Bronze:  { color: '#d97706', bg: 'bg-amber-700/20',  text: 'text-amber-600',  border: 'border-amber-700/40'  },
}

type HistoryItem = { date: string; time: string; item: string; amount: number }
const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

const historyToDaily = (history: HistoryItem[], from: Date, to: Date) => {
  const map = new Map<string, number>()
  history.forEach(h => map.set(h.date, (map.get(h.date) ?? 0) + h.amount))
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from); d.setDate(d.getDate() + i)
    return { label: fmt(d), amount: map.get(d.toISOString().split('T')[0]) ?? 0 }
  })
}

const historyToWeekly = (history: HistoryItem[], from: Date, to: Date) => {
  const days  = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  const weeks = Math.max(1, Math.ceil(days / 7))
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(from); start.setDate(start.getDate() + i * 7)
    const end   = new Date(start); end.setDate(end.getDate() + 6)
    const clampedEnd = end > to ? to : end
    const startStr = start.toISOString().split('T')[0]
    const endStr   = clampedEnd.toISOString().split('T')[0]
    const amount = history
      .filter(h => h.date >= startStr && h.date <= endStr)
      .reduce((s, h) => s + h.amount, 0)
    return { label: fmt(start), tooltip: `${fmt(start)} ~ ${fmt(clampedEnd)}`, amount }
  })
}

const historyToMonthly = (history: HistoryItem[], from: Date, to: Date) => {
  const result: { label: string; amount: number }[] = []
  const cur = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  while (cur <= end) {
    const ym = cur.toISOString().slice(0, 7)
    const amount = history.filter(h => h.date.startsWith(ym)).reduce((s, h) => s + h.amount, 0)
    result.push({ label: `${cur.getMonth() + 1}월`, amount })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
}

const genDailySession = (seed: number, from: Date, to: Date) => {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from); d.setDate(d.getDate() + i)
    const pseudo = Math.sin(seed * 5.1 + i * 0.8) * 0.5 + 0.5
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      min: Math.round(20 + pseudo * 80 + seed * 1.5),
    }
  })
}

const genDailyPlayStart = (seed: number, from: Date, to: Date) => {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  const baseHour = 7 + ((seed * 3.7) % 14)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from); d.setDate(d.getDate() + i)
    const actPseudo = Math.sin(seed * 4.1 + i * 2.3) * 0.5 + 0.5
    if (actPseudo < 0.3) return { date: `${d.getMonth() + 1}/${d.getDate()}`, hour: null as number | null }
    const timePseudo = Math.sin(seed * 6.7 + i * 1.3) * 0.5 + 0.5
    const hour = Math.round(Math.min(23.9, Math.max(0, baseHour + timePseudo * 3 - 1.5)) * 10) / 10
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, hour }
  })
}

const genPaymentHistory = (count: number, seed: number, from: Date, to: Date) => {
  const rangeMs = Math.max(1, to.getTime() - from.getTime())
  return Array.from({ length: count }, (_, i) => {
    const pseudo = Math.sin(seed * 7.3 + i * 1.9) * 0.5 + 0.5
    const d = new Date(from.getTime() + Math.floor(pseudo * rangeMs))
    const items = ['전설 패키지', '시즌 패스', '다이아 100개', '기간 한정 스킨', '스타터 번들', '월정액']
    const amounts = [29000, 49000, 15000, 39000, 9900, 19900]
    const idx = Math.floor(Math.sin(seed * 3.1 + i * 5.7) * 0.5 + 0.5) * 5 | 0
    const hPseudo = Math.sin(seed * 2.9 + i * 3.7) * 0.5 + 0.5
    const mPseudo = Math.sin(seed * 5.3 + i * 7.1) * 0.5 + 0.5
    const hour = Math.floor(hPseudo * 24)
    const minute = Math.floor(mPseudo * 60)
    return {
      date: d.toISOString().split('T')[0],
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      item: items[idx % items.length],
      amount: amounts[idx % amounts.length],
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export const DUMMY_PAYERS = [
  { rank: 1,  nickname: 'DragonSlayer99', total: 420000, count: 18, lastDate: '2026-05-24', tier: 'Diamond' as VipTier },
  { rank: 2,  nickname: '별빛전사',        total: 385000, count: 15, lastDate: '2026-05-25', tier: 'Diamond' as VipTier },
  { rank: 3,  nickname: 'IronWolf77',     total: 312000, count: 13, lastDate: '2026-05-22', tier: 'Diamond' as VipTier },
  { rank: 4,  nickname: '퍼플나이트',      total: 278000, count: 11, lastDate: '2026-05-20', tier: 'Gold'    as VipTier },
  { rank: 5,  nickname: 'StarBreaker',    total: 241000, count: 10, lastDate: '2026-05-23', tier: 'Gold'    as VipTier },
  { rank: 6,  nickname: '천둥검사',        total: 198000, count:  9, lastDate: '2026-05-18', tier: 'Gold'    as VipTier },
  { rank: 7,  nickname: 'NightOwl42',     total: 175000, count:  8, lastDate: '2026-05-21', tier: 'Gold'    as VipTier },
  { rank: 8,  nickname: '레드드래곤',      total: 152000, count:  7, lastDate: '2026-05-19', tier: 'Silver'  as VipTier },
  { rank: 9,  nickname: 'SilverArrow',    total: 134000, count:  6, lastDate: '2026-05-17', tier: 'Silver'  as VipTier },
  { rank: 10, nickname: '골든이글',        total: 118000, count:  6, lastDate: '2026-05-15', tier: 'Silver'  as VipTier },
  { rank: 11, nickname: 'BlueMoon',       total:  98000, count:  5, lastDate: '2026-05-14', tier: 'Silver'  as VipTier },
  { rank: 12, nickname: '폭풍기사',        total:  82000, count:  4, lastDate: '2026-05-12', tier: 'Silver'  as VipTier },
  { rank: 13, nickname: 'FireStorm',      total:  67000, count:  4, lastDate: '2026-05-10', tier: 'Bronze'  as VipTier },
  { rank: 14, nickname: '은빛달',          total:  54000, count:  3, lastDate: '2026-05-09', tier: 'Bronze'  as VipTier },
  { rank: 15, nickname: 'CrystalWing',    total:  42000, count:  3, lastDate: '2026-05-08', tier: 'Bronze'  as VipTier },
]

const USER_DATA = DUMMY_PAYERS.map(p => ({
  ...p,
  avgAmount: Math.round(p.total / p.count / 100) * 100,
}))

type PayPeriod = 'daily' | 'weekly' | 'monthly'

function defaultPeriod(from: Date, to: Date): PayPeriod {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000)
  if (days <= 31)  return 'daily'
  if (days <= 180) return 'weekly'
  return 'monthly'
}

export default function VipUsersChart({ selectedRank, from, to }: { selectedRank: number; from: string; to: string }) {
  const fromDate = new Date(from)
  const toDate   = new Date(to)

  const [payPeriod, setPayPeriod] = useState<PayPeriod>(() => defaultPeriod(fromDate, toDate))

  type SortCol = 'date' | 'item' | 'amount' | 'time'
  type SortDir = 'asc' | 'desc'
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // 기간이 바뀌면 적절한 단위로 초기화
  useEffect(() => {
    setPayPeriod(defaultPeriod(new Date(from), new Date(to)))
  }, [from, to])

  const user = USER_DATA.find(u => u.rank === selectedRank)!
  const cfg  = TIER_CONFIG[user.tier]

  const history = genPaymentHistory(user.count, user.rank, fromDate, toDate)

  const sortedHistory = [...history].sort((a, b) => {
    let cmp = 0
    if (sortCol === 'date')   cmp = a.date.localeCompare(b.date)
    if (sortCol === 'item')   cmp = a.item.localeCompare(b.item)
    if (sortCol === 'amount') cmp = a.amount - b.amount
    if (sortCol === 'time')   cmp = a.time.localeCompare(b.time)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const spendData =
    payPeriod === 'daily'   ? historyToDaily(history, fromDate, toDate)   :
    payPeriod === 'weekly'  ? historyToWeekly(history, fromDate, toDate)  :
                              historyToMonthly(history, fromDate, toDate)

  const sessionData   = genDailySession(user.rank, fromDate, toDate)
  const playStartData = genDailyPlayStart(user.rank, fromDate, toDate)

  return (
    <div className="space-y-4">

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-bg-secondary border border-line rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">결제 추이 (더미)</h3>
              <div className="flex items-center gap-1 bg-bg-tertiary rounded-md p-0.5">
                {(['daily', 'weekly', 'monthly'] as PayPeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPayPeriod(p)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                      payPeriod === p
                        ? 'bg-accent text-text-primary'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {p === 'daily' ? '일일' : p === 'weekly' ? '주별' : '월별'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: payPeriod === 'daily' ? 8 : 11 }} interval={Math.max(0, Math.floor(spendData.length / 8))} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={50} tickFormatter={v => `₩${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
                    itemStyle={{ color: '#f9fafb' }}
                    labelFormatter={(label, payload) =>
                      payPeriod === 'weekly' && payload?.[0]?.payload?.tooltip
                        ? payload[0].payload.tooltip
                        : label
                    }
                    formatter={(v) => [`₩${Number(v).toLocaleString()}`, '결제액']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {spendData.map((_, i) => (
                      <Cell key={i} fill={cfg.color} fillOpacity={0.5 + (i / spendData.length) * 0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-secondary border border-line rounded-lg p-5">
            <h3 className="text-sm font-bold mb-4">일일 세션타임 (더미)</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(sessionData.length / 8))} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} width={36} tickFormatter={v => `${v}m`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
                    itemStyle={{ color: '#f9fafb' }}
                    formatter={(v) => [`${v}분`, '세션']}
                  />
                  <Line type="monotone" dataKey="min" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-secondary border border-line rounded-lg p-5">
            <h3 className="text-sm font-bold mb-3">일일 플레이 시작 (더미)</h3>
            <div className="flex gap-2" style={{ height: 180 }}>
              {/* Y축 */}
              <div className="flex flex-col justify-between flex-shrink-0 w-8 pb-5 pt-0.5">
                {['23h', '18h', '12h', '06h', '00h'].map(l => (
                  <span key={l} className="text-[9px] text-text-muted text-right block">{l}</span>
                ))}
              </div>
              {/* 히트맵 + X축 */}
              <div className="flex-1 flex flex-col min-w-0 gap-1">
                <div className="flex-1 overflow-x-auto">
                  <div
                    className="flex gap-px h-full"
                    style={{ minWidth: playStartData.length * 8 }}
                  >
                    {playStartData.map((d, ci) => {
                      const ah = d.hour !== null ? Math.floor(d.hour) : -1
                      return (
                        <div key={ci} className="flex flex-col gap-px" style={{ minWidth: 7, flex: 1 }}>
                          {Array.from({ length: 24 }, (_, i) => {
                            const h = 23 - i
                            return (
                              <div
                                key={h}
                                style={{
                                  flex: 1,
                                  borderRadius: 1,
                                  backgroundColor: h === ah ? cfg.color : 'rgba(55,65,81,0.35)',
                                }}
                                title={`${d.date} ${String(h).padStart(2, '0')}:00`}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* X축 날짜 */}
                <div className="flex overflow-x-hidden" style={{ minWidth: playStartData.length * 8 }}>
                  {playStartData.map((d, i) => {
                    const step = Math.max(1, Math.floor(playStartData.length / 8))
                    return (
                      <div key={i} className="text-[8px] text-text-muted" style={{ minWidth: 7, flex: 1 }}>
                        {i % step === 0 ? d.date : ''}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-line bg-bg-tertiary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            <h3 className="text-sm font-bold">결제 내역 (더미)</h3>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-tertiary">
                <tr className="border-b border-line text-text-secondary font-semibold">
                  {([
                    { col: 'date'  as SortCol, label: '날짜',     align: 'text-left'  },
                    { col: 'item'  as SortCol, label: '아이템',   align: 'text-left'  },
                    { col: 'amount'as SortCol, label: '금액',     align: 'text-right' },
                    { col: 'time'  as SortCol, label: '구매 시간', align: 'text-right' },
                  ]).map(({ col, label, align }) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`px-4 py-2.5 ${align} cursor-pointer select-none hover:text-text-primary transition-colors`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <span className="text-[10px] leading-none">
                          {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {sortedHistory.slice(0, 50).map((h, i) => (
                  <tr key={i} className="hover:bg-bg-tertiary transition-colors">
                    <td className="px-4 py-2.5 text-text-muted">{formatDate(h.date)}</td>
                    <td className="px-4 py-2.5 text-text-primary">{h.item}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-accent">₩{h.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  )
}
