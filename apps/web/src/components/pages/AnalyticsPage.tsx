'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
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
import RevenueDetailChart from '@/components/analytics/RevenueDetailChart'
import SalesProductChart from '@/components/analytics/SalesProductChart'
import PaymentConversionChart from '@/components/analytics/PaymentConversionChart'
import VipUsersChart, { DUMMY_PAYERS } from '@/components/analytics/VipUsersChart'
import NewUsersChart from '@/components/analytics/NewUsersChart'
import NewUsersTrendChart from '@/components/analytics/NewUsersTrendChart'
import NewUsersRatioChart from '@/components/analytics/NewUsersRatioChart'
import AllUsersChart from '@/components/analytics/AllUsersChart'
import AllUsersTrendChart from '@/components/analytics/AllUsersTrendChart'
import AllUsersRatioChart from '@/components/analytics/AllUsersRatioChart'
import AllUsersFunnelChart from '@/components/analytics/AllUsersFunnelChart'
import LtvCalculatorChart from '@/components/analytics/LtvCalculatorChart'
import TutorialCohortChart from '@/components/analytics/TutorialCohortChart'

interface GameOption { _id: string; title: string; thumbnail?: string; status?: string; approvalStatus?: string }

type Period = '1d' | '7d' | '30d' | '6m' | '1y' | 'custom'
type Tab    = 'analysis' | 'retention' | 'revenue' | 'allusers' | 'newusers' | 'vip' | 'ltvcalc'

const ANALYTICS_TABS: { tab: Tab; label: string }[] = [
  { tab: 'analysis',  label: '개요' },
  { tab: 'retention', label: '리텐션' },
  { tab: 'revenue',   label: '수익' },
  { tab: 'allusers',  label: '전체 유저' },
  { tab: 'newusers',  label: '신규 유저' },
  { tab: 'vip',       label: 'VIP 유저' },
  { tab: 'ltvcalc',   label: 'LTV 계산' },
]

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
  analysis:  { title: '개요',       desc: '게임의 핵심 지표와 일별 활동 현황을 한눈에 확인하세요.' },
  retention: { title: '리텐션',     desc: '유저 재방문율과 코호트별 잔존율을 분석하세요.'          },
  revenue:   { title: '수익 (더미)', desc: '매출 · ARPPU · PUR · 결제 추이'                       },
  allusers:  { title: '전체 유저',  desc: '전체 유저 기반 일별 현황 및 지표'                       },
  newusers:  { title: '신규 유저',  desc: '가입 · DAU · MAU · 신규 추이'                           },
  vip:       { title: 'VIP 유저 (더미)', desc: '고액 결제 유저의 등급별 분포와 결제 현황을 분석하세요.' },
  ltvcalc:   { title: 'LTV 현황',        desc: '실제 매출 데이터 기반으로 유저 생애 가치(LTV) 획득 현황을 확인하세요.' },
}

