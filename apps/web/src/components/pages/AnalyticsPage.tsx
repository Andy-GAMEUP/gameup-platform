'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  RefreshCw, Download, Users, UserPlus, Activity, Calendar as CalendarIcon,
  CreditCard, DollarSign, TrendingUp, AlertCircle, BarChart2, ArrowRight, ChevronDown,
} from 'lucide-react'
import { gameService } from '@/services/gameService'
import { analyticsService, GameAnalyticsResponse } from '@/services/analyticsService'
import MetricCard from '@/components/analytics/MetricCard'
import RetentionChart from '@/components/analytics/RetentionChart'
import DailyTrendChart from '@/components/analytics/DailyTrendChart'
import SessionTimeChart from '@/components/analytics/SessionTimeChart'
import RevenueTrendChart from '@/components/analytics/RevenueTrendChart'

interface GameOption { _id: string; title: string }

type Period = '1d' | '7d' | '30d' | '6m' | '1y' | 'custom'
type Tab    = 'analysis' | 'retention' | 'revenue' | 'newusers'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1d',     label: '어제'    },
  { value: '7d',     label: '1주일'   },
  { value: '30d',    label: '한 달'   },
  { value: '6m',     label: '반년'    },
  { value: '1y',     label: '1년'     },
  { value: 'custom', label: '지정 날짜' },
]

const toYMD = (d: Date) => d.toISOString().split('T')[0]

const TAB_META: Record<Tab, { title: string; desc: string }> = {
  analysis:  { title: '개요',     desc: '게임의 핵심 지표와 일별 활동 현황을 한눈에 확인하세요.' },
  retention: { title: '리텐션',   desc: '유저 재방문율과 코호트별 잔존율을 분석하세요.'          },
  revenue:   { title: '수익',     desc: '매출 · ARPPU · PUR · 결제 추이'                        },
  newusers:  { title: '신규 유저', desc: '가입 · DAU · MAU · 신규 추이'                          },
}

