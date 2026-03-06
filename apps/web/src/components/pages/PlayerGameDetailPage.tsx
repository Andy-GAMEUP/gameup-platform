'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { gameService } from '@/services/gameService'
import playerService, { Review } from '@/services/playerService'
import TossPaymentModal from '@/components/TossPaymentModal'

const GENRE_IMG: Record<string, string> = {
  RPG: 'https://images.unsplash.com/photo-1646577482825-3fb6ff560de6?w=800&q=80',
  Action: 'https://images.unsplash.com/photo-1615511678275-bde5f97ecc17?w=800&q=80',
  Puzzle: 'https://images.unsplash.com/photo-1759701547646-acb29362adf6?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1738071665033-7ba9885c2c20?w=800&q=80'
}

const TYPE_CONFIG = {
  general:    { label: '일반', color: 'text-slate-400',  bg: 'bg-slate-700/30 border-slate-600/40' },
  bug:        { label: '버그', color: 'text-red-400',    bg: 'bg-red-900/20 border-red-500/30' },
  suggestion: { label: '제안', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/30' },
  praise:     { label: '칭찬', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-500/30' },
}

const SEV_CONFIG = {
  low:      { label: '낮음',   color: 'text-green-400' },
  medium:   { label: '보통',   color: 'text-yellow-400' },
  high:     { label: '높음',   color: 'text-orange-400' },
  critical: { label: '치명적', color: 'text-red-400' },
}

function StarRating({ value, onChange, size = 6 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const px = size * 4
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ width: px, height: px }}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <svg viewBox="0 0 24 24" className={`w-full h-full ${s <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-700 text-slate-700'}`}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function PlayerGameDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: _user, isAuthenticated } = useAuth()

  const [game, setGame] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'play' | 'reviews'>('overview')

  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [ratingDist, setRatingDist] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewSort, setReviewSort] = useState<'recent' | 'helpful'>('recent')
  const [reviewFilter, setReviewFilter] = useState('')
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [reviewLoadError, setReviewLoadError] = useState('')

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    rating: 5, title: '', content: '', feedbackType: 'general', bugSeverity: ''
  })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const [isPlaying, setIsPlaying] = useState(false)
  const [playStartTime, setPlayStartTime] = useState<number | null>(null)

  // ── 결제 모달 상태 ────────────────────────────────────────────
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean
    itemName: string
    amount: number
  }>({ open: false, itemName: '', amount: 0 })

  const loadGame = useCallback(async () => {
    if (!id) return
    try {
      const data = await gameService.getGameById(id)
      setGame(data.game as unknown as Record<string, unknown>)
    } catch {
      router.push('/games')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const loadReviews = useCallback(async () => {
    if (!id) return
    try {
      const params: Record<string, unknown> = { page: reviewPage, limit: 8, sort: reviewSort }
      if (reviewFilter) params.feedbackType = reviewFilter
      const data = await playerService.getGameReviews(id, params as Parameters<typeof playerService.getGameReviews>[1])
      setReviews(data.reviews)
      setReviewTotal(data.total)
      setRatingDist(data.distribution)
      setReviewLoadError('')
    } catch {
      setReviewLoadError('리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [id, reviewPage, reviewSort, reviewFilter])

  const loadMyReview = useCallback(async () => {
    if (!id || !isAuthenticated) return
    const data = await playerService.getMyReview(id)
    setMyReview(data.review)
    if (data.review) {
      setReviewForm({
        rating: data.review.rating,
        title: data.review.title,
        content: data.review.content,
        feedbackType: data.review.feedbackType,
        bugSeverity: data.review.bugSeverity || ''
      })
    }
  }, [id, isAuthenticated])

  const checkFavorite = useCallback(async () => {
    if (!id || !isAuthenticated) return
    const data = await playerService.checkFavorites([id])
    setIsFavorited(data.favorites[id] || false)
  }, [id, isAuthenticated])

  useEffect(() => { loadGame() }, [loadGame])
  useEffect(() => { loadReviews() }, [loadReviews])
  useEffect(() => { loadMyReview() }, [loadMyReview])
  useEffect(() => { checkFavorite() }, [checkFavorite])

  const handleFavorite = async () => {
    if (!isAuthenticated) { router.push('/login'); return }
    setFavLoading(true)
    try {
      const data = await playerService.toggleFavorite(id!)
      setIsFavorited(data.favorited)
    } finally {
      setFavLoading(false)
    }
  }

  const handlePlay = async () => {
    if (!isAuthenticated) { router.push('/login'); return }
    if (!game) return
    const result = await playerService.recordPlay(id!)
    if (!result.duplicate) {
      setGame((prev) => prev ? { ...prev, playCount: result.playCount } : prev)
    }
    setIsPlaying(true)
    setPlayStartTime(Date.now())
  }

  const handleStopPlay = async () => {
    setIsPlaying(false)
    if (playStartTime && id) {
      const duration = Math.round((Date.now() - playStartTime) / 1000)
      if (duration > 0) {
        await playerService.updatePlaySession(id, duration).catch(() => {})
      }
    }
    setPlayStartTime(null)
  }

  const handleReviewSubmit = async () => {
    if (!isAuthenticated) { router.push('/login'); return }
    if (!reviewForm.title.trim() || !reviewForm.content.trim()) {
      setReviewError('제목과 내용을 입력해주세요')
      return
    }
    setReviewSubmitting(true)
    setReviewError('')
    try {
      await playerService.upsertReview(id!, {
        rating: reviewForm.rating,
        title: reviewForm.title,
        content: reviewForm.content,
        feedbackType: reviewForm.feedbackType,
        bugSeverity: reviewForm.bugSeverity || undefined
      })
      setShowReviewForm(false)
      await loadReviews()
      await loadMyReview()
    } catch (err: unknown) {
      setReviewError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || '리뷰 등록 실패')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return
    try {
      await playerService.deleteReview(id!)
      setMyReview(null)
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', content: '', feedbackType: 'general', bugSeverity: '' })
      await loadReviews()
    } catch {
      setReviewError('리뷰 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) { router.push('/login'); return }
    const data = await playerService.toggleHelpful(reviewId)
    setReviews((prev) => prev.map((r) => r._id === reviewId ? { ...r, helpfulCount: data.helpfulCount } : r))
  }

  // ── 결제 핸들러 ───────────────────────────────────────────────
  const handlePurchase = (itemName: string, amount: number) => {
    if (!isAuthenticated) { router.push('/login'); return }
    setPaymentModal({ open: true, itemName, amount })
  }

  const avgRating = game ? (game.rating as number) || 0 : 0
  const totalReviewCount = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const thumbUrl = game?.thumbnail
    ? `/uploads/${(game.thumbnail as string).replace('uploads/', '')}`
    : GENRE_IMG[(game?.genre as string) || ''] || GENRE_IMG.default
  const gameFileUrl = game?.gameFile ? `/${(game.gameFile as string)}` : null
  const monetization = (game?.monetization as string) || 'free'
  const gamePrice = (game?.price as number) || 0

  const TABS = [
    { key: 'overview', label: '게임 소개' },
    { key: 'play',     label: '게임 플레이' },
    { key: 'reviews',  label: `리뷰 (${reviewTotal})` }
  ] as const

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96 text-slate-400">로딩 중...</div>
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={thumbUrl} alt={game.title as string} className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = GENRE_IMG.default }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs px-2 py-0.5 rounded">
                  {game.genre as string || '기타'}
                </span>
                {game.approvalStatus === 'approved' && (
                  <span className="bg-green-600/30 text-green-300 border border-green-500/40 text-xs px-2 py-0.5 rounded">승인됨</span>
                )}
                {game.status === 'archived' && (
                  <span className="bg-slate-600/30 text-slate-400 border border-slate-500/40 text-xs px-2 py-0.5 rounded">베타종료</span>
                )}
                {/* 수익화 배지 */}
                {monetization === 'paid' && (
                  <span className="bg-yellow-600/30 text-yellow-300 border border-yellow-500/40 text-xs px-2 py-0.5 rounded">
                    💰 유료
                  </span>
                )}
                {monetization === 'freemium' && (
                  <span className="bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs px-2 py-0.5 rounded">
                    ✨ 부분 유료
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{game.title as string}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <StarRating value={Math.round(avgRating)} />
                  <span className="text-yellow-400 font-bold ml-1">{avgRating.toFixed(1)}</span>
                  <span className="text-slate-400 text-sm">({reviewTotal}개 리뷰)</span>
                </div>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-sm">플레이 {(game.playCount as number || 0).toLocaleString()}회</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isFavorited
                    ? 'bg-pink-600/30 border-pink-500/50 text-pink-300 hover:bg-pink-600/50'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-pink-500/50 hover:text-pink-300'
                }`}
              >
                <svg viewBox="0 0 24 24" className={`w-4 h-4 ${isFavorited ? 'fill-pink-400' : 'fill-none stroke-current'}`} strokeWidth={2}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isFavorited ? '즐겨찾기 중' : '즐겨찾기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* ── 게임 소개 탭 ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-white font-bold text-lg mb-3">게임 설명</h2>
                <p className="text-slate-300 leading-relaxed">{game.description as string}</p>
              </div>

              {/* 유료 게임 구매 버튼 */}
              {monetization === 'paid' && gamePrice > 0 ? (
                <button
                  onClick={() => handlePurchase(`${game.title as string} 정식 구매`, gamePrice)}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-yellow-900/30"
                >
                  💰 ₩{gamePrice.toLocaleString()} 구매하기
                </button>
              ) : game.status !== 'archived' ? (
                <button
                  onClick={() => setActiveTab('play')}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-cyan-900/30"
                >
                  🎮 지금 베타 테스트 참여하기
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">게임 정보</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">장르</dt>
                    <dd className="text-white">{game.genre as string || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">수익화</dt>
                    <dd className="text-white capitalize">
                      {monetization === 'free' ? '무료' : monetization === 'paid' ? `유료 (₩${gamePrice.toLocaleString()})` : '부분 유료'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">플레이</dt>
                    <dd className="text-cyan-400 font-bold">{(game.playCount as number || 0).toLocaleString()}회</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">리뷰</dt>
                    <dd className="text-purple-400 font-bold">{reviewTotal}개</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">평균 별점</dt>
                    <dd className="text-yellow-400 font-bold">{avgRating.toFixed(1)} / 5.0</dd>
                  </div>
                </dl>
              </div>

              {/* 인앱 결제 아이템 (freemium) */}
              {monetization === 'freemium' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-3">게임샵</h3>
                  <div className="space-y-2">
                    {[
                      { name: '스타터 팩', price: 9900 },
                      { name: '프리미엄 스킨', price: 4900 },
                      { name: '골드 1000개', price: 2900 },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <span className="text-sm text-slate-300">{item.name}</span>
                        <button
                          onClick={() => handlePurchase(item.name, item.price)}
                          className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-md transition-colors font-medium"
                        >
                          ₩{item.price.toLocaleString()}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">별점 분포</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const cnt = ratingDist[star] || 0
                    const pct = totalReviewCount > 0 ? (cnt / totalReviewCount) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 w-4">{star}★</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                          <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-slate-500 w-5 text-right">{cnt}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 게임 플레이 탭 ── */}
        {activeTab === 'play' && (
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400 mb-4">게임을 플레이하려면 로그인이 필요합니다</p>
                <Link href="/login" className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">로그인하기</Link>
              </div>
            ) : game.status === 'archived' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-2xl mb-2">📦</p>
                <p className="text-slate-400">이 게임의 베타 서비스가 종료되었습니다</p>
              </div>
            ) : gameFileUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-bold">게임 플레이</h2>
                  {isPlaying && (
                    <button onClick={handleStopPlay} className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-sm hover:bg-red-600/40 transition-colors">
                      플레이 종료
                    </button>
                  )}
                </div>
                {!isPlaying ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                    <p className="text-slate-400 mb-4 text-sm">게임을 시작하면 플레이 기록이 저장됩니다</p>
                    <button
                      onClick={handlePlay}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all"
                    >
                      🎮 게임 시작
                    </button>
                  </div>
                ) : (
                  <div className="w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                    <iframe
                      src={gameFileUrl}
                      className="w-full"
                      style={{ height: '600px' }}
                      title={game.title as string}
                      sandbox="allow-scripts"
                    />
                  </div>
                )}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                  💡 플레이 후 리뷰를 남겨 개발자에게 피드백을 전달하세요
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400">게임 파일을 불러올 수 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* ── 리뷰 탭 ── */}
        {activeTab === 'reviews' && (
          <div className="space-y-5">
            {reviewLoadError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {reviewLoadError}
              </div>
            )}
            {isAuthenticated && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">{myReview ? '내 리뷰' : '리뷰 작성'}</h3>
                  <div className="flex gap-2">
                    {myReview && !showReviewForm && (
                      <>
                        <button onClick={() => setShowReviewForm(true)} className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded hover:bg-blue-600/40 transition-colors">수정</button>
                        <button onClick={handleDeleteReview} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded hover:bg-red-600/40 transition-colors">삭제</button>
                      </>
                    )}
                    {!myReview && !showReviewForm && (
                      <button onClick={() => setShowReviewForm(true)} className="text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-600/40 transition-colors">+ 리뷰 작성</button>
                    )}
                  </div>
                </div>

                {myReview && !showReviewForm && (
                  <div className="bg-slate-800/40 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating value={myReview.rating} size={4} />
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_CONFIG[myReview.feedbackType]?.bg} ${TYPE_CONFIG[myReview.feedbackType]?.color}`}>
                        {TYPE_CONFIG[myReview.feedbackType]?.label}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm mb-1">{myReview.title}</p>
                    <p className="text-slate-300 text-sm">{myReview.content}</p>
                  </div>
                )}

                {showReviewForm && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">별점 *</label>
                      <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm({ ...reviewForm, rating: v })} size={7} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 text-xs block mb-1">피드백 유형</label>
                        <select value={reviewForm.feedbackType} onChange={(e) => setReviewForm({ ...reviewForm, feedbackType: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
                          <option value="general">일반</option>
                          <option value="praise">칭찬</option>
                          <option value="suggestion">제안</option>
                          <option value="bug">버그 신고</option>
                        </select>
                      </div>
                      {reviewForm.feedbackType === 'bug' && (
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">버그 심각도</label>
                          <select value={reviewForm.bugSeverity} onChange={(e) => setReviewForm({ ...reviewForm, bugSeverity: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
                            <option value="">선택</option>
                            <option value="low">낮음</option>
                            <option value="medium">보통</option>
                            <option value="high">높음</option>
                            <option value="critical">치명적</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">리뷰 제목 *</label>
                      <input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} maxLength={100} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm placeholder-slate-500" placeholder="한 줄 요약" />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">리뷰 내용 *</label>
                      <textarea value={reviewForm.content} onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })} rows={4} maxLength={2000} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm placeholder-slate-500 resize-none" placeholder="게임 플레이 경험을 자세히 알려주세요..." />
                      <p className="text-slate-600 text-xs text-right mt-1">{reviewForm.content.length}/2000</p>
                    </div>
                    {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleReviewSubmit} disabled={reviewSubmitting} className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white py-2 rounded font-medium text-sm transition-colors">
                        {reviewSubmitting ? '등록 중...' : myReview ? '수정 완료' : '리뷰 등록'}
                      </button>
                      <button onClick={() => { setShowReviewForm(false); setReviewError('') }} className="flex-1 border border-slate-700 text-slate-400 hover:text-white py-2 rounded text-sm transition-colors">취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                {[['', '전체'], ['general', '일반'], ['praise', '칭찬'], ['suggestion', '제안'], ['bug', '버그']].map(([val, label]) => (
                  <button key={val} onClick={() => { setReviewFilter(val); setReviewPage(1) }}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${reviewFilter === val ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {[['recent', '최신순'], ['helpful', '도움순']].map(([val, label]) => (
                  <button key={val} onClick={() => setReviewSort(val as 'recent' | 'helpful')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${reviewSort === val ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
                아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const tc = TYPE_CONFIG[review.feedbackType] || TYPE_CONFIG.general
                  const sc = review.bugSeverity ? SEV_CONFIG[review.bugSeverity] : null
                  return (
                    <div key={review._id} className={`rounded-xl p-5 border ${tc.bg}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            {(review.userId?.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm font-medium">{review.userId?.username || '익명'}</span>
                              {review.isVerifiedTester && <span className="text-xs text-cyan-400 border border-cyan-500/30 px-1 rounded">인증 테스터</span>}
                            </div>
                            <p className="text-slate-500 text-xs">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${tc.bg} ${tc.color}`}>{tc.label}</span>
                          {sc && <span className={`text-xs font-medium ${sc.color}`}>[{sc.label}]</span>}
                          <StarRating value={review.rating} size={4} />
                        </div>
                      </div>
                      <p className="text-white font-semibold text-sm mb-1">{review.title}</p>
                      <p className="text-slate-300 text-sm leading-relaxed mb-3">{review.content}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleHelpful(review._id)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          도움됨 {review.helpfulCount}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {Math.ceil(reviewTotal / 8) > 1 && (
              <div className="flex gap-2 justify-center">
                {Array.from({ length: Math.ceil(reviewTotal / 8) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setReviewPage(p)}
                    className={`w-8 h-8 rounded text-sm ${reviewPage === p ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 결제 모달 ── */}
      {paymentModal.open && (
        <TossPaymentModal
          isOpen={paymentModal.open}
          gameId={id!}
          gameName={game.title as string}
          itemName={paymentModal.itemName}
          amount={paymentModal.amount}
          onClose={() => setPaymentModal({ open: false, itemName: '', amount: 0 })}
        />
      )}
    </div>
  )
}
