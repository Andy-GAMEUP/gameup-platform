'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DailyPoint, TopItem } from '@/services/analyticsService'

type SortKey = 'idx' | 'name' | 'price' | 'sales' | 'buyers' | 'avgPurchase' | 'revenue' | 'arpu' | 'arppu' | 'extra'
type SortDir = 'asc' | 'desc'

type MetricKey = 'salesCount' | 'salesRevenue' | 'buyerCount'

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'salesCount',   label: '판매 수'      },
  { key: 'salesRevenue', label: '판매 금액'    },
  { key: 'buyerCount',   label: '구매 유저 수' },
]

const ITEM_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#a78bfa',
  '#ef4444', '#06b6d4', '#f97316',
]

const DUMMY_ITEMS: TopItem[] = [
  { name: '전설 검 패키지',      price: 9900,  sales: 312, currency: 'KRW' },
  { name: '다이아몬드 300개',    price: 4900,  sales: 287, currency: 'KRW' },
  { name: '월정액 패스',         price: 14900, sales: 241, currency: 'KRW' },
  { name: '초보자 스타터팩',     price: 1900,  sales: 198, currency: 'KRW' },
  { name: '코스튬 – 불꽃기사',  price: 7900,  sales: 143, currency: 'KRW' },
  { name: '경험치 부스터 (7일)', price: 3900,  sales: 121, currency: 'KRW' },
  { name: '펫 – 황금 드래곤',    price: 12900, sales:  98, currency: 'KRW' },
]


const DUMMY_DAILY: DailyPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000)
  const dau = 1200 + Math.round(Math.sin(i / 3) * 300 + Math.random() * 200)
  const payingUsers = Math.round(dau * (0.04 + Math.random() * 0.02))
  return {
    date: d.toISOString().split('T')[0],
    dau, newMembers: Math.round(dau * 0.08), payingUsers,
    revenue: payingUsers * (8000 + Math.round(Math.random() * 4000)),
    sessionTime: 18,
  }
})

function buildChartData(dailyData: DailyPoint[], items: TopItem[], metric: MetricKey) {
  const totalSales   = items.reduce((s, it) => s + it.sales, 0)
  const totalRevenue = items.reduce((s, it) => s + it.price * it.sales, 0)

  return dailyData.map(d => {
    const dailyTotal =
      metric === 'salesRevenue' ? d.revenue :
      metric === 'salesCount'   ? Math.round(d.payingUsers * 1.8) :
      d.payingUsers

    const row: Record<string, number | string> = { date: d.date }
    items.forEach(it => {
      const ratio =
        metric === 'salesRevenue'
          ? (it.price * it.sales) / (totalRevenue || 1)
          : it.sales / (totalSales || 1)
      row[it.name] = Math.round(dailyTotal * ratio)
    })
    return row
  })
}

