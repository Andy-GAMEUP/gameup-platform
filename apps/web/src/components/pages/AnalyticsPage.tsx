'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  RefreshCw, Download, Users, UserPlus, Activity, Calendar as CalendarIcon,
  CreditCard, DollarSign, TrendingUp, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { gameService } from '@/services/gameService'
import {
  analyticsService,
  GameAnalyticsResponse,
} from '@/services/analyticsService'
import DateRangePicker from '@/components/analytics/DateRangePicker'
import MetricCard from '@/components/analytics/MetricCard'
import RetentionChart from '@/components/analytics/RetentionChart'
import DailyTrendChart from '@/components/analytics/DailyTrendChart'

interface GameOption { _id: string; title: string }

export default function AnalyticsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialGameId = searchParams.get('gameId') || ''

  const [games, setGames] = useState<GameOption[]>([])
  const [gameId, setGameId] = useState<string>(initialGameId)
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [to, setTo] = useState<Date>(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d
  })
  const [data, setData] = useState<GameAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  // 게임 목록 로드
  useEffect(() => {
    gameService.getMyGames()
      .then((res) => {
        const list = ((res.games || []) as unknown as GameOption[]).map(g => ({ _id: g._id, title: g.title }))
        setGames(list)
        if (!gameId && list.length > 0) {
          setGameId(list[0]._id)
        }
      })
      .catch(() => setError('게임 목록을 불러오지 못했습니다.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL sync
  useEffect(() => {
    if (gameId) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('gameId', gameId)
      router.replace(`/analytics?${params.toString()}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  const load = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    setError('')
    try {
      const result = await analyticsService.getGameAnalytics(gameId, {
        from: format(from, 'yyyy-MM-dd'),
        to: format(to, 'yyyy-MM-dd'),
      })
      setData(result)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '분석 데이터를 불러오지 못했습니다.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [gameId, from, to])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    if (!gameId) return
    setExporting(true)
    try {
      const blob = await analyticsService.exportGameAnalytics(gameId, {
        from: format(from, 'yyyy-MM-dd'),
        to: format(to, 'yyyy-MM-dd'),
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = (data?.gameTitle || 'game').replace(/[^\w가-힣\-_]/g, '_')
      a.download = `analytics_${safeTitle}_${format(from, 'yyyyMMdd')}_${format(to, 'yyyyMMdd')}.xlsx`
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

  const overview = data?.overview

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">게임 분석</h1>
          <p className="text-text-secondary">게임별 세부 지표 · 리텐션 · 수익화 통계</p>
        </div>

        {/* 컨트롤 바 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 게임 선택 */}
          <select
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary focus:outline-none focus:border-accent min-w-[200px]"
          >
            {games.length === 0 && <option value="">게임 없음</option>}
            {games.map(g => (
              <option key={g._id} value={g._id}>{g.title}</option>
            ))}
          </select>

          {/* 캘린더 날짜 선택 */}
          <DateRangePicker
            from={from}
            to={to}
            onChange={({ from: f, to: t }) => { setFrom(f); setTo(t) }}
          />

          <button
            onClick={load}
            disabled={!gameId || loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-line rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>

          {/* 엑셀 내보내기 */}
          <button
            onClick={handleExport}
            disabled={!gameId || exporting || loading || !data}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors disabled:opacity-40 ml-auto"
          >
            <Download className="w-4 h-4" />
            {exporting ? '내보내는 중...' : '엑셀 내보내기'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
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

      {!loading && data && overview && (
        <>
          {/* 헤더 정보 */}
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary text-base">{data.gameTitle}</strong>
            <span className="ml-3">{data.from} ~ {data.to}</span>
          </div>

          {/* 핵심 지표 카드 (8개) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="누적 회원"
              value={overview.cumulativeMembers.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
              color="text-blue-400"
              hint="전체 가입자"
            />
            <MetricCard
              label="신규 생성 회원"
              value={overview.newMembers.toLocaleString()}
              icon={<UserPlus className="w-5 h-5" />}
              color="text-green-400"
              hint="기간 내"
            />
            <MetricCard
              label="DAU (평균)"
              value={overview.avgDau.toLocaleString()}
              icon={<Activity className="w-5 h-5" />}
              color="text-purple-400"
            />
            <MetricCard
              label="MAU"
              value={overview.mau.toLocaleString()}
              icon={<CalendarIcon className="w-5 h-5" />}
              color="text-cyan-400"
            />
            <MetricCard
              label="결제 전환율 (PUR)"
              value={`${overview.pur}%`}
              icon={<CreditCard className="w-5 h-5" />}
              color="text-yellow-400"
              hint="결제유저/DAU"
            />
            <MetricCard
              label="ARPPU"
              value={`₩${overview.arppu.toLocaleString()}`}
              icon={<DollarSign className="w-5 h-5" />}
              color="text-accent"
              hint="결제유저당 매출"
            />
            <MetricCard
              label="ARPU"
              value={`₩${overview.arpu.toLocaleString()}`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="text-orange-400"
              hint="DAU당 매출"
            />
            <MetricCard
              label="총 매출"
              value={`₩${overview.totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="w-5 h-5" />}
              color="text-accent"
              hint={`결제 ${overview.payingUsers}명`}
            />
          </div>

          {/* 일별 추이 */}
          <DailyTrendChart data={data.daily} />

          {/* 리텐션 */}
          <RetentionChart data={data.retention} />
        </>
      )}
    </div>
  )
}
