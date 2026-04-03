'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  BarChart2, Play, Star, Heart, TrendingUp, ArrowLeft, Loader2,
  Users, Clock, Shield, Bug, Lightbulb, ThumbsUp, MessageSquare,
  CheckCircle, XCircle, Archive, RotateCcw, Pause, AlertTriangle,
  ChevronRight, Calendar
} from 'lucide-react'

const FEEDBACK_LABELS: Record<string, string> = {
  general: '일반 의견', bug: '버그 리포트', suggestion: '개선 건의', praise: '칭찬'
}
const FEEDBACK_COLORS: Record<string, string> = {
  general: 'bg-bg-muted', bug: 'bg-red-500', suggestion: 'bg-blue-500', praise: 'bg-accent'
}
const FEEDBACK_TEXT: Record<string, string> = {
  general: 'text-text-secondary', bug: 'text-accent-text', suggestion: 'text-blue-400', praise: 'text-accent'
}
const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-accent/70', medium: 'bg-yellow-500/70', high: 'bg-orange-500/70', critical: 'bg-red-600'
}
const SEVERITY_LABELS: Record<string, string> = {
  low: '낮음', medium: '보통', high: '높음', critical: '치명적'
}
const APPROVAL_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '심사대기', cls: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' },
  review:   { label: '검토중',   cls: 'bg-blue-600/20 text-blue-300 border-blue-500/40' },
  approved: { label: '승인됨',   cls: 'bg-accent-light text-accent border-green-500/40' },
  rejected: { label: '거부됨',   cls: 'bg-accent-light text-accent-text border-red-500/40' },
}
const GAME_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: '드래프트', cls: 'bg-bg-muted/40 text-text-secondary' },
  beta:      { label: '베타',     cls: 'bg-cyan-600/20 text-cyan-300' },
  published: { label: '출시',     cls: 'bg-purple-600/20 text-purple-300' },
  archived:  { label: '종료됨',   cls: 'bg-bg-tertiary/60 text-text-muted' },
}

type Tab = 'overview' | 'reviews' | 'feedback'

