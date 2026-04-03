'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { gameService } from '@/services/gameService'
import playerService, { Review } from '@/services/playerService'

interface GameQA {
  _id: string
  gameId: string
  userId: { _id: string; username: string }
  developerId: { _id: string; username: string }
  question: string
  answer?: string
  answeredAt?: string
  createdAt: string
}
import TossPaymentModal from '@/components/TossPaymentModal'

const GENRE_IMG: Record<string, string> = {
  RPG: 'https://images.unsplash.com/photo-1646577482825-3fb6ff560de6?w=800&q=80',
  Action: 'https://images.unsplash.com/photo-1615511678275-bde5f97ecc17?w=800&q=80',
  Puzzle: 'https://images.unsplash.com/photo-1759701547646-acb29362adf6?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1738071665033-7ba9885c2c20?w=800&q=80'
}

const TYPE_CONFIG = {
  general:    { label: '일반', color: 'text-text-secondary',  bg: 'bg-bg-tertiary/30 border-line/40' },
  bug:        { label: '버그', color: 'text-red-400',    bg: 'bg-red-900/20 border-red-500/30' },
  suggestion: { label: '제안', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/30' },
  praise:     { label: '칭찬', color: 'text-accent',  bg: 'bg-green-900/20 border-accent-muted' },
}

const SEV_CONFIG = {
  low:      { label: '낮음',   color: 'text-accent' },
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
          <svg viewBox="0 0 24 24" className={`w-full h-full ${s <= (hover || value) ? 'fill-yellow-400 text-yellow-400' : 'fill-bg-tertiary text-text-secondary'}`}>
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

  // Q&A
  const [qas, setQAs] = useState<GameQA[]>([])
  const [qaTotal, setQATotal] = useState(0)
  const [qaPage, setQAPage] = useState(1)
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaSubmitting, setQaSubmitting] = useState(false)

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

  const loadQAs = useCallback(async () => {
    if (!id) return
    try {
      const data = await gameService.getGameQAs(id, { page: qaPage, limit: 10 })
      setQAs(data.qas)
      setQATotal(data.total)
    } catch { /* ignore */ }
  }, [id, qaPage])

  useEffect(() => { loadGame() }, [loadGame])
  useEffect(() => { loadReviews() }, [loadReviews])
  useEffect(() => { loadMyReview() }, [loadMyReview])
  useEffect(() => { checkFavorite() }, [checkFavorite])
  useEffect(() => { loadQAs() }, [loadQAs])

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

  const handleQASubmit = async () => {
    if (!isAuthenticated) { router.push('/login'); return }
    if (!qaQuestion.trim()) return
    setQaSubmitting(true)
    try {
      await gameService.createGameQA(id!, qaQuestion.trim())
      setQaQuestion('')
      await loadQAs()
    } catch { /* ignore */ }
    finally { setQaSubmitting(false) }
  }

  // ── 결제 핸들러 ───────────────────────────────────────────────
  const handlePurchase = (itemName: string, amount: number) => {
    if (!isAuthenticated) { router.push('/login'); return }
    setPaymentModal({ open: true, itemName, amount })
  }

  const avgRating = game ? (game.rating as number) || 0 : 0
  const totalReviewCount = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const rawThumb = game?.thumbnail as string | undefined
  const thumbUrl = rawThumb
    ? (rawThumb.startsWith('http') ? rawThumb : `/uploads/${rawThumb.replace('uploads/', '')}`)
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
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="flex items-center justify-center h-96 text-text-secondary">로딩 중...</div>
      </div>
    )
  }

  if (!game) return null

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <Image src={thumbUrl} alt={game.title as string} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs px-2 py-0.5 rounded">
                  {game.genre as string || '기타'}
                </span>
                {game.approvalStatus === 'approved' && (
                  <span className="bg-accent/30 text-accent border border-accent-muted text-xs px-2 py-0.5 rounded">승인됨</span>
                )}
                {game.status === 'archived' && (
                  <span className="bg-bg-muted/30 text-text-secondary border border-line/40 text-xs px-2 py-0.5 rounded">베타종료</span>
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
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{game.title as string}</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1">
                  <StarRating value={Math.round(avgRating)} />
                  <span className="text-yellow-400 font-bold ml-1">{avgRating.toFixed(1)}</span>
                  <span className="text-text-secondary text-sm">({reviewTotal}개 리뷰)</span>
                </div>
                <span className="text-text-muted">•</span>
                <span className="text-text-secondary text-sm">플레이 {(game.playCount as number || 0).toLocaleString()}회</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isFavorited
                    ? 'bg-pink-600/30 border-pink-500/50 text-pink-300 hover:bg-pink-600/50'
                    : 'bg-bg-tertiary border-line text-text-secondary hover:border-pink-500/50 hover:text-pink-300'
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
      <div className="border-b border-line bg-bg-primary/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
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
              <div className="bg-bg-secondary border border-line rounded-xl p-6">
                <h2 className="text-text-primary font-bold text-lg mb-3">게임 설명</h2>
                <p className="text-text-secondary leading-relaxed">{game.description as string}</p>
              </div>

              {/* 유료 게임 구매 버튼 */}
              {monetization === 'paid' && gamePrice > 0 ? (
                <button
                  onClick={() => handlePurchase(`${game.title as string} 정식 구매`, gamePrice)}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-text-primary py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-yellow-900/30"
                >
                  💰 ₩{gamePrice.toLocaleString()} 구매하기
                </button>
              ) : game.status !== 'archived' ? (
                <button
                  onClick={() => setActiveTab('play')}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-text-primary py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-cyan-900/30"
                >
                  🎮 지금 베타 테스트 참여하기
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4">게임 정보</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">장르</dt>
                    <dd className="text-text-primary">{game.genre as string || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">수익화</dt>
                    <dd className="text-text-primary capitalize">
                      {monetization === 'free' ? '무료' : monetization === 'paid' ? `유료 (₩${gamePrice.toLocaleString()})` : '부분 유료'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">플레이</dt>
                    <dd className="text-cyan-400 font-bold">{(game.playCount as number || 0).toLocaleString()}회</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">리뷰</dt>
                    <dd className="text-purple-400 font-bold">{reviewTotal}개</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">평균 별점</dt>
                    <dd className="text-yellow-400 font-bold">{avgRating.toFixed(1)} / 5.0</dd>
                  </div>
                </dl>
              </div>

              {/* 인앱 결제 아이템 (freemium) */}
              {monetization === 'freemium' && (
                <div className="bg-bg-secondary border border-line rounded-xl p-5">
                  <h3 className="text-text-primary font-semibold mb-3">게임샵</h3>
                  <div className="space-y-2">
                    {[
                      { name: '스타터 팩', price: 9900 },
                      { name: '프리미엄 스킨', price: 4900 },
                      { name: '골드 1000개', price: 2900 },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-lg">
                        <span className="text-sm text-text-secondary">{item.name}</span>
                        <button
                          onClick={() => handlePurchase(item.name, item.price)}
                          className="text-xs px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-md transition-colors font-medium"
                        >
                          ₩{item.price.toLocaleString()}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-3">별점 분포</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const cnt = ratingDist[star] || 0
                    const pct = totalReviewCount > 0 ? (cnt / totalReviewCount) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="text-text-secondary w-4">{star}★</span>
                        <div className="flex-1 bg-bg-tertiary rounded-full h-1.5">
                          <div className="bg-yellow-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-text-muted w-5 text-right">{cnt}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 개발사 정보 */}
              {game.developerId != null && typeof game.developerId === 'object' ? (
                <div className="bg-bg-secondary border border-line rounded-xl p-5">
                  <h3 className="text-text-primary font-semibold mb-3">개발사 정보</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-text-primary font-bold">
                      {((game.developerId as any).username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-text-primary font-medium text-sm">{(game.developerId as any).username}</p>
                      <p className="text-text-muted text-xs">{(game.developerId as any).email}</p>
                    </div>
                  </div>
                  {(game.developerId as any).companyInfo?.companyName && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">회사명</span>
                        <span className="text-text-primary">{(game.developerId as any).companyInfo.companyName}</span>
                      </div>
                      {(game.developerId as any).companyInfo?.website && (
                        <div className="flex justify-between">
                          <span className="text-text-secondary">웹사이트</span>
                          <a href={(game.developerId as any).companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate ml-2">{(game.developerId as any).companyInfo.website}</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Q&A 섹션 */}
            <div className="lg:col-span-3">
              <div className="bg-bg-secondary border border-line rounded-xl p-6">
                <h2 className="text-text-primary font-bold text-lg mb-4">개발사 Q&A</h2>

                {/* 질문 작성 폼 */}
                {isAuthenticated ? (
                  <div className="mb-6">
                    <textarea
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      placeholder="개발사에게 궁금한 점을 질문하세요..."
                      rows={3}
                      maxLength={1000}
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary text-sm placeholder-text-muted resize-none focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-text-muted text-xs">{qaQuestion.length}/1000</span>
                      <button
                        onClick={handleQASubmit}
                        disabled={qaSubmitting || !qaQuestion.trim()}
                        className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary text-sm px-5 py-2 rounded-lg font-medium transition-colors"
                      >
                        {qaSubmitting ? '전송 중...' : '질문하기'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 bg-bg-tertiary/50 border border-line rounded-lg p-4 text-center">
                    <p className="text-text-secondary text-sm mb-2">Q&A를 작성하려면 로그인이 필요합니다</p>
                    <Link href="/login" className="text-cyan-400 hover:underline text-sm">로그인하기</Link>
                  </div>
                )}

                {/* Q&A 목록 */}
                {qas.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-6">아직 Q&A가 없습니다. 첫 번째 질문을 남겨보세요!</p>
                ) : (
                  <div className="space-y-4">
                    {qas.map((qa) => (
                      <div key={qa._id} className="border border-line rounded-lg overflow-hidden">
                        <div className="bg-bg-tertiary/50 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-bg-tertiary rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary">
                              {(qa.userId?.username || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-text-primary text-sm font-medium">{qa.userId?.username || '익명'}</span>
                            <span className="text-text-muted text-xs">{new Date(qa.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                          <p className="text-text-secondary text-sm">{qa.question}</p>
                        </div>
                        {qa.answer ? (
                          <div className="bg-cyan-900/10 border-t border-cyan-500/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary">
                                {(qa.developerId?.username || 'D')[0].toUpperCase()}
                              </div>
                              <span className="text-cyan-400 text-sm font-medium">{qa.developerId?.username || '개발사'}</span>
                              <span className="text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">개발사</span>
                              {qa.answeredAt && <span className="text-text-muted text-xs">{new Date(qa.answeredAt).toLocaleDateString('ko-KR')}</span>}
                            </div>
                            <p className="text-text-secondary text-sm">{qa.answer}</p>
                          </div>
                        ) : (
                          <div className="bg-bg-tertiary/30 border-t border-line px-4 py-3">
                            <span className="text-text-muted text-xs">답변 대기 중...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {Math.ceil(qaTotal / 10) > 1 && (
                  <div className="flex gap-2 justify-center mt-4">
                    {Array.from({ length: Math.ceil(qaTotal / 10) }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setQAPage(p)}
                        className={`w-8 h-8 rounded text-sm ${qaPage === p ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 게임 플레이 탭 ── */}
        {activeTab === 'play' && (
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
                <p className="text-text-secondary mb-4">게임을 플레이하려면 로그인이 필요합니다</p>
                <Link href="/login" className="bg-cyan-600 hover:bg-cyan-700 text-text-primary px-6 py-2 rounded-lg font-medium transition-colors">로그인하기</Link>
              </div>
            ) : game.status === 'archived' ? (
              <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
                <p className="text-2xl mb-2">📦</p>
                <p className="text-text-secondary">이 게임의 베타 서비스가 종료되었습니다</p>
              </div>
            ) : gameFileUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-text-primary font-bold">게임 플레이</h2>
                  {isPlaying && (
                    <button onClick={handleStopPlay} className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded text-sm hover:bg-red-600/40 transition-colors">
                      플레이 종료
                    </button>
                  )}
                </div>
                {!isPlaying ? (
                  <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
                    <p className="text-text-secondary mb-4 text-sm">게임을 시작하면 플레이 기록이 저장됩니다</p>
                    <button
                      onClick={handlePlay}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-text-primary px-8 py-3 rounded-xl font-semibold text-lg transition-all"
                    >
                      🎮 게임 시작
                    </button>
                  </div>
                ) : (
                  <div className="w-full rounded-xl overflow-hidden border border-line bg-bg-secondary">
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
              <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
                <p className="text-text-secondary">게임 파일을 불러올 수 없습니다</p>
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
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-text-primary font-semibold">{myReview ? '내 리뷰' : '리뷰 작성'}</h3>
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
                  <div className="bg-bg-tertiary/40 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating value={myReview.rating} size={4} />
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_CONFIG[myReview.feedbackType]?.bg} ${TYPE_CONFIG[myReview.feedbackType]?.color}`}>
                        {TYPE_CONFIG[myReview.feedbackType]?.label}
                      </span>
                    </div>
                    <p className="text-text-primary font-medium text-sm mb-1">{myReview.title}</p>
                    <p className="text-text-secondary text-sm">{myReview.content}</p>
                  </div>
                )}

                {showReviewForm && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-text-secondary text-xs block mb-1">별점 *</label>
                      <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm({ ...reviewForm, rating: v })} size={7} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-text-secondary text-xs block mb-1">피드백 유형</label>
                        <select value={reviewForm.feedbackType} onChange={(e) => setReviewForm({ ...reviewForm, feedbackType: e.target.value })} className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm">
                          <option value="general">일반</option>
                          <option value="praise">칭찬</option>
                          <option value="suggestion">제안</option>
                          <option value="bug">버그 신고</option>
                        </select>
                      </div>
                      {reviewForm.feedbackType === 'bug' && (
                        <div>
                          <label className="text-text-secondary text-xs block mb-1">버그 심각도</label>
                          <select value={reviewForm.bugSeverity} onChange={(e) => setReviewForm({ ...reviewForm, bugSeverity: e.target.value })} className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm">
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
                      <label className="text-text-secondary text-xs block mb-1">리뷰 제목 *</label>
                      <input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} maxLength={100} className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted" placeholder="한 줄 요약" />
                    </div>
                    <div>
                      <label className="text-text-secondary text-xs block mb-1">리뷰 내용 *</label>
                      <textarea value={reviewForm.content} onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })} rows={4} maxLength={2000} className="w-full bg-bg-tertiary border border-line text-text-primary rounded px-3 py-2 text-sm placeholder-text-muted resize-none" placeholder="게임 플레이 경험을 자세히 알려주세요..." />
                      <p className="text-text-muted text-xs text-right mt-1">{reviewForm.content.length}/2000</p>
                    </div>
                    {reviewError && <p className="text-red-400 text-sm">{reviewError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleReviewSubmit} disabled={reviewSubmitting} className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-text-primary py-2 rounded font-medium text-sm transition-colors">
                        {reviewSubmitting ? '등록 중...' : myReview ? '수정 완료' : '리뷰 등록'}
                      </button>
                      <button onClick={() => { setShowReviewForm(false); setReviewError('') }} className="flex-1 border border-line text-text-secondary hover:text-text-primary py-2 rounded text-sm transition-colors">취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                {[['', '전체'], ['general', '일반'], ['praise', '칭찬'], ['suggestion', '제안'], ['bug', '버그']].map(([val, label]) => (
                  <button key={val} onClick={() => { setReviewFilter(val); setReviewPage(1) }}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${reviewFilter === val ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {[['recent', '최신순'], ['helpful', '도움순']].map(([val, label]) => (
                  <button key={val} onClick={() => setReviewSort(val as 'recent' | 'helpful')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${reviewSort === val ? 'text-cyan-400' : 'text-text-muted hover:text-text-secondary'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center text-text-muted">
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
                          <div className="w-9 h-9 bg-bg-tertiary rounded-full flex items-center justify-center text-sm font-bold text-text-primary">
                            {(review.userId?.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-text-primary text-sm font-medium">{review.userId?.username || '익명'}</span>
                              {review.isVerifiedTester && <span className="text-xs text-cyan-400 border border-cyan-500/30 px-1 rounded">인증 테스터</span>}
                            </div>
                            <p className="text-text-muted text-xs">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${tc.bg} ${tc.color}`}>{tc.label}</span>
                          {sc && <span className={`text-xs font-medium ${sc.color}`}>[{sc.label}]</span>}
                          <StarRating value={review.rating} size={4} />
                        </div>
                      </div>
                      <p className="text-text-primary font-semibold text-sm mb-1">{review.title}</p>
                      <p className="text-text-secondary text-sm leading-relaxed mb-3">{review.content}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleHelpful(review._id)} className="flex items-center gap-1 text-xs text-text-muted hover:text-cyan-400 transition-colors">
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
                    className={`w-8 h-8 rounded text-sm ${reviewPage === p ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
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
