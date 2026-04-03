'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Loader2, PieChart as PieChartIcon } from 'lucide-react'

/* ── 타입 ───────────────────────────────────────────────────── */
interface MenuOverview {
  menu: string; label: string; views: number
  uniqueVisitors: number; avgDuration: number; contentChanges: number
}

interface DailyRow {
  date: string; views: number; uniqueVisitors: number
  avgDuration: number; contentChanges: number
}

interface SubPage {
  page: string; views: number; uniqueVisitors: number
}

interface MenuDetailResponse {
  menu: string; label: string
  daily: DailyRow[]; topSubPages: SubPage[]
}

/* ── 상수 ───────────────────────────────────────────────────── */
const MENU_TABS: { label: string; key: string }[] = [
  { label: '커뮤니티', key: 'community' },
  { label: '파트너 채널', key: 'partner' },
  { label: '퍼블리싱', key: 'publishing' },
  { label: '미니홈', key: 'minihome' },
  { label: '지원 프로그램', key: 'support' },
  { label: '솔루션', key: 'solution' },
]

const PLATFORMS = ['전체', 'PC', 'Mobile']
const PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: '일별', value: 'day' },
  { label: '월별', value: 'month' },
  { label: '연도별', value: 'year' },
]
const PERIOD_BUTTONS = ['1주', '1달', '3개월', '6개월']
const BAR_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f97316', '#f43f5e', '#facc15']

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}초`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */
export default function AdminMenuStatsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [activeTab, setActiveTab] = useState(MENU_TABS[0])
  const [startDate, setStartDate] = useState(weekAgo)
  const [endDate, setEndDate] = useState(today)
  const [platform, setPlatform] = useState('전체')
  const [period, setPeriod] = useState('day')
  const [loading, setLoading] = useState(false)

  // 탭별 상세 데이터
  const [detail, setDetail] = useState<MenuDetailResponse | null>(null)
  // 개요 데이터 (전체 메뉴)
  const [overview, setOverview] = useState<MenuOverview[]>([])

  // 개요 로드
  useEffect(() => {
    adminService.getMenuStats({ startDate, endDate, platform: platform === '전체' ? undefined : platform })
      .then((res) => {
        const raw = res as { stats?: MenuOverview[] }
        setOverview(raw?.stats ?? [])
      })
      .catch(() => setOverview([]))
  }, [startDate, endDate, platform])

  // 탭별 상세 로드
  const fetchDetail = useCallback(() => {
    setLoading(true)
    adminService.getMenuStats({
      menu: activeTab.key,
      startDate, endDate, period,
      platform: platform === '전체' ? undefined : platform,
    })
      .then((res) => setDetail(res as MenuDetailResponse))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [activeTab.key, startDate, endDate, period, platform])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const applyPeriod = (p: string) => {
    const end = new Date()
    const start = new Date()
    if (p === '1주') start.setDate(start.getDate() - 7)
    else if (p === '1달') start.setMonth(start.getMonth() - 1)
    else if (p === '3개월') start.setMonth(start.getMonth() - 3)
    else if (p === '6개월') start.setMonth(start.getMonth() - 6)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(end.toISOString().slice(0, 10))
  }

  // 현재 탭의 개요 데이터
  const currentOverview = overview.find(o => o.menu === activeTab.key)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">메뉴별 통계</h2>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-line overflow-x-auto">
          {MENU_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab.key === tab.key
                  ? 'text-accent-text border-red-500'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 선택된 메뉴 요약 카드 */}
        {currentOverview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <p className="text-text-secondary text-xs">조회수</p>
              <p className="text-text-primary text-xl font-bold">{currentOverview.views.toLocaleString()}</p>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <p className="text-text-secondary text-xs">순 방문자</p>
              <p className="text-text-primary text-xl font-bold">{currentOverview.uniqueVisitors.toLocaleString()}</p>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <p className="text-text-secondary text-xs">평균 체류시간</p>
              <p className="text-text-primary text-xl font-bold">{formatDuration(currentOverview.avgDuration)}</p>
            </div>
            <div className="bg-bg-secondary border border-line rounded-xl p-4">
              <p className="text-text-secondary text-xs">콘텐츠 변동</p>
              <p className="text-text-primary text-xl font-bold">{currentOverview.contentChanges.toLocaleString()}건</p>
            </div>
          </div>
        )}

        {/* 필터 영역 */}
        <div className="bg-bg-secondary border border-line rounded-xl p-5 space-y-4">
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
              {PERIOD_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    period === opt.value
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                      : 'bg-bg-tertiary text-text-secondary border-line hover:bg-line-light'
                  }`}>
                  {opt.label}
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
            <button onClick={fetchDetail}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
              조회
            </button>
          </div>

          {/* 복합 차트: 방문자 (Bar) + 콘텐츠 변동 (Line) */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
            </div>
          ) : !detail || detail.daily.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
              데이터가 없습니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={detail.daily} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f43f5e', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value, name) => {
                    const v = Number(value ?? 0)
                    if (name === '평균 체류시간') return [formatDuration(v), name]
                    return [v.toLocaleString(), name]
                  }} />
                <Legend />
                <Bar yAxisId="left" dataKey="views" name="조회수" fill="#22d3ee" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar yAxisId="left" dataKey="uniqueVisitors" name="순 방문자" fill="#a78bfa" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line yAxisId="right" type="monotone" dataKey="contentChanges" name="콘텐츠 변동"
                  stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 날짜별 데이터 테이블 */}
        {detail && detail.daily.length > 0 && (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <h3 className="text-text-primary text-sm font-semibold">{detail.label ?? activeTab.label} 상세 데이터</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-text-secondary font-medium px-4 py-3">날짜</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">조회수</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">순 방문자</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">평균 체류시간</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">콘텐츠 변동</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.daily.map((row, i) => (
                    <tr key={i} className={`hover:bg-bg-tertiary/50 transition-colors ${
                      row.contentChanges > 0 ? 'bg-pink-500/5' : ''
                    }`}>
                      <td className="text-text-primary px-4 py-3">{row.date}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{row.views.toLocaleString()}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{row.uniqueVisitors.toLocaleString()}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{formatDuration(row.avgDuration)}</td>
                      <td className={`text-right px-4 py-3 font-medium ${
                        row.contentChanges > 0 ? 'text-pink-400' : 'text-text-muted'
                      }`}>
                        {row.contentChanges > 0 ? `+${row.contentChanges}` : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 인기 하위 페이지 Top 5 */}
        {detail && detail.topSubPages && detail.topSubPages.length > 0 && (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-line">
              <h3 className="text-text-primary text-sm font-semibold">{activeTab.label} 인기 페이지 Top 5</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left text-text-secondary font-medium px-4 py-3">순위</th>
                    <th className="text-left text-text-secondary font-medium px-4 py-3">페이지</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">조회수</th>
                    <th className="text-right text-text-secondary font-medium px-4 py-3">순 방문자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detail.topSubPages.map((p, i) => (
                    <tr key={i} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="text-text-muted px-4 py-3 font-mono">{i + 1}</td>
                      <td className="text-text-primary px-4 py-3">{p.page}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{p.views.toLocaleString()}</td>
                      <td className="text-right text-text-secondary px-4 py-3">{p.uniqueVisitors.toLocaleString()}</td>
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