export default function AnalyticsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const activeTab = (searchParams.get('tab') || 'analysis') as Tab

  const [games,        setGames]        = useState<GameOption[]>([])
  const [gameId,       setGameId]       = useState<string>(searchParams.get('gameId') || '')
  const [period,       setPeriod]       = useState<Period>('30d')
  const [customFrom,   setCustomFrom]   = useState(() => toYMD(new Date(Date.now() - 29 * 86400000)))
  const [customTo,     setCustomTo]     = useState(() => toYMD(new Date()))
  const [data,         setData]         = useState<GameAnalyticsResponse | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [error,        setError]        = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownView, setDropdownView] = useState<'list' | 'custom'>('list')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // gameId → URL sync (tab param은 사이드바가 관리)
  useEffect(() => {
    if (!gameId) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('gameId', gameId)
    router.replace(`/analytics?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // 게임 목록 로드
  useEffect(() => {
    gameService.getMyGames()
      .then((res) => {
        const list = ((res.games || []) as unknown as GameOption[]).map(g => ({ _id: g._id, title: g.title }))
        setGames(list)
        if (!gameId && list.length > 0) setGameId(list[0]._id)
      })
      .catch(() => setError('게임 목록을 불러오지 못했습니다.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildParams = (p: Period) => {
    const now = new Date()
    const fromDate =
      p === '1d'  ? new Date(now.getTime() - 1   * 86400000) :
      p === '7d'  ? new Date(now.getTime() - 6   * 86400000) :
      p === '30d' ? new Date(now.getTime() - 29  * 86400000) :
      p === '6m'  ? new Date(now.getTime() - 181 * 86400000) :
      p === '1y'  ? new Date(now.getTime() - 364 * 86400000) :
      new Date(customFrom)
    const toDate = p === 'custom' ? new Date(customTo) : now
    return { from: toYMD(fromDate), to: toYMD(toDate) }
  }

  const load = useCallback(async (p = period) => {
    if (!gameId) return
    setLoading(true)
    setError('')
    try {
      const result = await analyticsService.getGameAnalytics(gameId, buildParams(p))
      setData(result)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '분석 데이터를 불러오지 못했습니다.')
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, period, customFrom, customTo])

  useEffect(() => {
    if (period !== 'custom') load(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, gameId])

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

  const handleExport = async () => {
    if (!gameId) return
    setExporting(true)
    try {
      const { from, to } = buildParams(period)
      const blob = await analyticsService.exportGameAnalytics(gameId, { from, to })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = (data?.gameTitle || 'game').replace(/[^\w가-힣\-_]/g, '_')
      a.download = `analytics_${safeTitle}_${from.replace(/-/g, '')}_${to.replace(/-/g, '')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '엑셀 다운로드에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  const { title: tabTitle, desc: tabDesc } = TAB_META[activeTab]
  const overview = data?.overview

  const periodRangeLabel = (() => {
    const params = buildParams(period)
    const fmt = (s: string) => s.replace(/-/g, '.')
    return { label: PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '', from: fmt(params.from), to: fmt(params.to) }
  })()

  return (
    <div className="space-y-6">
      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">게임 분석 · {tabTitle}</h1>
          <p className="text-text-secondary">{tabDesc}</p>
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="mt-3 px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary focus:outline-none focus:border-accent min-w-[200px]"
          >
            {games.length === 0 && <option value="">게임 없음</option>}
            {games.map(g => <option key={g._id} value={g._id}>{g.title}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* 기간 드롭다운 */}
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
                            type="date" value={customFrom} max={customTo}
                            onChange={e => setCustomFrom(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">종료일</label>
                          <input
                            type="date" value={customTo} min={customFrom} max={toYMD(new Date())}
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

            {/* 새로고침 */}
            <button
              onClick={() => load()}
              disabled={!gameId || loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* 엑셀 내보내기 아이콘 */}
            <div className="relative group">
              <button
                onClick={handleExport}
                disabled={!gameId || exporting || loading || !data}
                className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 transition-colors"
              >
                <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-bg-primary border border-line rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                엑셀로 내보내세요
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="text-xs font-medium text-accent">{periodRangeLabel.label}</span>
            <span className="text-xs text-text-muted">|</span>
            <span className="text-xs text-text-secondary">{periodRangeLabel.from}</span>
            <span className="text-xs text-text-muted">~</span>
            <span className="text-xs text-text-secondary">{periodRangeLabel.to}</span>
          </div>
        </div>
      </div>

      {/* ── 에러 / 빈 상태 ── */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {!gameId && !loading && (
        <div className="bg-bg-secondary border border-line rounded-lg p-12 text-center text-text-secondary">
          게임을 선택하여 세부 분석을 확인하세요.
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 분석 데이터 로딩 중...
        </div>
      )}

      {/* ── 탭 콘텐츠 ── */}
      {!loading && data && overview && (
        <>

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="누적 회원"        value={overview.cumulativeMembers.toLocaleString()} icon={<Users        className="w-5 h-5" />} color="text-blue-400"   hint="전체 가입자" />
                <MetricCard label="신규 생성 회원"   value={overview.newMembers.toLocaleString()}        icon={<UserPlus     className="w-5 h-5" />} color="text-green-400"  hint="기간 내" />
                <MetricCard label="DAU (평균)"        value={overview.avgDau.toLocaleString()}            icon={<Activity     className="w-5 h-5" />} color="text-purple-400" />
                <MetricCard label="MAU"              value={overview.mau.toLocaleString()}               icon={<CalendarIcon className="w-5 h-5" />} color="text-cyan-400" />
                <MetricCard label="결제 전환율 (PUR)" value={`${overview.pur}%`}                          icon={<CreditCard   className="w-5 h-5" />} color="text-yellow-400" hint="결제유저/DAU" />
                <MetricCard label="ARPPU"            value={`₩${overview.arppu.toLocaleString()}`}      icon={<DollarSign   className="w-5 h-5" />} color="text-accent"     hint="결제유저당 매출" />
                <MetricCard label="ARPU"             value={`₩${overview.arpu.toLocaleString()}`}       icon={<TrendingUp   className="w-5 h-5" />} color="text-orange-400" hint="DAU당 매출" />
                <MetricCard label="총 매출"           value={`₩${overview.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="text-accent"   hint={`결제 ${overview.payingUsers}명`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DailyTrendChart data={data.daily} defaultActive={['dau', 'newMembers', 'payingUsers']} />
                <RevenueTrendChart data={data.daily} defaultActive={['revenue', 'arpu', 'arppu']} gameId={gameId} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <RetentionChart data={data.retention} cohortTable={data.cohortTable} chartOnly />
                <SessionTimeChart data={data.daily} />
                <div className="bg-bg-secondary border border-line rounded-lg p-5 flex flex-col">
                  <h3 className="text-base font-bold mb-4">수익 현황 (더미)</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                    {(data.topItems ?? []).length === 0 ? (
                      <p className="text-sm text-text-secondary text-center py-8">판매 데이터가 없습니다</p>
                    ) : (
                      (data.topItems ?? []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-bg-tertiary rounded-lg">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-text-secondary w-5 flex-shrink-0">{idx + 1}</span>
                            <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                            <span className="text-xs text-text-secondary">
                              {item.currency === 'KRW' ? `₩${item.price.toLocaleString()}` : `${item.price} ${item.currency}`}
                            </span>
                            <span className="text-sm font-bold text-accent">{item.sales.toLocaleString()}판</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-6">
              <RetentionChart data={data.retention} cohortTable={data.cohortTable} />
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <RevenueTrendChart data={data.daily} />
            </div>
          )}

          {activeTab === 'newusers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="누적 회원"  value={overview.cumulativeMembers.toLocaleString()} icon={<Users        className="w-5 h-5" />} color="text-blue-400"   hint="전체 가입자" />
                <MetricCard label="신규 가입"  value={overview.newMembers.toLocaleString()}        icon={<UserPlus     className="w-5 h-5" />} color="text-green-400"  hint="기간 내" />
                <MetricCard label="DAU (평균)" value={overview.avgDau.toLocaleString()}            icon={<Activity     className="w-5 h-5" />} color="text-purple-400" />
                <MetricCard label="MAU"       value={overview.mau.toLocaleString()}               icon={<CalendarIcon className="w-5 h-5" />} color="text-cyan-400" />
              </div>
              <DailyTrendChart data={data.daily} defaultActive={['newMembers', 'dau']} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
