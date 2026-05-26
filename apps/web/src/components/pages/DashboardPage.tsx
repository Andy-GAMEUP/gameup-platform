'use client'
import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/Card'
import Badge from '@/components/Badge'
import Link from 'next/link'
import {
  DollarSign, Users, UserPlus, CreditCard, BarChart3, RefreshCw, Plus, Download, ChevronDown, ArrowUp, ArrowDown, Minus,
} from 'lucide-react'
import { analyticsService, OverviewSummary, OverviewGameRow, DailyOverviewPoint } from '@/services/analyticsService'
import DashboardTrendChart from '@/components/analytics/DashboardTrendChart'
import GamePieChart from '@/components/analytics/GamePieChart'


type Period = '1d' | '7d' | '30d' | '6m' | '1y' | 'custom' | 'lifetime'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1d',       label: '어제' },
  { value: '7d',       label: '1주일' },
  { value: '30d',      label: '한 달' },
  { value: '6m',       label: '반년' },
  { value: '1y',       label: '1년' },
  { value: 'custom',   label: '지정 날짜' },
  { value: 'lifetime', label: '누적' },
]

const toYMD = (d: Date) => d.toISOString().split('T')[0]

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [period, setPeriod] = useState<Period>('30d')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownView, setDropdownView] = useState<'list' | 'custom'>('list')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [customFrom, setCustomFrom] = useState(() => toYMD(new Date(Date.now() - 29 * 86400000)))
  const [customTo,   setCustomTo]   = useState(() => toYMD(new Date()))
  const [summary,    setSummary]    = useState<OverviewSummary | null>(null)
  const [games,      setGames]      = useState<OverviewGameRow[]>([])
  const [daily,      setDaily]      = useState<DailyOverviewPoint[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [exporting, setExporting] = useState(false)

  const buildParams = (p: Period) => {
    const now = new Date()
    if (p === 'lifetime') return { mode: 'lifetime' as const }
    const fromDate =
      p === '1d'  ? new Date(now.getTime() - 1   * 86400000) :
      p === '7d'  ? new Date(now.getTime() - 6   * 86400000) :
      p === '30d' ? new Date(now.getTime() - 29  * 86400000) :
      p === '6m'  ? new Date(now.getTime() - 181 * 86400000) :
      p === '1y'  ? new Date(now.getTime() - 364 * 86400000) :
      new Date(customFrom)
    const toDate = p === 'custom' ? new Date(customTo) : now
    return { from: toYMD(fromDate), to: toYMD(toDate), mode: 'range' as const }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = buildParams(period)
      const blob = await analyticsService.exportDeveloperDashboard(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fromStr = 'from' in params ? params.from : 'all'
      const toStr = 'to' in params ? params.to : toYMD(new Date())
      a.download = `dashboard_${fromStr}_${toStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silent fail — user can retry
    } finally {
      setExporting(false)
    }
  }

  const load = async (p = period) => {
    setLoading(true)
    setError('')
    try {
      const params = buildParams(p)
      const [overviewData, dailyData] = await Promise.all([
        analyticsService.getDeveloperOverview(params),
        analyticsService.getDeveloperDaily(params),
      ])
      setSummary(overviewData.summary)
      setGames(overviewData.games)
      setDaily(dailyData.daily)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '대시보드 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (period !== 'custom') load(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setDropdownView('list')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const periodRangeLabel = (() => {
    if (period === 'lifetime') return null
    const params = buildParams(period)
    if (!('from' in params)) return null
    const fmt = (s: string) => s.replace(/-/g, '.')
    return { label: PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '', from: fmt(params.from ?? ''), to: fmt(params.to ?? '') }
  })()

  const filteredGames = activeTab === 'all'
    ? games
    : games.filter(g => {
        if (activeTab === 'beta') return g.serviceType === 'beta' || g.status === 'beta'
        if (activeTab === 'live') return g.serviceType === 'live' || g.status === 'published'
        return true
      })

  const isApproved = (g: OverviewGameRow) => {
    if (g.approvalStatus && g.approvalStatus !== 'approved') return false
    return g.status === 'published' || g.status === 'beta' ||
      g.serviceType === 'live' || g.serviceType === 'beta' ||
      g.approvalStatus === 'approved'
  }

  const sortedGames = [...filteredGames].sort((a, b) => {
    const aOk = isApproved(a) ? 1 : 0
    const bOk = isApproved(b) ? 1 : 0
    if (aOk !== bOk) return bOk - aOk
    return b.revenue - a.revenue
  })

  const monetizationLabel = (m?: string) =>
    ({ free: '무료', ad: '광고', paid: '유료', freemium: '프리미엄' }[m || 'free'] || '무료')

  const TrendBadge = ({ v }: { v: number }) => {
    if (v === 0) return (
      <div className="flex items-center gap-0.5 text-xs font-semibold text-text-secondary">
        <Minus className="w-3.5 h-3.5" /> 0%
      </div>
    )
    const up = v > 0
    return (
      <div className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-blue-400' : 'text-red-400'}`}>
        {up ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        {Math.abs(v)}%
      </div>
    )
  }

  const stats = [
    { label: '활성 유저',    value: (summary?.totalActiveUsers  ?? 0).toLocaleString(),            change: summary?.activeChange     ?? 0, icon: <Users      className="w-5 h-5" />, color: 'text-purple-400' },
    { label: '신규 유저',    value: (summary?.totalNewMembers   ?? 0).toLocaleString(),            change: summary?.newMembersChange ?? 0, icon: <UserPlus   className="w-5 h-5" />, color: 'text-blue-400'   },
    { label: '총 매출',      value: `₩${(summary?.totalRevenue  ?? 0).toLocaleString()}`,          change: summary?.revenueChange    ?? 0, icon: <DollarSign className="w-5 h-5" />, color: 'text-accent'     },
    { label: '평균 결제율',  value: `${(summary?.avgPUR         ?? 0).toLocaleString()}%`,         change: summary?.purChange        ?? 0, icon: <CreditCard className="w-5 h-5" />, color: 'text-yellow-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">대시보드</h1>
          <p className="text-text-secondary">내 모든 게임의 성과를 확인하세요</p>
        </div>

        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          {/* Period selector + 새로고침 + 엑셀 */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-xs bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors min-w-[90px] justify-between"
              >
                <span>{PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '기간'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 overflow-hidden">
                  {dropdownView === 'list' ? (
                    <div className="min-w-[110px]">
                      {PERIOD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (opt.value === 'custom') {
                              setDropdownView('custom')
                            } else {
                              setPeriod(opt.value)
                              setDropdownOpen(false)
                              setDropdownView('list')
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            period === opt.value
                              ? 'bg-accent text-text-primary font-semibold'
                              : 'text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 w-64 space-y-3">
                      <button
                        onClick={() => setDropdownView('list')}
                        className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                      >
                        ← 돌아가기
                      </button>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">시작일</label>
                          <input
                            type="date"
                            value={customFrom}
                            max={customTo}
                            onChange={e => setCustomFrom(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">종료일</label>
                          <input
                            type="date"
                            value={customTo}
                            min={customFrom}
                            max={toYMD(new Date())}
                            onChange={e => setCustomTo(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => { setPeriod('custom'); load('custom'); setDropdownOpen(false); setDropdownView('list') }}
                        className="w-full px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-text-primary rounded-md font-medium transition-colors"
                      >
                        조회
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => load()}
              className="flex items-center gap-1.5 px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative group">
              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 transition-colors"
              >
                <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-bg-primary border border-line rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                엑셀로 내보내세요
              </div>
            </div>
          </div>
          {periodRangeLabel && (
            <div className="flex items-center gap-2 self-start">
              <span className="text-xs font-medium text-accent">{periodRangeLabel.label}</span>
              <span className="text-xs text-text-muted">|</span>
              <span className="text-xs text-text-secondary">{periodRangeLabel.from}</span>
              <span className="text-xs text-text-muted">~</span>
              <span className="text-xs text-text-secondary">{periodRangeLabel.to}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => load()} className="text-xs underline">다시 시도</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-bg-secondary border border-line">
            <div className="p-5 flex flex-col justify-between h-[110px]">
              <div className="flex items-center justify-between">
                <div className={stat.color}>{stat.icon}</div>
                {stat.change !== null && period !== 'lifetime'
                  ? <TrendBadge v={stat.change} />
                  : <div />
                }
              </div>
              <div>
                <div className="text-xl font-bold truncate">{stat.value}</div>
                <div className="text-xs text-text-secondary mt-0.5">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 일별 차트 + 게임별 원형 그래프 */}
      {loading ? (
        <div className="bg-bg-secondary border border-line rounded-lg flex items-center justify-center h-48 text-text-secondary">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-5 items-stretch">
          <div className="col-span-3">
            <DashboardTrendChart data={daily} />
          </div>
          <div className="col-span-1">
            <GamePieChart games={filteredGames} />
          </div>
        </div>
      )}

      {/* 게임별 성과 */}
      <Card className="bg-bg-secondary border border-line">
        <div className="p-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">게임별 성과</h2>
              <p className="text-xs text-text-secondary mt-1">게임 카드를 클릭하면 분석 페이지로 이동합니다</p>
            </div>
            <div className="flex border border-line rounded-md overflow-hidden">
              {[
                { value: 'all',  label: `전체 게임 (${games.length})` },
                { value: 'beta', label: `베타 (${games.filter(g => g.serviceType === 'beta' || g.status === 'beta').length})` },
                { value: 'live', label: `라이브 (${games.filter(g => g.serviceType === 'live' || g.status === 'published').length})` },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-3 py-2 text-xs transition-colors whitespace-nowrap ${
                    activeTab === tab.value
                      ? 'bg-accent text-text-primary'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-text-secondary">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-16 text-text-secondary">
                <p className="mb-4">표시할 게임이 없습니다.</p>
                <Link href="/upload">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> 첫 게임 등록하기
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sortedGames.map((game) => {
                  const active = isApproved(game)
                  const isLive = game.serviceType === 'live' || game.status === 'published'
                  const approvalStatusLabel: Record<string, string> = {
                    not_submitted: '미제출',
                    pending: '심사 대기',
                    review: '심사 중',
                    rejected: '심사 반려',
                  }

                  const statusColor  = active ? (isLive ? 'text-emerald-400' : 'text-blue-400') : 'text-gray-500'
                  const statusBg     = active ? (isLive ? 'bg-emerald-400' : 'bg-blue-400')     : 'bg-gray-500'
                  const statusLabel  = active ? (isLive ? 'LIVE' : 'BETA') : (approvalStatusLabel[game.approvalStatus ?? ''] ?? '미심사').toUpperCase()

                  const hasRealMetrics = game.avgDau > 0 || game.revenue > 0 || game.cumulativeMembers > 0
                  const d = hasRealMetrics ? null : dummyMetrics(game.id)

                  const metrics = [
                    { label: 'DAU',      value: (d ? d.dau.toLocaleString()              : game.avgDau.toLocaleString()),           color: 'text-blue-400',     bg: 'bg-blue-500/10'   },
                    { label: '누적 회원', value: (d ? fmtCompact(d.cumMembers)            : fmtCompact(game.cumulativeMembers)),     color: 'text-text-primary', bg: 'bg-white/5'       },
                    { label: '매출',      value: (d ? `₩${fmtCompact(d.revenue)}`        : `₩${fmtCompact(game.revenue)}`),        color: 'text-accent',       bg: 'bg-accent/10'     },
                    { label: 'ARPU',     value: (d ? `₩${fmtCompact(d.arpu)}`           : `₩${fmtCompact(game.arpu ?? 0)}`),      color: 'text-orange-400',   bg: 'bg-orange-500/10' },
                    { label: 'ARPPU',    value: (d ? `₩${fmtCompact(d.arppu)}`          : `₩${fmtCompact(game.arppu)}`),          color: 'text-yellow-400',   bg: 'bg-yellow-500/10' },
                    { label: 'PUR',      value: (d ? `${d.pur}%`                         : `${game.pur}%`),                        color: 'text-purple-400',   bg: 'bg-purple-500/10' },
                    { label: '세션',      value: (d ? fmtSession(d.session)              : fmtSession(game.avgSession ?? 0)),       color: 'text-text-primary', bg: 'bg-white/5'       },
                  ]

                  const cardInner = (
                    <div className="p-5 h-full flex flex-col gap-4">
                      {/* 상단: 게임 정보 */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-end gap-2 flex-wrap">
                            <h3 className="text-xl font-bold leading-tight">{game.title}</h3>
                            {/* 상태 */}
                            <span className="relative flex items-center gap-1.5 mb-0.5">
                              <span className={`relative flex h-1.5 w-1.5`}>
                                {active && isLive && (
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusBg}`} />
                                )}
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusBg}`} />
                              </span>
                              <span className={`text-[11px] font-bold tracking-widest uppercase ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </span>
                            {/* 평점 */}
                            <span className="flex items-center gap-0.5 text-[11px] font-medium text-yellow-400 mb-0.5">
                              <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              {game.rating?.toFixed?.(1) ?? '0.0'}
                            </span>
                          </div>
                        </div>

                        {/* 게임 썸네일 */}
                        <GameThumb thumbnail={game.thumbnail} title={game.title} />
                      </div>

                      {/* 하단: 지표 7개 */}
                      <div className="grid grid-cols-7 gap-1.5 mt-auto">
                        {metrics.map((m, i) => (
                          <div key={i} className={`${m.bg} rounded-lg px-2 py-2.5 text-center border border-line/40`}>
                            <div className={`text-xs font-bold tabular-nums leading-none ${m.color}`}>{m.value}</div>
                            <div className="text-[10px] text-text-secondary mt-1.5 leading-none">{m.label}</div>
                          </div>
                        ))}
                      </div>

                      {active && (
                        <div className="flex items-center justify-end gap-1.5 text-[11px] text-text-secondary group-hover:text-accent transition-colors -mt-1">
                          <BarChart3 className="w-3 h-3" />
                          세부 분석 보기
                        </div>
                      )}
                    </div>
                  )

                  if (!active) {
                    return (
                      <div
                        key={game.id}
                        className="rounded-2xl border border-line/30 bg-bg-secondary/40 opacity-40 cursor-not-allowed select-none"
                      >
                        {cardInner}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={game.id}
                      href={`/analytics?gameId=${game.id}`}
                      className="group block rounded-2xl border border-line/60 bg-bg-secondary hover:border-accent/40 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {cardInner}
                    </Link>
                  )
                })}
              </div>
            )}
        </div>
      </Card>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2 bg-bg-tertiary/50 rounded">
      <p className="text-text-secondary text-xs mb-1">{label}</p>
      <p className={`font-semibold ${accent || ''}`}>{value}</p>
    </div>
  )
}

function dummyMetrics(id: string) {
  const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const r = (base: number, range: number) => base + (seed % range)
  return {
    dau:        r(1_200,  3_800),
    cumMembers: r(28_000, 72_000),
    revenue:    r(3_400_000, 12_600_000),
    arpu:       r(820,    1_680),
    arppu:      r(4_200,  10_800),
    pur:        parseFloat((2.1 + (seed % 58) / 10).toFixed(1)),
    session:    r(142,    318),
  }
}

function fmtSession(sec: number): string {
  if (!sec) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

function GameThumb({ thumbnail, title }: { thumbnail?: string | null; title: string }) {
  const src = thumbnail
    ? thumbnail.startsWith('http') || thumbnail.startsWith('/uploads/')
      ? thumbnail
      : `/uploads/thumbnails/${thumbnail.split('/').pop()}`
    : null

  if (src) {
    return (
      <div className="flex-shrink-0 w-[67px] h-[67px] rounded-xl overflow-hidden border border-line/40 bg-bg-tertiary">
        <img
          src={src}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.currentTarget.parentElement!
            e.currentTarget.remove()
            el.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl select-none">🎮</div>'
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 w-[67px] h-[67px] rounded-xl overflow-hidden border border-line/40 bg-bg-tertiary flex items-center justify-center text-2xl select-none">
      🎮
    </div>
  )
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

