'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Download, ChevronDown, LayoutGrid, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { gameService } from '@/services/gameService'

interface DeveloperOption { _id: string; name: string }
interface GameOption { _id: string; title: string; thumbnail?: string; developerId?: { _id: string; username: string; companyInfo?: { companyName?: string } } }

type Period = '1d' | '7d' | '30d' | '6m' | '1y' | 'custom'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1d',     label: '어제'     },
  { value: '7d',     label: '1주일'    },
  { value: '30d',    label: '한 달'    },
  { value: '6m',     label: '반년'     },
  { value: '1y',     label: '1년'      },
  { value: 'custom', label: '지정 날짜' },
]

const toYMD = (d: Date) => d.toISOString().split('T')[0]

const STATUS_LABEL: Record<string, string> = {
  pending:   '대기중',
  completed: '완료',
  failed:    '실패',
  refunded:  '환불',
}

export default function AdminPaymentsPage() {
  const [allGames,         setAllGames]         = useState<GameOption[]>([])
  const [developers,       setDevelopers]       = useState<DeveloperOption[]>([])
  const [developerId,      setDeveloperId]      = useState('')
  const [developerDropdownOpen, setDeveloperDropdownOpen] = useState(false)
  const [gameId,           setGameId]           = useState('')
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false)

  const games = developerId
    ? allGames.filter(g => String(g.developerId?._id) === developerId)
    : allGames
  const [period,           setPeriod]           = useState<Period>(() => (typeof window !== 'undefined' ? (localStorage.getItem('admin_payments_period') as Period) : null) ?? '30d')
  const [customFrom,       setCustomFrom]       = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('admin_payments_customFrom') : null) ?? toYMD(new Date(Date.now() - 29 * 86400000)))
  const [customTo,         setCustomTo]         = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('admin_payments_customTo') : null) ?? toYMD(new Date()))
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const [periodDropdownView, setPeriodDropdownView] = useState<'list' | 'custom'>('list')
  const [provider,  setProvider]  = useState('all')
  const [providers, setProviders] = useState<string[]>([])
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [pages,     setPages]     = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [payments,  setPayments]  = useState<any[]>([])
  const [summary,   setSummary]   = useState<{ totalAmount: number; totalCount: number; uniqueBuyers: number } | null>(null)
  const [queried,   setQueried]   = useState(false)

  const developerDropdownRef = useRef<HTMLDivElement>(null)
  const gameDropdownRef      = useRef<HTMLDivElement>(null)
  const periodDropdownRef    = useRef<HTMLDivElement>(null)

  const buildDates = (p: Period) => {
    const now = new Date()
    const from =
      p === '1d'  ? new Date(now.getTime() - 1   * 86400000) :
      p === '7d'  ? new Date(now.getTime() - 6   * 86400000) :
      p === '30d' ? new Date(now.getTime() - 29  * 86400000) :
      p === '6m'  ? new Date(now.getTime() - 181 * 86400000) :
      p === '1y'  ? new Date(now.getTime() - 364 * 86400000) :
      new Date(customFrom)
    const to = p === 'custom' ? new Date(customTo) : now
    return { startDate: toYMD(from), endDate: toYMD(to) }
  }

  const periodLabel = (() => {
    const { startDate, endDate } = buildDates(period)
    const fmt = (s: string) => s.replace(/-/g, '. ')
    return { label: PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '', from: fmt(startDate), to: fmt(endDate) }
  })()

  useEffect(() => {
    gameService.getMyGames().then(res => {
      const g = (res.games || []) as unknown as GameOption[]
      setAllGames(g)
      const devMap = new Map<string, DeveloperOption>()
      g.forEach(game => {
        const dev = game.developerId
        if (dev?._id) {
          const name = dev.companyInfo?.companyName || dev.username
          devMap.set(dev._id, { _id: dev._id, name })
        }
      })
      setDevelopers(Array.from(devMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem('admin_payments_period', period)
    localStorage.setItem('admin_payments_customFrom', customFrom)
    localStorage.setItem('admin_payments_customTo', customTo)
  }, [period, customFrom, customTo])

  useEffect(() => {
    setGameId('')
  }, [developerId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (developerDropdownRef.current && !developerDropdownRef.current.contains(e.target as Node))
        setDeveloperDropdownOpen(false)
      if (gameDropdownRef.current && !gameDropdownRef.current.contains(e.target as Node))
        setGameDropdownOpen(false)
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setPeriodDropdownOpen(false)
        setPeriodDropdownView('list')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const load = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const { startDate, endDate } = buildDates(period)
      const params = {
        startDate, endDate,
        pgProvider: provider === 'all' ? undefined : provider,
        search: search || undefined,
        page: pg, limit: 50,
      }
      const res = gameId
        ? await gameService.getGamePayments(gameId, params)
        : await gameService.getAllDeveloperPayments(params)
      setPayments(res.payments)
      setSummary(res.summary)
      if ((res as any).providers?.length) setProviders((res as any).providers)
      setPages(res.pagination.pages)
      setPage(pg)
      setQueried(true)
    } catch { /* noop */ }
    finally { setLoading(false) }
  }, [gameId, period, customFrom, customTo, provider, search])

  useEffect(() => { load(1) }, [gameId, period, customFrom, customTo, provider]) // eslint-disable-line

  const downloadCSV = () => {
    if (!payments.length) return
    const headers = ['개발사명', '게임', '결제 일시', '주문번호', '주문자', '이메일', '상품 고유 ID', '상품명', '결제 금액', '결제 통화', '결제 수단', '결제 처리', '결제 상태', '결제 계정', '지급 계정', '지급 상태']
    const getDeveloper = (p: any) => (p.gameId as any)?.developerId?.companyInfo?.companyName || (p.gameId as any)?.developerId?.username || '-'
    const rows = payments.map((p: any) => [
      getDeveloper(p),
      (p.gameId as any)?.title || '',
      new Date(p.createdAt).toLocaleString('ko-KR'),
      p.pgOrderId || '',
      (p.userId as any)?.username || '',
      (p.userId as any)?.email || '',
      p.metadata?.itemId || '',
      p.metadata?.itemName || '',
      p.amount ?? '',
      p.currency || 'KRW',
      p.pgProvider || '',
      p.metadata?.processType || '',
      STATUS_LABEL[p.status] ?? p.status,
      p.metadata?.paymentAccount || '',
      p.metadata?.deliveryAccount || '',
      p.metadata?.deliveryStatus || '',
    ])
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = '﻿' + [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const { startDate, endDate } = buildDates(period)
    a.download = `admin_payments_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* 헤더 + 기간/엑셀 같은 행 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-text-primary">결제 • 환불</h2>
          <p className="text-text-secondary text-sm mt-1 truncate">
            전체 개발사의 결제 내역을 확인하고 관리할 수 있습니다.
          </p>
        </div>
        {/* 기간 드롭다운 + 갱신 + 엑셀 */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative" ref={periodDropdownRef}>
              <button
                onClick={() => setPeriodDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-xs bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition-colors min-w-[100px] justify-between"
              >
                <span>{PERIOD_OPTIONS.find(o => o.value === period)?.label ?? '기간'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${periodDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {periodDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 overflow-hidden">
                  {periodDropdownView === 'list' ? (
                    <div className="min-w-[110px]">
                      {PERIOD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (opt.value === 'custom') {
                              setPeriodDropdownView('custom')
                            } else {
                              setPeriod(opt.value)
                              setPeriodDropdownOpen(false)
                            }
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            period === opt.value ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 w-56 space-y-3">
                      <button
                        onClick={() => setPeriodDropdownView('list')}
                        className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors"
                      >
                        ← 돌아가기
                      </button>
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">시작일</label>
                          <input type="date" value={customFrom} max={customTo}
                            onChange={e => setCustomFrom(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-text-secondary">종료일</label>
                          <input type="date" value={customTo} min={customFrom} max={toYMD(new Date())}
                            onChange={e => setCustomTo(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-line rounded-md bg-bg-secondary focus:outline-none focus:border-accent w-full" />
                        </div>
                      </div>
                      <button
                        onClick={() => { setPeriod('custom'); setPeriodDropdownOpen(false); setPeriodDropdownView('list') }}
                        className="w-full px-3 py-1.5 text-xs bg-accent hover:bg-accent-hover text-text-primary rounded-md font-medium transition-colors"
                      >
                        적용
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 갱신 */}
            <button onClick={() => load(1)} disabled={loading}
              className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 transition-colors"
              title="새로고침">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {/* 엑셀 내보내기 */}
            <div className="relative group">
              <button onClick={downloadCSV} disabled={!payments.length}
                className="flex items-center px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40 transition-colors">
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-bg-primary border border-line rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                엑셀로 내보내세요
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-accent">{periodLabel.label}</span>
            <span className="text-xs text-text-muted">|</span>
            <span className="text-xs text-text-secondary">{periodLabel.from}</span>
            <span className="text-xs text-text-muted">~</span>
            <span className="text-xs text-text-secondary">{periodLabel.to}</span>
          </div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* 개발사 선택 */}
          <div>
            <p className="text-xs text-text-secondary mb-1">개발사</p>
            <div className="relative" ref={developerDropdownRef}>
              <button
                onClick={() => setDeveloperDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-line rounded-md text-sm text-text-primary hover:bg-bg-tertiary transition-colors min-w-[160px] justify-between"
              >
                <span className="truncate">
                  {developerId ? (developers.find(d => d._id === developerId)?.name ?? '전체 개발사') : '전체 개발사'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${developerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {developerDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[160px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setDeveloperId(''); setDeveloperDropdownOpen(false) }}
                    className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${developerId === '' ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'}`}
                  >
                    전체 개발사
                  </button>
                  {developers.map(d => (
                    <button
                      key={d._id}
                      onClick={() => { setDeveloperId(d._id); setDeveloperDropdownOpen(false) }}
                      className={`w-full flex items-center px-3 py-2 text-sm transition-colors truncate ${d._id === developerId ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'}`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 게임 선택 */}
          <div>
            <p className="text-xs text-text-secondary mb-1">게임</p>
            <div className="relative" ref={gameDropdownRef}>
              <button
                onClick={() => setGameDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-line rounded-md text-sm text-text-primary hover:bg-bg-tertiary transition-colors min-w-[180px] justify-between"
              >
                {gameId === '' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-bg-tertiary flex items-center justify-center flex-shrink-0">
                      <LayoutGrid className="w-3 h-3 text-text-muted" />
                    </span>
                    <span>전체 게임</span>
                  </span>
                ) : (() => {
                  const g = games.find(g => g._id === gameId)
                  return g ? (
                    <span className="flex items-center gap-2 min-w-0">
                      {g.thumbnail
                        ? <Image src={g.thumbnail} alt={g.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                        : <span className="w-5 h-5 rounded bg-bg-tertiary flex-shrink-0" />}
                      <span className="truncate">{g.title}</span>
                    </span>
                  ) : <span className="text-text-secondary">전체 게임</span>
                })()}
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${gameDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {gameDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 bg-bg-primary border border-line rounded-md shadow-lg z-20 min-w-[180px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setGameId(''); setGameDropdownOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${gameId === '' ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'}`}
                  >
                    <span className="w-5 h-5 rounded bg-bg-secondary flex items-center justify-center flex-shrink-0">
                      <LayoutGrid className="w-3 h-3 text-text-muted" />
                    </span>
                    전체 게임
                  </button>
                  {games.map(g => (
                    <button
                      key={g._id}
                      onClick={() => { setGameId(g._id); setGameDropdownOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${g._id === gameId ? 'bg-accent text-text-primary font-semibold' : 'text-text-secondary hover:bg-bg-tertiary'}`}
                    >
                      {g.thumbnail
                        ? <Image src={g.thumbnail} alt={g.title} width={20} height={20} className="w-5 h-5 rounded object-cover flex-shrink-0" unoptimized />
                        : <span className="w-5 h-5 rounded bg-bg-tertiary flex-shrink-0" />}
                      <span className="truncate">{g.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1">결제 수단</p>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="bg-bg-secondary border border-line rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none">
              <option value="all">전체</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="w-[180px]">
            <p className="text-xs text-text-secondary mb-1">검색</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(1)}
                placeholder="상품명, 주문자로 검색..."
                className="w-full bg-bg-secondary border border-line rounded-md pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none" />
            </div>
          </div>

          <button onClick={() => load(1)} disabled={loading}
            className="px-5 py-2 bg-accent text-text-inverse text-sm font-semibold rounded-md hover:bg-accent-hover disabled:opacity-40 transition-colors">
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {/* 요약 인라인 */}
      <div className="flex items-center gap-8 text-sm text-text-secondary border-b border-line pb-3">
        <span>총 결제 금액 : <strong className="text-text-primary">{queried && summary ? `₩${summary.totalAmount.toLocaleString()}` : '-'}</strong></span>
        <span>총 결제 건수 : <strong className="text-text-primary">{queried && summary ? `${summary.totalCount.toLocaleString()}건` : '-'}</strong></span>
        <span>총 주문자 수 : <strong className="text-text-primary">{queried && summary ? `${summary.uniqueBuyers.toLocaleString()}명` : '-'}</strong></span>
      </div>

      {/* 테이블 */}
      {loading && !queried ? (
        <div className="text-center py-16 text-text-muted text-sm">조회 중...</div>
      ) : !queried ? null : payments.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">데이터가 없습니다.</div>
      ) : (
        <div className="bg-bg-secondary border border-line rounded-xl overflow-x-auto">
          <table className="w-full text-sm text-text-primary min-w-[1800px]">
            <thead>
              <tr className="border-b border-line bg-bg-tertiary/50 text-xs font-semibold text-text-secondary divide-x divide-line/30">
                <th className="px-3 py-3 text-left whitespace-nowrap">개발사명</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">게임</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 일시</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">주문번호</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">주문자</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">상품 고유 ID</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">상품명</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 금액</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 통화</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 수단</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 처리</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 상태</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">결제 계정</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">지급 계정</th>
                <th className="px-3 py-3 text-left whitespace-nowrap">지급 상태</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => {
                const isRefund = p.status === 'refunded'
                const developer = (p.gameId as any)?.developerId
                const developerName = developer?.companyInfo?.companyName || developer?.username || '-'
                return (
                  <tr key={p._id} className="border-b border-line/50 last:border-0 hover:bg-bg-tertiary/20 divide-x divide-line/30">
                    <td className="px-3 py-3 text-text-secondary text-sm whitespace-nowrap">{developerName}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {(p.gameId as any)?.thumbnail
                          ? <Image src={(p.gameId as any).thumbnail} alt="" width={28} height={28} className="w-7 h-7 rounded object-cover flex-shrink-0" unoptimized />
                          : <span className="w-7 h-7 rounded bg-bg-tertiary flex-shrink-0" />}
                        <span className="text-sm text-text-primary truncate max-w-[120px]">{(p.gameId as any)?.title || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-text-secondary">
                      <p>{new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
                      <p>{new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-text-muted">{p.pgOrderId || '-'}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{(p.userId as any)?.username || '-'}</p>
                      <p className="text-xs text-text-muted">{(p.userId as any)?.email || ''}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-text-muted">{p.metadata?.itemId || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary">{p.metadata?.itemName || '-'}</td>
                    <td className="px-3 py-3 font-semibold">{p.amount?.toLocaleString() ?? '-'}</td>
                    <td className="px-3 py-3 text-text-secondary">{p.currency || 'KRW'}</td>
                    <td className="px-3 py-3 text-text-secondary">{p.pgProvider || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary">{p.metadata?.processType || '-'}</td>
                    <td className={`px-3 py-3 text-sm ${isRefund ? 'text-danger' : 'text-text-primary'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </td>
                    <td className="px-3 py-3 text-text-secondary text-xs">{p.metadata?.paymentAccount || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary text-xs">{p.metadata?.deliveryAccount || '-'}</td>
                    <td className="px-3 py-3 text-text-secondary">{p.metadata?.deliveryStatus || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => load(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-line rounded-md disabled:opacity-30 hover:bg-bg-tertiary">이전</button>
          <span className="text-sm text-text-secondary">{page} / {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages}
            className="px-3 py-1.5 text-sm border border-line rounded-md disabled:opacity-30 hover:bg-bg-tertiary">다음</button>
        </div>
      )}
    </div>
  )
}