export default function AnalyticsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const rawTab = searchParams.get('tab') || 'analysis'
  const activeTab = (rawTab in TAB_META ? rawTab : 'analysis') as Tab
  const adminView = searchParams.get('adminView') === '1'

  useEffect(() => {
    if (rawTab === 'payments') router.replace('/payments')
  }, [rawTab, router])

  const [games,        setGames]        = useState<GameOption[]>([])
  const [gameId,       setGameId]       = useState<string>(
    searchParams.get('gameId') || (typeof window !== 'undefined' ? localStorage.getItem('analytics_gameId') || '' : '')
  )
  const [period,       setPeriod]       = useState<Period>('30d')
  const [customFrom,   setCustomFrom]   = useState(() => toYMD(new Date(Date.now() - 29 * 86400000)))
  const [customTo,     setCustomTo]     = useState(() => toYMD(new Date()))
  const [data,         setData]         = useState<GameAnalyticsResponse | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [error,        setError]        = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownView, setDropdownView] = useState<'list' | 'custom'>('list')
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false)
  const [vipHeaderDropdownOpen, setVipHeaderDropdownOpen] = useState(false)
  const [cac,                setCac]                = useState<number | ''>('')
  const [targetDays,         setTargetDays]         = useState<number | ''>('')
  const [submittedCac,       setSubmittedCac]       = useState<number | ''>('')
  const [submittedTargetDays, setSubmittedTargetDays] = useState<number | ''>('')
  const [paybackResult, setPaybackResult] = useState<number | null | undefined>(undefined)
  const [ltvStats, setLtvStats] = useState<{ retainedAtTarget: number; avgPct: number; newMembers: number } | null>(null)

  const vipSelectedRank = Number(searchParams.get('vipRank')) || 1
  const dropdownRef = useRef<HTMLDivElement>(null)
  const gameDropdownRef = useRef<HTMLDivElement>(null)
  const vipHeaderDropdownRef = useRef<HTMLDivElement>(null)

  // gameId → URL sync + localStorage 저장
  useEffect(() => {
    if (!gameId) return
    localStorage.setItem('analytics_gameId', gameId)
    const params = new URLSearchParams(searchParams.toString())
    params.set('gameId', gameId)
    router.replace(`/analytics?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])


  // 게임 목록 로드
  useEffect(() => {
    const urlGameId = searchParams.get('gameId')

    const fetchSingleGame = () => {
      if (!urlGameId) { setError('게임 목록을 불러오지 못했습니다.'); return }
      gameService.getGameById(urlGameId)
        .then((res) => {
          const g = res.game as unknown as GameOption
          setGames([{ _id: g._id, title: g.title, thumbnail: g.thumbnail }])
        })
        .catch(() => setError('게임 목록을 불러오지 못했습니다.'))
    }

    gameService.getMyGames()
      .then((res) => {
        const list = ((res.games || []) as unknown as GameOption[])
          .filter(g => g.status !== 'archived')
          .map(g => ({ _id: g._id, title: g.title, thumbnail: g.thumbnail }))
        if (list.length === 0) { fetchSingleGame(); return }
        setGames(list)
        const ids = list.map(g => g._id)
        if (gameId && ids.includes(gameId)) return   // 현재 선택이 유효하면 유지
        const saved = localStorage.getItem('analytics_gameId')
        setGameId(saved && ids.includes(saved) ? saved : list[0]._id)
      })
      .catch(fetchSingleGame)
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
      if (gameDropdownRef.current && !gameDropdownRef.current.contains(e.target as Node)) {
        setGameDropdownOpen(false)
      }
      if (vipHeaderDropdownRef.current && !vipHeaderDropdownRef.current.contains(e.target as Node)) {
        setVipHeaderDropdownOpen(false)
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

  const { title: tabTitle, desc: tabDesc } = TAB_META[activeTab] ?? TAB_META['analysis']
  const overview = data?.overview

  const periodRangeLabel = (() => {
    const params = buildParams(period)
    const fmt = (s: string) => s.replace(/-/g, '.')
    return { label: PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '', from: fmt(params.from), to: fmt(params.to) }
  })()

  return (
    <div className="space-y-6">
      {/* ── adminView 탭 네비게이션 ── */}
      {adminView && (
        <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 flex-wrap">
          {ANALYTICS_TABS.map(({ tab, label }) => (
            <Link
              key={tab}
              href={`/analytics?tab=${tab}&gameId=${gameId}&adminView=1`}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === tab ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">게임 분석 · {tabTitle}</h1>
          <p className="text-text-secondary">{tabDesc}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* 게임 드롭다운 */}
            <div className="relative" ref={gameDropdownRef}>
              <button
                onClick={() => setGameDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary hover:bg-bg-secondary transition-colors min-w-[200px] justify-between"
              >
                {games.length === 0 ? (
                  <span className="text-text-secondary">게임 없음</span>
                ) : (() => {
                  const selected = games.find(g => g._id === gameId)
                  return selected ? (
                    <span className="flex items-center gap-2 min-w-0">
                      {selected.thumbnail ? (
                        <Image src={selected.thumbnail} alt={selected.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                      ) : (
                        <span className="w-5 h-5 rounded bg-bg-secondary flex-shrink-0" />
                      )}
                      <span className="truncate">{selected.title}</span>
                    </span>
                  ) : <span className="text-text-secondary">게임 선택</span>
                })()}
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${gameDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {gameDropdownOpen && games.length > 0 && (
                <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                  {games.map(g => (
                    <button
                      key={g._id}
                      onClick={() => { setGameId(g._id); setGameDropdownOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        g._id === gameId
                          ? 'bg-accent text-text-primary font-semibold'
                          : 'text-text-secondary hover:bg-bg-tertiary'
                      }`}
                    >
                      {g.thumbnail ? (
                        <Image src={g.thumbnail} alt={g.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                      ) : (
                        <span className="w-5 h-5 rounded bg-bg-secondary flex-shrink-0" />
                      )}
                      <span className="truncate">{g.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIP 유저 드롭다운 (VIP 탭일 때만) */}
            {activeTab === 'vip' && (
              <div className="relative" ref={vipHeaderDropdownRef}>
                <button
                  onClick={() => setVipHeaderDropdownOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary hover:bg-bg-secondary transition-colors min-w-[200px] justify-between"
                >
                  {(() => {
                    const u = DUMMY_PAYERS.find(p => p.rank === vipSelectedRank)!
                    return (
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold flex-shrink-0">{u.rank}</span>
                        <span className="truncate">{u.nickname}</span>
                      </span>
                    )
                  })()}
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${vipHeaderDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {vipHeaderDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                    {DUMMY_PAYERS.map(p => (
                      <button
                        key={p.rank}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('vipRank', String(p.rank))
                          router.replace(`/analytics?${params.toString()}`, { scroll: false })
                          setVipHeaderDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          p.rank === vipSelectedRank
                            ? 'bg-accent text-text-primary font-semibold'
                            : 'text-text-secondary hover:bg-bg-tertiary'
                        }`}
                      >
                        <span className="text-xs font-bold flex-shrink-0">{p.rank}</span>
                        <span className="truncate flex-1">{p.nickname}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* LTV 설정 박스 (LTV 탭일 때만) */}
          {activeTab === 'ltvcalc' && (
            <div className="mt-3 flex flex-col gap-2 w-fit">
              <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden w-fit">
                <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                  <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">LTV 계산 기준</span>
                </div>
                <div className="px-4 py-3 flex items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-medium">유저 1인당 목표 금액</label>
                    <div className="relative flex items-center bg-bg-primary border border-line rounded-lg focus-within:border-accent transition-colors">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cac === '' ? '' : Number(cac).toLocaleString()}
                        onChange={e => {
                          const raw = e.target.value.replace(/,/g, '')
                          if (raw === '' || raw === '-') { setCac(''); return }
                          const n = Number(raw)
                          if (!isNaN(n) && n >= 0) setCac(n)
                        }}
                        placeholder="0"
                        className="w-36 pl-3 pr-8 py-2 text-sm bg-transparent text-text-primary focus:outline-none placeholder:text-text-muted"
                      />
                      <span className="absolute right-3 text-xs text-text-muted pointer-events-none select-none">원</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-muted font-medium">목표 기간</label>
                    <div className="relative flex items-center bg-bg-primary border border-line rounded-lg focus-within:border-accent transition-colors">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={targetDays === '' ? '' : Number(targetDays).toLocaleString()}
                        onChange={e => {
                          const raw = e.target.value.replace(/,/g, '')
                          if (raw === '') { setTargetDays(''); return }
                          const n = Number(raw)
                          if (!isNaN(n) && n >= 0) setTargetDays(n)
                        }}
                        placeholder="0"
                        className="w-24 pl-3 pr-8 py-2 text-sm bg-transparent text-text-primary focus:outline-none placeholder:text-text-muted"
                      />
                      <span className="absolute right-3 text-xs text-text-muted pointer-events-none select-none">일</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSubmittedCac(cac); setSubmittedTargetDays(targetDays); setPaybackResult(undefined) }}
                    className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-text-primary font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    계산하기
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">목표 기간 내 회수</span>
                    </div>
                    <div className="px-4 py-3 flex items-center gap-2">
                      {paybackResult === undefined ? (
                        <span className="text-lg font-extrabold text-text-muted">—</span>
                      ) : (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${paybackResult !== null ? 'bg-green-700' : 'bg-red-700'}`} />
                          <span className={`text-lg font-extrabold ${paybackResult !== null ? 'text-green-700' : 'text-red-700'}`}>
                            {paybackResult !== null ? `D${paybackResult} 회수 😊` : '미회수 😢'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">기간내 설치자</span>
                    </div>
                    <div className="px-4 py-3">
                      <span className="text-lg font-extrabold text-text-primary">
                        {ltvStats ? `${ltvStats.newMembers.toLocaleString()}명` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">목표 기간까지 남은 유저</span>
                    </div>
                    <div className="px-4 py-3">
                      <span className="text-lg font-extrabold text-text-primary">
                        {ltvStats ? `${ltvStats.retainedAtTarget.toLocaleString()}명` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">목표 기간까지 평균 회수율</span>
                    </div>
                    <div className="px-4 py-3">
                      <span className="text-lg font-extrabold text-text-primary">
                        {ltvStats ? `${ltvStats.avgPct}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">총 수익 (API 연동 후 추가 작업)</span>
                    </div>
                    <div className="px-4 py-3">
                      <span className="text-lg font-extrabold text-text-primary">
                        {'—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-bg-tertiary border-b border-line">
                      <span className="text-xs font-semibold text-text-secondary tracking-wide uppercase">총 결제자 (API 연동 후 추가 작업)</span>
                    </div>
                    <div className="px-4 py-3">
                      <span className="text-lg font-extrabold text-text-primary">
                        {'—'}
                      </span>
                    </div>
                  </div>
              </div>
            </div>
          )}
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

      {/* ── VIP 유저 정보 + 요약 지표 ── */}
      {activeTab === 'vip' && (() => {
        const u = DUMMY_PAYERS.find(p => p.rank === vipSelectedRank)!
        const seed         = u.rank
        const sessionMin   = Math.round(45 + Math.sin(seed * 3.7) * 20 + seed * 2)
        const totalPlayMin = Math.round(800 + seed * 120 + Math.sin(seed * 2.1) * 300)
        const totalPlayStr = totalPlayMin >= 60
          ? `${Math.floor(totalPlayMin / 60)}h ${totalPlayMin % 60}m`
          : `${totalPlayMin}m`
        const firstPlayDate = (() => {
          const d = new Date(2025, 0, 1)
          d.setDate(d.getDate() + seed * 17 + Math.round(Math.sin(seed * 4.3) * 30))
          return d.toISOString().split('T')[0]
        })()
        const metrics = [
          { label: '총 결제액',      value: `₩${u.total.toLocaleString()}`, color: 'text-accent'         },
          { label: '결제 횟수',      value: `${u.count}회`,                  color: 'text-blue-400'       },
          { label: '총 플레이 타임', value: totalPlayStr,                    color: 'text-green-400'      },
          { label: '평균 세션',      value: `${sessionMin}분`,               color: 'text-cyan-400'       },
          { label: '최근 결제',      value: u.lastDate,                      color: 'text-text-secondary' },
          { label: '첫 시작 날짜',   value: firstPlayDate,                   color: 'text-text-secondary' },
        ]
        const tierBorder = u.tier === 'Diamond' ? 'border-purple-500/40' : u.tier === 'Gold' ? 'border-yellow-500/40' : u.tier === 'Silver' ? 'border-gray-500/40' : 'border-amber-700/40'
        const tierBg     = u.tier === 'Diamond' ? 'bg-purple-500/20'    : u.tier === 'Gold' ? 'bg-yellow-500/20'    : u.tier === 'Silver' ? 'bg-gray-500/20'    : 'bg-amber-700/20'
        const tierText   = u.tier === 'Diamond' ? 'text-purple-400'     : u.tier === 'Gold' ? 'text-yellow-400'     : u.tier === 'Silver' ? 'text-gray-300'     : 'text-amber-600'
        const tierColor =
          u.tier === 'Diamond' ? '#a78bfa' :
          u.tier === 'Gold'    ? '#f59e0b' :
          u.tier === 'Silver'  ? '#9ca3af' : '#d97706'
        return (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden flex">
            {/* 좌측 컬러 액센트 + 유저 정보 */}
            <div className="flex items-stretch flex-shrink-0">
              <div className="w-1 rounded-l-xl" style={{ backgroundColor: tierColor }} />
              <div className="px-4 py-3 flex flex-col justify-center min-w-[140px]">
                <h2 className="text-base font-bold text-text-primary leading-none">{u.nickname}</h2>
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-px bg-line my-2 flex-shrink-0" />

            {/* 지표 */}
            <div className="flex items-center flex-1 px-1">
              {metrics.map((m, i) => (
                <div key={m.label} className="flex items-center flex-1">
                  <div className="flex-1 px-3 py-3">
                    <p className="text-[9px] text-text-muted uppercase tracking-wide mb-0.5">{m.label}</p>
                    <p className={`text-base font-bold ${m.color}`}>{m.value}</p>
                  </div>
                  {i < metrics.length - 1 && <div className="w-px bg-line h-6 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── 신규 유저 요약 지표 바 ── */}
      {activeTab === 'newusers' && !loading && data && overview && (() => {
        const seed = gameId.split('').reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1), 0)

        const sessionArr  = data.daily.filter(d => (d.avgSession ?? 0) > 0)
        const avgSessionSec = sessionArr.length > 0
          ? Math.round(sessionArr.reduce((s, d) => s + (d.avgSession ?? 0), 0) / sessionArr.length)
          : Math.round(480 + Math.abs(Math.sin(seed * 0.007)) * 900)
        const fmtSec = (sec: number) => {
          const m = Math.floor(sec / 60); const s = sec % 60
          if (m === 0) return `${s}초`
          if (s === 0) return `${m}분`
          return `${m}분 ${s}초`
        }

        const tutorialRate    = Math.round(62 + Math.abs(Math.sin(seed * 0.003)) * 26)
        const hoursToFirstPay = +(2.5 + Math.abs(Math.sin(seed * 0.011)) * 5.5).toFixed(1)
        const newUserRevenue  = Math.round(overview.totalRevenue * (0.08 + Math.abs(Math.sin(seed * 0.005)) * 0.18))

        const metrics = [
          { label: '신규 가입',            value: `${overview.newMembers.toLocaleString()}명`,  color: 'text-blue-400',   dummy: false },
          { label: '평균 DAU',             value: `${overview.avgDau.toLocaleString()}명`,       color: 'text-green-400',  dummy: false },
          { label: '신규 가입자 총 결제',  value: `₩${newUserRevenue.toLocaleString()}`,         color: 'text-accent',     dummy: true  },
          { label: 'ARPU',                 value: `₩${overview.arpu.toLocaleString()}`,          color: 'text-yellow-400', dummy: false },
          { label: 'ARPPU',                value: `₩${overview.arppu.toLocaleString()}`,         color: 'text-orange-400', dummy: false },
          { label: '튜토리얼 완료율',      value: `${tutorialRate}%`,                            color: 'text-cyan-400',   dummy: true  },
          { label: '평균 세션타임',        value: fmtSec(avgSessionSec),                         color: 'text-purple-400', dummy: sessionArr.length === 0 },
          { label: '첫 결제까지 평균',     value: `${hoursToFirstPay}시간`,                      color: 'text-text-secondary', dummy: true },
        ]

        return (
          <div className="grid grid-cols-4 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-bg-secondary border border-line rounded-lg px-4 py-3">
                <p className="text-[10px] text-text-muted mb-1 whitespace-nowrap">
                  {m.label}{m.dummy && <span className="ml-0.5 opacity-50">(더미)</span>}
                </p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── 전체 유저 요약 지표 바 ── */}
      {activeTab === 'allusers' && !loading && data && overview && (() => {
        const sessionArr  = data.daily.filter(d => (d.avgSession ?? 0) > 0)
        const avgSessionSec = sessionArr.length > 0
          ? Math.round(sessionArr.reduce((s, d) => s + (d.avgSession ?? 0), 0) / sessionArr.length)
          : 0
        const fmtSec = (sec: number) => {
          if (sec === 0) return '-'
          const m = Math.floor(sec / 60); const s = sec % 60
          if (m === 0) return `${s}초`
          if (s === 0) return `${m}분`
          return `${m}분 ${s}초`
        }

        const metrics = [
          { label: '누적 가입자',      value: `${overview.cumulativeMembers.toLocaleString()}명`, color: 'text-blue-400'   },
          { label: '평균 DAU',          value: `${overview.avgDau.toLocaleString()}명`,             color: 'text-green-400'  },
          { label: '신규 유저 수',      value: `${overview.newMembers.toLocaleString()}명`,         color: 'text-blue-400'   },
          { label: '결제 전환율 (PUR%)', value: `${overview.pur}%`,                                 color: 'text-yellow-400' },
          { label: 'ARPU',             value: `₩${overview.arpu.toLocaleString()}`,               color: 'text-orange-400' },
          { label: 'ARPPU',            value: `₩${overview.arppu.toLocaleString()}`,              color: 'text-accent'     },
          { label: '총 매출',           value: `₩${overview.totalRevenue.toLocaleString()}`,        color: 'text-accent'     },
          { label: '평균 세션타임',     value: fmtSec(avgSessionSec),                              color: 'text-purple-400' },
        ]

        return (
          <div className="grid grid-cols-4 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-bg-secondary border border-line rounded-lg px-4 py-3">
                <p className="text-[10px] text-text-muted mb-1 whitespace-nowrap">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        )
      })()}

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
                <MetricCard label="결제 전환율 (PUR)" value={`${overview.pur}%`}                          icon={<CreditCard   className="w-5 h-5" />} color="text-yellow-400" hint="결제유저/DAU" />
                <MetricCard label="ARPPU"            value={`₩${overview.arppu.toLocaleString()}`}      icon={<DollarSign   className="w-5 h-5" />} color="text-accent"     hint="결제유저당 매출" />
                <MetricCard label="ARPU"             value={`₩${overview.arpu.toLocaleString()}`}       icon={<TrendingUp   className="w-5 h-5" />} color="text-orange-400" hint="DAU당 매출" />
                <MetricCard label="총 매출"           value={`₩${overview.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="text-accent"   hint={`결제 ${overview.payingUsers}명`} />
                <MetricCard label="평균 세션타임" value={(() => {
                  const arr = data.daily.filter(d => (d.avgSession ?? 0) > 0)
                  if (!arr.length) return '—'
                  const sec = Math.round(arr.reduce((s, d) => s + (d.avgSession ?? 0), 0) / arr.length)
                  const m = Math.floor(sec / 60), s = sec % 60
                  return s === 0 ? `${m}분` : `${m}분 ${s}초`
                })()} icon={<Activity className="w-5 h-5" />} color="text-cyan-400" />
              </div>
              <RevenueDetailChart data={data.daily} title="일별 추이" showRanking={false} />
              <div className="grid grid-cols-3 gap-4">
                <RetentionChart data={data.retention} cohortTable={data.cohortTable} chartOnly />
                <SessionTimeChart data={data.daily} />
                <PaymentConversionChart data={data.daily} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div id="revenue-status" className="bg-bg-secondary border border-line rounded-lg p-5 flex flex-col">
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
                  <div className="flex justify-end mt-3">
                    <Link
                      href={`/analytics?tab=revenue${gameId ? `&gameId=${gameId}` : ''}`}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      수익 탭으로 바로가기 <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="bg-bg-secondary border border-line rounded-lg p-5 flex flex-col">
                  <h3 className="text-base font-bold mb-4">VIP 유저 (더미)</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                    {[
                      { rank: 1,  nickname: 'DragonSlayer99', total: 420000 },
                      { rank: 2,  nickname: '별빛전사',        total: 385000 },
                      { rank: 3,  nickname: 'IronWolf77',     total: 312000 },
                      { rank: 4,  nickname: '퍼플나이트',      total: 278000 },
                      { rank: 5,  nickname: 'StarBreaker',    total: 241000 },
                      { rank: 6,  nickname: '천둥검사',        total: 198000 },
                      { rank: 7,  nickname: 'NightOwl42',     total: 175000 },
                      { rank: 8,  nickname: '레드드래곤',      total: 152000 },
                      { rank: 9,  nickname: 'SilverArrow',    total: 134000 },
                      { rank: 10, nickname: '골든이글',        total: 118000 },
                    ].map((p) => (
                      <div key={p.rank} className="flex items-center justify-between px-3 py-2.5 bg-bg-tertiary rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-bold w-5 flex-shrink-0 ${
                            p.rank === 1 ? 'text-yellow-400' :
                            p.rank === 2 ? 'text-gray-300'   :
                            p.rank === 3 ? 'text-amber-600'  : 'text-text-secondary'
                          }`}>{p.rank}</span>
                          <span className="text-sm font-medium text-text-primary truncate">{p.nickname}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className="text-sm font-bold text-accent">₩{p.total.toLocaleString()}</span>
                          <Link
                            href={`/analytics?tab=vip${gameId ? `&gameId=${gameId}` : ''}&vipRank=${p.rank}`}
                            className="flex items-center gap-0.5 text-[10px] text-text-muted hover:text-accent transition-colors border border-line hover:border-accent rounded px-1.5 py-0.5"
                          >
                            분석 <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
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
              <SalesProductChart data={data.daily} topItems={data.topItems ?? []} />
            </div>
          )}

          {activeTab === 'allusers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 h-[420px]">
                <div className="col-span-2 h-full"><AllUsersTrendChart data={data.daily} /></div>
                <div className="col-span-1 h-full"><AllUsersRatioChart data={data.daily} /></div>
              </div>
              <AllUsersFunnelChart />
              <AllUsersChart data={data.daily} />
            </div>
          )}

          {activeTab === 'newusers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 h-[420px]">
                <div className="col-span-2 h-full"><NewUsersTrendChart data={data.daily} /></div>
                <div className="col-span-1 h-full"><NewUsersRatioChart data={data.daily} /></div>
              </div>
              <TutorialCohortChart />
              <NewUsersChart data={data.daily} />
            </div>
          )}

          {activeTab === 'vip' && <VipUsersChart selectedRank={vipSelectedRank} from={buildParams(period).from} to={buildParams(period).to} />}

        </>
      )}

      {activeTab === 'ltvcalc' && !loading && (
        <LtvCalculatorChart
          daily={data?.daily ?? []}
          overview={overview ?? null}
          retention={data?.retention ?? []}
          cac={submittedCac}
          targetDays={submittedTargetDays}
          onPaybackResult={setPaybackResult}
          onStatsResult={setLtvStats}
        />
      )}

    </div>
  )
}
