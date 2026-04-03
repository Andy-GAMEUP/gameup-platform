'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import {
  Loader2, BarChart3, Users, Eye, Clock, UserPlus,
  TrendingUp, TrendingDown, ArrowRight,
} from 'lucide-react'

/* ── 타입 ───────────────────────────────────────────────────── */
interface DashboardSummary {
  today: {
    dau: number; newVisitors: number; returningVisitors: number
    avgDuration: number; totalPageViews: number; newSignups: number; activeLogins: number
  }
  yesterday: { dau: number; totalPageViews: number; avgDuration: number }
  trends: { dau7d: { date: string; count: number }[]; wau: number; mau: number }
  topPages: { page: string; menu: string; views: number; uniqueVisitors: number; avgDuration: number }[]
  menuBreakdown: { menu: string; views: number; percentage: number }[]
  visitorComposition: { members: number; guests: number }
}

interface VisitorRow {
  date: string; total: number; newVisitors: number; members: number
  guests: number; newSignups: number; avgPageviews: number
}

interface LineKey { key: keyof VisitorRow; label: string; color: string }

/* ── 상수 ───────────────────────────────────────────────────── */
const LINE_KEYS: LineKey[] = [
  { key: 'total',       label: '총 방문자',    color: '#22d3ee' },
  { key: 'newVisitors', label: '신규 방문자',  color: '#a78bfa' },
  { key: 'members',     label: '회원 접속',    color: '#34d399' },
  { key: 'guests',      label: '비회원 방문',  color: '#f97316' },
  { key: 'newSignups',  label: '신규 가입',    color: '#f43f5e' },
  { key: 'avgPageviews',label: '평균 페이지뷰',color: '#facc15' },
]
const PERIOD_BUTTONS = ['1일', '1주', '1달', '3개월']
const PLATFORMS = ['전체', 'PC', 'Mobile']
const PIE_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f97316', '#f43f5e', '#facc15', '#64748b', '#fb923c', '#818cf8']

const MENU_LABEL: Record<string, string> = {
  home: '홈', games: '게임', community: '커뮤니티', partner: '파트너',
  publishing: '퍼블리싱', minihome: '미니홈', support: '지원', solution: '솔루션', other: '기타',
}