interface RatingDist { rating: number; count: number }
interface BugSeverity { severity: string; count: number }
interface TrendPoint { _id: string; plays: number; avgDuration?: number; uniqueUsers?: number }
interface ReviewItem {
  _id: string
  userId: { username: string }
  gameId: string
  rating: number
  title: string
  content: string
  feedbackType: string
  bugSeverity?: string
  isVerifiedTester: boolean
  helpfulCount: number
  isBlocked: boolean
  createdAt: string
}
interface GameMetrics {
  totalPlayCount: number
  uniqueTesters: number
  avgSessionDuration: number
  totalPlayTime: number
  totalReviews: number
  avgRating: number
  favoriteCount: number
  verifiedTesterCount: number
  ratingDist: RatingDist[]
  feedbackTypes: Record<string, number>
  bugSeverityDist: BugSeverity[]
  playTrend: TrendPoint[]
  weeklyTrend: TrendPoint[]
  recentReviews: ReviewItem[]
  topHelpfulReviews: ReviewItem[]
}
interface GameMetricsResponse {
  success: boolean
  game: {
    _id: string
    title: string
    genre: string
    status: string
    approvalStatus: string
    createdAt: string
    developerId: { _id: string; username: string; email: string }
  }
  metrics: GameMetrics
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '-'
  if (seconds < 60) return `${seconds}초`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}분 ${s}초` : `${m}분`
}

function BarChart({ data, maxVal, colorClass }: { data: { label: string; value: number; sub?: string }[]; maxVal: number; colorClass: string }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-text-secondary text-xs">{d.label}{d.sub ? <span className="text-text-muted ml-1">{d.sub}</span> : null}</span>
            <span className="text-text-primary text-xs font-semibold">{d.value.toLocaleString()}</span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div className={`${colorClass} h-2 rounded-full transition-all`} style={{ width: `${maxVal > 0 ? Math.round((d.value / maxVal) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminGameMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<GameMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [trendMode, setTrendMode] = useState<'30d' | '7d'>('30d')
  const [reviewFilter, setReviewFilter] = useState<'' | 'bug' | 'suggestion' | 'praise' | 'general'>('')
  const [confirm, setConfirm] = useState<{ title: string; desc: string; action: string; danger?: boolean } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (msg: string, ok = true) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, ok })
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    adminService.getGameMetrics(id)
      .then((res) => setData(res as GameMetricsResponse))
      .catch(() => showToast('데이터를 불러오지 못했습니다', false))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  const handleControl = async (action: string, reason?: string) => {
    if (!id) return
    setConfirm(null)
    setActionLoading(true)
    try {
      await adminService.controlGameStatus(id, { action, reason })
      showToast('게임 상태가 변경되었습니다')
      load()
    } catch {
      showToast('상태 변경 실패', false)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    </AdminLayout>
  )

  if (!data) return (
    <AdminLayout>
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary">데이터를 불러올 수 없습니다</p>
        <button onClick={() => router.push('/admin/games')} className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm">← 게임 목록으로</button>
      </div>
    </AdminLayout>
  )

  const { game, metrics } = data
  const {
    totalPlayCount, uniqueTesters, avgSessionDuration, totalPlayTime,
    totalReviews, avgRating, favoriteCount, verifiedTesterCount,
    ratingDist = [], feedbackTypes = {}, bugSeverityDist = [],
    playTrend = [], weeklyTrend = [], recentReviews = [], topHelpfulReviews = []
  } = metrics

  const trendData = trendMode === '7d' ? weeklyTrend : playTrend
  const maxPlay = Math.max(...trendData.map((d: any) => d.plays), 1)
  const maxRatingCount = Math.max(...ratingDist.map((r: any) => r.count), 1)
  const totalFeedback = Object.values(feedbackTypes).reduce((s: any, v: any) => s + v, 0) as number

  const approvalBadge = APPROVAL_STATUS[game.approvalStatus] || { label: game.approvalStatus, cls: 'bg-bg-tertiary text-text-secondary' }
  const statusBadge = GAME_STATUS[game.status] || { label: game.status, cls: 'bg-bg-tertiary text-text-secondary' }

  const filteredReviews = reviewFilter
    ? recentReviews.filter((r: any) => r.feedbackType === reviewFilter)
    : recentReviews

  const kpiCards = [
    { icon: Play,    color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   label: '총 플레이',      value: totalPlayCount.toLocaleString() },
    { icon: Users,   color: 'text-violet-400', bg: 'bg-violet-500/10', label: '고유 테스터',     value: uniqueTesters.toLocaleString() },
    { icon: Clock,   color: 'text-amber-400',  bg: 'bg-amber-500/10',  label: '평균 플레이시간', value: formatDuration(avgSessionDuration) },
    { icon: Star,    color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: '평균 평점',       value: avgRating > 0 ? `★ ${avgRating.toFixed(1)}` : '-' },
    { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '총 리뷰',    value: totalReviews.toLocaleString() },
    { icon: Shield,  color: 'text-accent',  bg: 'bg-accent/10',  label: '인증 테스터',     value: verifiedTesterCount.toLocaleString() },
    { icon: Heart,   color: 'text-pink-400',   bg: 'bg-pink-500/10',   label: '즐겨찾기',        value: favoriteCount.toLocaleString() },
    { icon: Calendar, color: 'text-text-secondary', bg: 'bg-bg-tertiary/40',  label: '총 플레이시간',   value: totalPlayTime > 0 ? `${totalPlayTime.toLocaleString()}분` : '-' },
  ]

  return (
    <AdminLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.ok ? 'bg-accent' : 'bg-red-600'} text-text-primary`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm 모달 */}
      {confirm && (
        <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${confirm.danger ? 'bg-accent-light' : 'bg-orange-500/20'}`}>
              <AlertTriangle className={`w-5 h-5 ${confirm.danger ? 'text-accent-text' : 'text-orange-400'}`} />
            </div>
            <h3 className="text-text-primary font-bold text-lg mb-1">{confirm.title}</h3>
            <p className="text-text-secondary text-sm mb-5">{confirm.desc}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">취소</button>
              <button
                onClick={() => handleControl(confirm.action)}
                className={`px-4 py-2 text-sm text-text-primary rounded-lg transition-colors ${confirm.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-orange-700 hover:bg-orange-800'}`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => router.push('/admin/games')} className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-text-primary text-xl font-bold truncate">{game.title}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${approvalBadge.cls}`}>{approvalBadge.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
              </div>
              <p className="text-text-muted text-sm mt-0.5">
                {game.genre} · 개발자: <span className="text-text-secondary">{(game.developerId as any)?.username}</span> · 등록 {new Date(game.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {game.status === 'beta' || game.status === 'published' ? (
              <button
                onClick={() => setConfirm({ title: '게임 서비스 중지', desc: '게임이 즉시 중지되고 플레이어가 접근할 수 없게 됩니다. 계속하시겠습니까?', action: 'suspend' })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-orange-600/20 text-orange-300 border border-orange-500/30 hover:bg-orange-600/40 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" /> 중지
              </button>
            ) : game.status === 'draft' && game.approvalStatus === 'approved' ? (
              <button
                onClick={() => setConfirm({ title: '게임 재활성화', desc: '게임을 베타 상태로 재활성화합니다. 계속하시겠습니까?', action: 'reactivate' })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/40 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 재활성화
              </button>
            ) : null}
            {game.status !== 'archived' && (
              <button
                onClick={() => setConfirm({ title: '게임 종료 (아카이브)', desc: '이 게임을 영구적으로 종료 처리합니다. 이 작업은 되돌리기 어렵습니다. 정말 진행하시겠습니까?', action: 'archive', danger: true })}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-bg-tertiary/50 text-text-secondary border border-line/40 hover:bg-line-light px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" /> 아카이브
              </button>
            )}
            <Link
              href={`/admin/community?gameId=${id}`}
              className="flex items-center gap-1.5 bg-bg-tertiary text-text-secondary border border-line hover:border-line hover:text-text-primary px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> 리뷰 관리
            </Link>
          </div>
        </div>

        {/* KPI 카드 8개 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map(({ icon: Icon, color, bg, label, value }) => (
            <div key={label} className="bg-bg-secondary border border-line rounded-xl p-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-text-muted text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-bg-secondary border border-line rounded-xl p-1 w-fit">
          {([['overview', '개요 분석'], ['reviews', '리뷰 목록'], ['feedback', '피드백 분석']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── 탭: 개요 분석 ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* 플레이 트렌드 */}
            <div className="bg-bg-secondary border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-text-primary font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> 플레이 트렌드
                </h3>
                <div className="flex gap-1">
                  {(['7d', '30d'] as const).map((m) => (
                    <button key={m} onClick={() => setTrendMode(m)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${trendMode === m ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40' : 'text-text-muted hover:text-text-secondary'}`}
                    >
                      {m === '7d' ? '7일' : '30일'}
                    </button>
                  ))}
                </div>
              </div>
              {trendData.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-10">플레이 기록 없음</p>
              ) : (
                <>
                  <div className="flex items-end gap-1 h-36">
                    {trendData.map((d: any) => {
                      const h = Math.max(Math.round((d.plays / maxPlay) * 100), 2)
                      const date = d._id?.slice(5)
                      return (
                        <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group" title={`${d._id}: ${d.plays}회${d.uniqueUsers ? `, ${d.uniqueUsers}명` : ''}`}>
                          <div className="relative w-full">
                            <div
                              className="w-full bg-cyan-500/50 group-hover:bg-cyan-400 rounded-t transition-colors cursor-default"
                              style={{ height: `${h * 1.2}px` }}
                            />
                          </div>
                          {trendData.length <= 14 && (
                            <span className="text-text-muted text-xs">{date}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {trendMode === '7d' && weeklyTrend.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-line">
                      <div className="text-center">
                        <p className="text-text-primary font-bold">{weeklyTrend.reduce((s: number, d: any) => s + d.plays, 0).toLocaleString()}</p>
                        <p className="text-text-muted text-xs">7일 총 플레이</p>
                      </div>
                      <div className="text-center">
                        <p className="text-text-primary font-bold">
                          {Math.round(weeklyTrend.reduce((s: number, d: any) => s + d.plays, 0) / weeklyTrend.length).toLocaleString()}
                        </p>
                        <p className="text-text-muted text-xs">일 평균</p>
                      </div>
                      <div className="text-center">
                        <p className="text-text-primary font-bold">
                          {Math.max(...weeklyTrend.map((d: any) => d.plays)).toLocaleString()}
                        </p>
                        <p className="text-text-muted text-xs">최고 플레이</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 별점 분포 + 피드백 유형 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> 별점 분포
                </h3>
                {totalReviews === 0 ? (
                  <p className="text-text-muted text-sm text-center py-8">리뷰 없음</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {[...ratingDist].reverse().map((r: any) => (
                        <div key={r.rating} className="flex items-center gap-2">
                          <span className="text-yellow-400 text-xs w-14 text-right">{r.rating}점 {'★'.repeat(r.rating)}</span>
                          <div className="flex-1 bg-bg-tertiary rounded-full h-2.5">
                            <div className="bg-yellow-500 h-2.5 rounded-full transition-all"
                              style={{ width: `${maxRatingCount > 0 ? Math.round((r.count / maxRatingCount) * 100) : 0}%` }} />
                          </div>
                          <span className="text-text-secondary text-xs w-5 text-right">{r.count}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-text-muted text-xs mt-3 text-center">총 {totalReviews}개 · 평균 ★{avgRating.toFixed(1)}</p>
                  </>
                )}
              </div>

              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" /> 피드백 유형
                </h3>
                {totalFeedback === 0 ? (
                  <p className="text-text-muted text-sm text-center py-8">피드백 없음</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(feedbackTypes)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .map(([type, count]: any) => {
                        const pct = Math.round((count / totalFeedback) * 100)
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs ${FEEDBACK_TEXT[type] || 'text-text-secondary'}`}>{FEEDBACK_LABELS[type] || type}</span>
                              <span className="text-text-primary text-xs font-semibold">{count}건 ({pct}%)</span>
                            </div>
                            <div className="w-full bg-bg-tertiary rounded-full h-2">
                              <div className={`${FEEDBACK_COLORS[type] || 'bg-bg-muted'} h-2 rounded-full transition-all`}
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    <p className="text-text-muted text-xs text-center pt-1">총 {totalFeedback}건의 피드백</p>
                  </div>
                )}
              </div>
            </div>

            {/* 버그 심각도 */}
            {bugSeverityDist.length > 0 && (
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <Bug className="w-4 h-4 text-accent-text" /> 버그 심각도 분포
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {bugSeverityDist.map((b: any) => (
                    <div key={b.severity} className="text-center bg-bg-tertiary/50 rounded-xl p-4">
                      <div className={`w-3 h-3 rounded-full ${SEVERITY_COLORS[b.severity] || 'bg-bg-muted'} mx-auto mb-2`} />
                      <p className="text-text-primary font-bold text-lg">{b.count}</p>
                      <p className="text-text-secondary text-xs">{SEVERITY_LABELS[b.severity] || b.severity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 도움됨 TOP 리뷰 */}
            {topHelpfulReviews.length > 0 && (
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-accent" /> 도움됨 TOP 리뷰
                </h3>
                <div className="space-y-3">
                  {topHelpfulReviews.map((r: any) => (
                    <div key={r._id} className="flex items-start gap-3 p-3 bg-bg-tertiary/50 rounded-lg">
                      <div className="w-7 h-7 bg-bg-tertiary rounded-full flex items-center justify-center text-xs font-bold text-text-primary flex-shrink-0">
                        {(r.userId?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-text-primary text-sm font-medium">{r.userId?.username}</span>
                          <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}</span>
                          <span className={`text-xs px-1.5 rounded ${FEEDBACK_COLORS[r.feedbackType] || 'bg-bg-muted'} bg-opacity-20 ${FEEDBACK_TEXT[r.feedbackType] || 'text-text-secondary'}`}>
                            {FEEDBACK_LABELS[r.feedbackType] || r.feedbackType}
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm font-medium truncate">{r.title}</p>
                        <p className="text-text-muted text-xs">{r.content?.slice(0, 80)}{r.content?.length > 80 ? '...' : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 text-accent text-xs flex-shrink-0">
                        <ThumbsUp className="w-3 h-3" /> {r.helpfulCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 탭: 리뷰 목록 ── */}
        {tab === 'reviews' && (
          <div className="space-y-4">
            {/* 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-secondary text-sm">유형:</span>
              {(['', 'general', 'bug', 'suggestion', 'praise'] as const).map((f) => (
                <button key={f} onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    reviewFilter === f
                      ? 'bg-bg-tertiary text-text-primary border-line'
                      : 'text-text-secondary border-line hover:border-line'
                  }`}>
                  {f === '' ? '전체' : FEEDBACK_LABELS[f]}
                </button>
              ))}
              <span className="text-text-muted text-xs ml-auto">최근 10건 표시</span>
            </div>

            {filteredReviews.length === 0 ? (
              <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">해당 유형의 리뷰가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReviews.map((r: any) => (
                  <div key={r._id} className={`bg-bg-secondary border rounded-xl p-4 ${r.isBlocked ? 'border-red-800/40 bg-red-950/10' : 'border-line'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-bg-tertiary rounded-full flex items-center justify-center text-sm font-bold text-text-primary flex-shrink-0">
                        {(r.userId?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-text-primary text-sm font-semibold">{r.userId?.username}</span>
                          <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${FEEDBACK_COLORS[r.feedbackType] || 'bg-bg-muted'}/20 ${FEEDBACK_TEXT[r.feedbackType] || 'text-text-secondary'} border border-current/20`}>
                            {FEEDBACK_LABELS[r.feedbackType] || r.feedbackType}
                          </span>
                          {r.isVerifiedTester && (
                            <span className="bg-accent-light text-accent text-xs px-1.5 rounded border border-green-500/30 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> 인증
                            </span>
                          )}
                          {r.isBlocked && (
                            <span className="bg-accent-light text-accent-text text-xs px-1.5 rounded border border-accent-muted">차단됨</span>
                          )}
                          {r.bugSeverity && (
                            <span className="text-xs text-orange-400">[{SEVERITY_LABELS[r.bugSeverity]}]</span>
                          )}
                        </div>
                        <p className="text-text-primary text-sm font-medium mb-1">{r.title}</p>
                        <p className="text-text-secondary text-xs leading-relaxed">{r.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-text-muted text-xs">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
                          {r.helpfulCount > 0 && (
                            <span className="text-accent text-xs flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" /> {r.helpfulCount}명 도움됨
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center">
              <Link
                href={`/admin/community?gameId=${id}`}
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                전체 리뷰 관리 페이지로 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── 탭: 피드백 분석 ── */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            {/* 피드백 유형별 상세 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(feedbackTypes)
                .sort(([, a]: any, [, b]: any) => b - a)
                .map(([type, count]: any) => {
                  const pct = Math.round((count / totalFeedback) * 100)
                  const typeReviews = recentReviews.filter((r: any) => r.feedbackType === type)
                  const avgR = typeReviews.length > 0
                    ? (typeReviews.reduce((s: number, r: any) => s + r.rating, 0) / typeReviews.length).toFixed(1)
                    : '-'
                  return (
                    <div key={type} className="bg-bg-secondary border border-line rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-3 h-3 rounded-full ${FEEDBACK_COLORS[type] || 'bg-bg-muted'}`} />
                        <span className={`font-semibold text-sm ${FEEDBACK_TEXT[type] || 'text-text-secondary'}`}>{FEEDBACK_LABELS[type] || type}</span>
                        <span className="ml-auto text-text-primary font-bold">{count}건</span>
                      </div>
                      <div className="w-full bg-bg-tertiary rounded-full h-2 mb-4">
                        <div className={`${FEEDBACK_COLORS[type] || 'bg-bg-muted'} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-bg-tertiary/50 rounded-lg p-2">
                          <p className="text-text-primary font-bold">{pct}%</p>
                          <p className="text-text-muted text-xs">전체 비율</p>
                        </div>
                        <div className="bg-bg-tertiary/50 rounded-lg p-2">
                          <p className="text-text-primary font-bold">★ {avgR}</p>
                          <p className="text-text-muted text-xs">평균 평점</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* 버그 심각도 상세 */}
            {bugSeverityDist.length > 0 && (
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <Bug className="w-4 h-4 text-accent-text" /> 버그 심각도 상세
                  <span className="ml-auto text-text-muted text-xs">총 {bugSeverityDist.reduce((s: number, b: any) => s + b.count, 0)}건</span>
                </h3>
                <BarChart
                  data={bugSeverityDist.map((b: any) => ({
                    label: SEVERITY_LABELS[b.severity] || b.severity,
                    value: b.count
                  }))}
                  maxVal={Math.max(...bugSeverityDist.map((b: any) => b.count))}
                  colorClass="bg-red-500/60"
                />
              </div>
            )}

            {/* 건의/개선 목록 */}
            {recentReviews.filter((r: any) => r.feedbackType === 'suggestion').length > 0 && (
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-400" /> 개선 건의 목록
                </h3>
                <div className="space-y-2">
                  {recentReviews
                    .filter((r: any) => r.feedbackType === 'suggestion')
                    .map((r: any) => (
                      <div key={r._id} className="flex items-start gap-2 p-3 bg-blue-950/20 border border-blue-800/30 rounded-lg">
                        <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-text-primary text-sm font-medium">{r.title}</p>
                          <p className="text-text-secondary text-xs mt-0.5">{r.content?.slice(0, 120)}{r.content?.length > 120 ? '...' : ''}</p>
                          <p className="text-text-muted text-xs mt-1">by {r.userId?.username} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {totalFeedback === 0 && (
              <div className="bg-bg-secondary border border-line rounded-xl p-16 text-center">
                <BarChart2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">피드백 데이터가 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