export default function SalesProductChart({ data, topItems }: { data: DailyPoint[]; topItems: TopItem[] }) {
  const [metric, setMetric] = useState<MetricKey>('salesRevenue')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('idx')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const items   = topItems.length > 0 ? topItems : DUMMY_ITEMS
  const hasReal = data.some(d => d.revenue > 0 || d.payingUsers > 0)
  const daily   = hasReal ? data : DUMMY_DAILY
  const avgDau  = daily.length > 0 ? Math.round(daily.reduce((s, d) => s + d.dau, 0) / daily.length) : 1

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sortedItems = [...items].sort((a, b) => {
    const bA = Math.round(a.sales * 0.9), bB = Math.round(b.sales * 0.9)
    const rA = a.price * a.sales,         rB = b.price * b.sales
    const vals: Record<SortKey, number | string> = {
      idx:         items.indexOf(a),
      name:        a.name,
      price:       a.price,
      sales:       a.sales,
      buyers:      bA,
      avgPurchase: bA > 0 ? a.sales / bA : 0,
      revenue:     rA,
      arpu:        avgDau > 0 ? rA / avgDau : 0,
      arppu:       bA > 0 ? rA / bA : 0,
      extra:       bA > 0 ? (a.sales - bA) / bA : 0,
    }
    const valsB: Record<SortKey, number | string> = {
      idx:         items.indexOf(b),
      name:        b.name,
      price:       b.price,
      sales:       b.sales,
      buyers:      bB,
      avgPurchase: bB > 0 ? b.sales / bB : 0,
      revenue:     rB,
      arpu:        avgDau > 0 ? rB / avgDau : 0,
      arppu:       bB > 0 ? rB / bB : 0,
      extra:       bB > 0 ? (b.sales - bB) / bB : 0,
    }
    const vA = vals[sortKey], vB = valsB[sortKey]
    const cmp = typeof vA === 'string' ? vA.localeCompare(vB as string) : (vA as number) - (vB as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="inline w-3 h-3 ml-0.5 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp   className="inline w-3 h-3 ml-0.5 text-accent" />
      : <ChevronDown className="inline w-3 h-3 ml-0.5 text-accent" />
  }

  const chartData = buildChartData(daily, items, metric)

  const toggle = (name: string) =>
    setHidden(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })

  const fmtTick = (v: number) =>
    metric === 'salesRevenue' ? `₩${Number(v).toLocaleString()}` : v.toLocaleString()

  const fmtTooltip = (v: number, name: string) => {
    const val = metric === 'salesRevenue'
      ? `₩${Number(v).toLocaleString()}`
      : `${v.toLocaleString()}${metric === 'salesCount' ? '건' : '명'}`
    return [val, name]
  }

  return (
    <div className="space-y-4">
      {/* 차트 */}
      <div className="flex gap-4 items-stretch">
        <div className="flex-1 min-w-0 bg-bg-secondary border border-line rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="text-lg font-bold">일별 판매 현황</h3>
            <div className="flex border border-line rounded-md overflow-hidden">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
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

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={72} tickFormatter={fmtTick} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                  formatter={(v, name) => fmtTooltip(Number(v), name as string)}
                />
                {items.map((it, i) => hidden.has(it.name) ? null : (
                  <Line
                    key={it.name}
                    type="monotone"
                    dataKey={it.name}
                    stroke={ITEM_COLORS[i % ITEM_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 상품 토글 — 차트 아래, Y축 기준 정렬 */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 pl-[72px]">
            {items.map((it, i) => {
              const isHidden = hidden.has(it.name)
              return (
                <button
                  key={it.name}
                  onClick={() => toggle(it.name)}
                  className="flex items-center gap-1 transition-opacity"
                  style={{ opacity: isHidden ? 0.35 : 1, fontSize: '9px' }}
                >
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] }} />
                  <span className={isHidden ? 'text-text-muted line-through' : 'text-text-secondary'}>{it.name}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* 아이템 리스트 */}
      <div className="bg-bg-secondary border border-line rounded-lg overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr className="border-b border-line bg-bg-tertiary text-text-secondary font-semibold select-none">
              <th className="px-3 py-2.5 text-left w-10 cursor-pointer hover:text-text-primary" onClick={() => handleSort('idx')}># <SortIcon k="idx" /></th>
              <th className="px-3 py-2.5 text-left border-r border-line cursor-pointer hover:text-text-primary" onClick={() => handleSort('name')}>상품명 <SortIcon k="name" /></th>
              <th className="px-3 py-2.5 text-left whitespace-nowrap border-r border-line cursor-pointer hover:text-text-primary" onClick={() => handleSort('price')}>단가 <SortIcon k="price" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('sales')}>구매 수 <SortIcon k="sales" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('buyers')}>구매자 수 <SortIcon k="buyers" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('revenue')}>판매 금액 <SortIcon k="revenue" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('arpu')}>ARPU <SortIcon k="arpu" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('arppu')}>ARPPU <SortIcon k="arppu" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('avgPurchase')}>1인당 평균 구매 수 <SortIcon k="avgPurchase" /></th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap cursor-pointer hover:text-text-primary" onClick={() => handleSort('extra')}>평균 추가 구매 수 <SortIcon k="extra" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {sortedItems.map((item, idx) => {
              const origIdx     = items.indexOf(item)
              const buyers      = Math.round(item.sales * 0.9)
              const avgPurchase = buyers > 0 ? Number((item.sales / buyers).toFixed(2)) : 0
              const revenue     = item.price * item.sales
              const arpu        = avgDau  > 0 ? Math.round(revenue / avgDau)  : 0
              const arppu       = buyers  > 0 ? Math.round(revenue / buyers)  : 0
              const extraPays   = buyers > 0 ? Number(((item.sales - buyers) / buyers).toFixed(2)) : 0
              return (
                <tr key={item.name} className="hover:bg-bg-tertiary transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: ITEM_COLORS[origIdx % ITEM_COLORS.length] }} />
                      <span className={`font-bold ${
                        idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-text-muted'
                      }`}>{idx + 1}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-primary max-w-[180px] truncate border-r border-line">{item.name}</td>
                  <td className="px-3 py-2.5 text-left text-text-secondary whitespace-nowrap border-r border-line">
                    {item.currency === 'KRW' ? `₩${item.price.toLocaleString()}` : `${item.price} ${item.currency}`}
                  </td>
                  <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{item.sales.toLocaleString()}건</td>
                  <td className="px-3 py-2.5 text-right text-text-primary whitespace-nowrap">{buyers.toLocaleString()}명</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-accent whitespace-nowrap">₩{revenue.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap">₩{arpu.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap">₩{arppu.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap">{avgPurchase.toFixed(2)}회</td>
                  <td className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap">{extraPays.toFixed(2)}회</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