/* ── 유틸 ───────────────────────────────────────────────────── */
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function changeRate(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  const pct = Math.round(((current - previous) / previous) * 100)
  return { value: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

/* ── KPI 카드 ───────────────────────────────────────────────── */
function KpiCard({ label, value, sub, change, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  change?: { value: string; positive: boolean }
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-bg-secondary border border-line rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-text-secondary text-xs">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-2">
            {change && (
              <span className={`text-xs font-medium ${change.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {change.positive ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> : <TrendingDown className="inline w-3 h-3 mr-0.5" />}
                {change.value}
              </span>
            )}
            {sub && <span className="text-text-muted text-xs">{sub}</span>}
          </div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-opacity-20`}
          style={{ backgroundColor: color === 'text-cyan-400' ? '#22d3ee33' : color === 'text-purple-400' ? '#a78bfa33' : color === 'text-emerald-400' ? '#34d39933' : color === 'text-orange-400' ? '#f9731633' : color === 'text-pink-400' ? '#f43f5e33' : '#64748b33' }}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [platform, setPlatform] = useState('전체')
  const [visitorData, setVisitorData] = useState<VisitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(LINE_KEYS.map(l => l.key)),
  )

  // 대시보드 요약 로드
  useEffect(() => {
    setLoading(true)
    adminService.getAnalyticsDashboard()
      .then((res) => setDashboard(res as DashboardSummary))
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false))
  }, [])

  // 방문자 추이 로드
  const fetchVisitorStats = useCallback(() => {
    setChartLoading(true)
    adminService.getVisitorStats({
      startDate, endDate,
      platform: platform === '전체' ? undefined : platform,
    })
      .then((res) => {
        const raw = res as { stats?: VisitorRow[] }
        setVisitorData(raw?.stats ?? [])
      })
      .catch(() => setVisitorData([]))
      .finally(() => setChartLoading(false))
  }, [startDate, endDate, platform])

  useEffect(() => { fetchVisitorStats() }, [fetchVisitorStats])

  const applyPeriod = (p: string) => {
    const end = new Date()
    const start = new Date()
    if (p === '1일') start.setDate(start.getDate() - 1)
    else if (p === '1주') start.setDate(start.getDate() - 7)
    else if (p === '1달') start.setMonth(start.getMonth() - 1)
    else if (p === '3개월') start.setMonth(start.getMonth() - 3)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(end.toISOString().slice(0, 10))
  }

  const toggleLine = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    </AdminLayout>
  )

  const d = dashboard
  const dauChange = d ? changeRate(d.today.dau, d.yesterday.dau) : undefined
  const pvChange = d ? changeRate(d.today.totalPageViews, d.yesterday.totalPageViews) : undefined
  const durChange = d ? changeRate(d.today.avgDuration, d.yesterday.avgDuration) : undefined

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">방문 통계</h2>
        </div>

        {/* ── KPI 카드 ──────────────────────────────────────── */}
        {d && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard label="DAU (오늘)" value={d.today.dau} change={dauChange} sub="전일 대비" icon={Users} color="text-cyan-400" />
            <KpiCard label="총 페이지뷰" value={d.today.totalPageViews} change={pvChange} sub="전일 대비" icon={Eye} color="text-purple-400" />
            <KpiCard label="평균 체류시간" value={formatDuration(d.today.avgDuration)} change={durChange} sub="전일 대비" icon={Clock} color="text-emerald-400" />
            <KpiCard label="신규 방문자" value={d.today.newVisitors} icon={UserPlus} color="text-orange-400" />
            <KpiCard label="WAU" value={d.trends.wau} sub="주간 활성" icon={TrendingUp} color="text-pink-400" />
            <KpiCard label="MAU" value={d.trends.mau} sub="월간 활성" icon={TrendingUp} color="text-yellow-400" />
          </div>
        )}

        {/* ── 중단: DAU 추이 + 인기 페이지 ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* DAU 추이 차트 (3/5) */}
          <div className="lg:col-span-3 bg-bg-secondary border border-line rounded-xl p-5 space-y-4">
            <h3 className="text-text-primary text-sm font-semibold">방문자 추이</h3>

            {/* 필터 */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-text-secondary text-xs">시작일</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-text-secondary text-xs">종료일</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="flex gap-1">
                {PERIOD_BUTTONS.map(p => (
                  <button key={p} onClick={() => applyPeriod(p)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary transition-colors border border-line">
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                      platform === p
                        ? 'bg-accent-light text-accent-text border-accent-muted'
                        : 'bg-bg-tertiary text-text-secondary border-line hover:bg-line-light'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={fetchVisitorStats}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                조회
              </button>
            </div>

            {/* 라인 토글 */}
            <div className="flex flex-wrap gap-2">
              {LINE_KEYS.map(({ key, label, color }) => (
                <button key={key} onClick={() => toggleLine(key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
                    activeLines.has(key)
                      ? 'border-transparent text-text-primary'
                      : 'border-line text-text-muted bg-bg-tertiary'
                  }`}
                  style={activeLines.has(key) ? { backgroundColor: color + '33', borderColor: color } : {}}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeLines.has(key) ? color : '#475569' }} />
                  {label}
                </button>
              ))}
            </div>

            {/* 차트 */}
            {chartLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
              </div>
            ) : visitorData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
                데이터가 없습니다
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={visitorData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#94a3b8' }} />
                  <Legend />
                  {LINE_KEYS.filter(l => activeLines.has(l.key)).map(({ key, label, color }) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} name={label} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 인기 페이지 Top 10 (2/5) */}
          <div className="lg:col-span-2 bg-bg-secondary border border-line rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary text-sm font-semibold">인기 페이지 Top 10</h3>
              <span className="text-text-muted text-xs">최근 7일</span>
            </div>
            {d && d.topPages.length > 0 ? (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {d.topPages.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-bg-tertiary/50 transition-colors">
                    <span className="text-text-muted text-xs w-5 text-right font-mono">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{p.page}</p>
                      <p className="text-text-muted text-xs">{MENU_LABEL[p.menu] ?? p.menu}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-text-primary text-sm font-medium">{p.views.toLocaleString()}</p>
                      <p className="text-text-muted text-xs">{p.uniqueVisitors.toLocaleString()}명 · {formatDuration(p.avgDuration)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* ── 하단: 메뉴별 비율 + 방문자 구성 ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 메뉴별 방문 비율 */}
          <div className="bg-bg-secondary border border-line rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary text-sm font-semibold">메뉴별 방문 비율</h3>
              <span className="text-text-muted text-xs">최근 7일</span>
            </div>
            {d && d.menuBreakdown.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={d.menuBreakdown} dataKey="views" nameKey="menu" cx="50%" cy="50%"
                      innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {d.menuBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                      formatter={(value, name) => [Number(value ?? 0).toLocaleString(), MENU_LABEL[String(name)] ?? name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {d.menuBreakdown.map((m, i) => (
                    <div key={m.menu} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-text-secondary text-xs flex-1">{MENU_LABEL[m.menu] ?? m.menu}</span>
                      <span className="text-text-primary text-xs font-medium">{m.percentage}%</span>
                      <span className="text-text-muted text-xs">({m.views.toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
                데이터가 없습니다
              </div>
            )}
          </div>

          {/* 방문자 구성 */}
          <div className="bg-bg-secondary border border-line rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary text-sm font-semibold">방문자 구성</h3>
              <span className="text-text-muted text-xs">최근 7일</span>
            </div>
            {d ? (() => {
              const total = d.visitorComposition.members + d.visitorComposition.guests
              const memberPct = total > 0 ? Math.round((d.visitorComposition.members / total) * 100) : 0
              const guestPct = 100 - memberPct
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-6 justify-center">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: '회원', value: d.visitorComposition.members },
                            { name: '비회원', value: d.visitorComposition.guests },
                          ]}
                          dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                          <Cell fill="#34d399" />
                          <Cell fill="#f97316" />
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                        <div>
                          <p className="text-text-primary text-sm font-medium">회원 방문</p>
                          <p className="text-text-secondary text-xs">{d.visitorComposition.members.toLocaleString()}회 ({memberPct}%)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-orange-400" />
                        <div>
                          <p className="text-text-primary text-sm font-medium">비회원 방문</p>
                          <p className="text-text-secondary text-xs">{d.visitorComposition.guests.toLocaleString()}회 ({guestPct}%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 오늘 요약 */}
                  {d.today && (
                    <div className="bg-bg-tertiary rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-text-muted text-xs">오늘 로그인</p>
                          <p className="text-text-primary text-lg font-bold">{d.today.activeLogins.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs">오늘 가입</p>
                          <p className="text-text-primary text-lg font-bold">{d.today.newSignups.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* ── 데이터 테이블 ─────────────────────────────────── */}
        {visitorData.length > 0 && (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <h3 className="text-text-primary text-sm font-semibold">상세 데이터</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-text-secondary font-medium px-4 py-3">날짜</th>
                    {LINE_KEYS.map(({ key, label }) => (
                      <th key={key} className="text-right text-text-secondary font-medium px-4 py-3">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visitorData.map((row, i) => (
                    <tr key={i} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="text-text-primary px-4 py-3">{row.date}</td>
                      {LINE_KEYS.map(({ key }) => (
                        <td key={key} className="text-right text-text-secondary px-4 py-3">
                          {(row[key] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
