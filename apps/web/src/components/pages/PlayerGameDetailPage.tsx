'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { gameService } from '@/services/gameService'
import playerService, { Review } from '@/services/playerService'
import LevelBadge from '@/components/LevelBadge'
import GracRatingBadge from '@/components/GracRatingBadge'

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
  const [shopMenuOpen, setShopMenuOpen] = useState(false)
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<{ _id: string; amount: number; status: string; createdAt: string; metadata?: { itemName?: string; gameName?: string }; gameId?: { _id?: string; title?: string; thumbnail?: string; shopCurrencyName?: string; shopCurrencyIconUrl?: string } }[]>([])
  const [currencyHistoryOpen, setCurrencyHistoryOpen] = useState(false)
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false)

  const loadPaymentHistory = useCallback(async () => {
    setPaymentHistoryLoading(true)
    try {
      const res = await (await import('@/services/api')).default.get('/payments/history')
      setPaymentHistory(res.data.payments ?? [])
    } catch { /* ignore */ }
    finally { setPaymentHistoryLoading(false) }
  }, [])
  const shopMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!shopMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (shopMenuRef.current && !shopMenuRef.current.contains(e.target as Node)) {
        setShopMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [shopMenuOpen])

  const [game, setGame] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'play' | 'reviews' | 'shop' | 'challenge'>('overview')
  const [scrollToPlay, setScrollToPlay] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)

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

  // 스크린샷
  const [screenshots, setScreenshots] = useState<{ _id: string; title: string; url: string; order: number }[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // 상점 서브탭
  const [shopSubTab, setShopSubTab] = useState<'currency' | 'challenge'>('currency')

  // 상점
  const [shopItems, setShopItems] = useState<{
    _id: string; name: string; description: string; imageUrl: string
    price: number; currency: string; currencyType: string
    currencyAmount: number; bonusAmount: number; isSpecial?: boolean; active: boolean; sortOrder: number
  }[]>([])
  const [shopLoading, setShopLoading] = useState(false)

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

  const loadScreenshots = useCallback(async () => {
    if (!id) return
    try {
      const data = await gameService.getGameMedia(id, 'screenshot')
      setScreenshots(data.media || [])
    } catch { /* ignore */ }
  }, [id])

  useEffect(() => { loadGame() }, [loadGame])
  useEffect(() => { loadReviews() }, [loadReviews])
  useEffect(() => { loadMyReview() }, [loadMyReview])
  useEffect(() => { checkFavorite() }, [checkFavorite])
  useEffect(() => { loadQAs() }, [loadQAs])
  useEffect(() => { loadScreenshots() }, [loadScreenshots])

  const loadShopItems = useCallback(async () => {
    if (!id) return
    setShopLoading(true)
    try {
      const data = await gameService.getGameShopItems(id)
      setShopItems((data.items || []).filter((i: { active: boolean }) => i.active))
    } catch { /* ignore */ } finally {
      setShopLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (activeTab === 'shop') loadShopItems()
  }, [activeTab, loadShopItems])

  useEffect(() => {
    if (scrollToPlay && activeTab === 'play') {
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth' })
      setScrollToPlay(false)
    }
  }, [scrollToPlay, activeTab])

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
  const rawBanner = game?.bannerImage as string | undefined
  const toUploadUrl = (raw: string) =>
    raw.startsWith('http') ? raw
    : raw.startsWith('/uploads/') ? raw
    : `/uploads/thumbnails/${raw.split('/').pop()}`
  const thumbUrl = rawThumb
    ? toUploadUrl(rawThumb)
    : GENRE_IMG[(game?.genre as string) || ''] || GENRE_IMG.default
  const bannerUrl = rawBanner
    ? (rawBanner.startsWith('http') ? rawBanner : rawBanner.startsWith('/uploads/') ? rawBanner : `/uploads/banners/${rawBanner.split('/').pop()}`)
    : thumbUrl
  const gameFileUrl = game?.gameFile ? `/${(game.gameFile as string)}` : null
  const rawDomain = (game?.gameDomain as string) || null
  const gameDomainUrl = rawDomain
    ? `${rawDomain}${rawDomain.includes('?') ? '&' : '?'}gameup_return=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`
    : null
  const monetization = (game?.monetization as string) || 'free'
  const gamePrice = (game?.price as number) || 0

  const TABS = [
    { key: 'overview',  label: '게임 소개' },
    { key: 'play',      label: '게임 플레이' },
    { key: 'shop',      label: '상점' },
    { key: 'challenge', label: '챌린지' },
    { key: 'reviews',   label: `리뷰 (${reviewTotal})` }
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

  const lightboxShots = screenshots.filter(s => s.url)

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-3xl leading-none"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white/60 hover:text-white text-4xl leading-none px-2"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >
              ‹
            </button>
          )}
          <img
            src={lightboxShots[lightboxIndex]?.url}
            alt={lightboxShots[lightboxIndex]?.title}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {lightboxIndex < lightboxShots.length - 1 && (
            <button
              className="absolute right-4 text-white/60 hover:text-white text-4xl leading-none px-2"
              onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >
              ›
            </button>
          )}
          <div className="absolute bottom-4 text-white/40 text-sm">
            {lightboxIndex + 1} / {lightboxShots.length}
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <Image src={bannerUrl} alt={game.title as string} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        {/* 중앙 텍스트 */}
        <div className="absolute inset-x-0 max-w-7xl mx-auto px-6" style={{ top: '70%', transform: 'translateY(-50%)' }}>
          <div>
            <h1 className="font-bold text-white drop-shadow-lg" style={{ fontSize: '58px' }}>{game.title as string}</h1>
            <p className="text-white/60 text-sm mt-1.5">{game.genre as string || '기타'}</p>
            <div className="flex items-center mt-1.5">
              <div className="flex items-center gap-1">
                <StarRating value={Math.round(avgRating)} />
                <span className="text-yellow-400 font-bold ml-1">{avgRating.toFixed(1)}</span>
                <span className="text-white/50 text-sm">({reviewTotal}개 리뷰)</span>
              </div>
              <div className="flex-1 flex justify-center pr-[20%]">
                {game.status !== 'archived' && (
                  <button
                    onClick={() => { setActiveTab('play'); setScrollToPlay(true) }}
                    className="px-[52px] py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-900/50" style={{ fontSize: '23px' }}
                  >
                    게임 시작
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* 즐겨찾기 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
          <div className="max-w-7xl mx-auto flex justify-end">
            <button
              onClick={handleFavorite}
              style={{ pointerEvents: 'auto' }}
              disabled={favLoading}
              className={`p-2 rounded-lg border transition-all ${
                isFavorited
                  ? 'bg-pink-900/20 border-pink-700/30 hover:bg-pink-900/30'
                  : 'bg-black/20 border-white/10 hover:border-white/20'
              }`}
            >
              <svg viewBox="0 0 24 24" className={`w-5 h-5 ${isFavorited ? 'fill-pink-400/70 stroke-pink-400/70' : 'fill-none stroke-white/40'}`} strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line bg-bg-primary/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
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

      <div ref={tabContentRef} className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── 게임 소개 탭 ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CTA 버튼 - 전체 너비 */}
            {monetization === 'paid' && gamePrice > 0 && (
              <div className="lg:col-span-3 flex justify-center">
                <button
                  onClick={() => handlePurchase(`${game.title as string} 정식 구매`, gamePrice)}
                  className="w-[50%] bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-text-primary py-3.5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-yellow-900/30"
                >
                  💰 ₩{gamePrice.toLocaleString()} 구매하기
                </button>
              </div>
            )}

            {/* 스크린샷 갤러리 - 전체 너비 */}
            <div className="lg:col-span-3 bg-bg-secondary border border-line rounded-xl overflow-hidden">
              {screenshots.length === 0 ? (
                <div className="p-5">
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-video rounded-lg bg-bg-tertiary/50 border border-line/40 flex flex-col items-center justify-center gap-1.5"
                      >
                        <span className="text-2xl opacity-30">🖼️</span>
                        <span className="text-text-muted text-xs opacity-60">스크린샷 없음</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className="p-5 overflow-x-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridAutoFlow: 'column',
                      gridAutoColumns: 'calc((100% - 24px) / 3)',
                      gap: '12px',
                    }}
                  >
                    {screenshots.map((shot, i) => (
                      <div
                        key={shot._id || i}
                        className="rounded-lg overflow-hidden bg-bg-tertiary border border-line/50 group cursor-pointer"
                        style={{ aspectRatio: '16/10' }}
                        onClick={() => shot.url && setLightboxIndex(i)}
                      >
                        {shot.url ? (
                          <img
                            src={shot.url}
                            alt={shot.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-text-muted">
                            <span className="text-2xl">🖼️</span>
                            <span className="text-xs">{shot.title}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 게임 설명 */}
            <div className="lg:col-span-2 bg-bg-secondary border border-line rounded-xl p-6">
              <p className="text-text-primary font-bold mb-3" style={{ fontSize: '30px' }}>게임 설명</p>
              <p className="text-text-secondary leading-relaxed">{game.notes as string}</p>
            </div>

            <div className="space-y-4">
              {/* 개발사 정보 */}
              {game.developerId != null && typeof game.developerId === 'object' ? (
                <div className="bg-bg-secondary border border-line rounded-xl p-5">
                  <p className="text-text-primary font-semibold mb-3" style={{ fontSize: '30px' }}>개발사 정보</p>
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

              {/* 게임 정보 */}
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <p className="text-text-primary font-semibold mb-4" style={{ fontSize: '30px' }}>게임 정보</p>
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
                  {(() => {
                    const cert = (game as any).ratingCertificate
                    if (!cert?.ratingClass || !cert?.isVerified) return null
                    return (
                      <div className="flex justify-between items-center">
                        <dt className="text-text-secondary">등급</dt>
                        <dd>
                          <GracRatingBadge ratingClass={cert.ratingClass} size="sm" />
                        </dd>
                      </div>
                    )
                  })()}
                </dl>
              </div>

              {/* 별점 분포 */}
              <div className="bg-bg-secondary border border-line rounded-xl p-5">
                <p className="text-text-primary font-semibold mb-3" style={{ fontSize: '30px' }}>별점 분포</p>
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
            </div>

            {/* Q&A 섹션 */}
            <div className="lg:col-span-3">
              <div className="bg-bg-secondary border border-line rounded-xl p-6">
                <p className="text-text-primary font-bold mb-4" style={{ fontSize: '30px' }}>개발사 Q&A</p>

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
            ) : gameDomainUrl ? (
              <div className="space-y-3">
                <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center space-y-4">
                  <button
                    onClick={() => {
                      const win = window.open(gameDomainUrl, '_blank', 'noopener,noreferrer')
                      if (!win) {
                        window.location.href = gameDomainUrl
                      }
                      handlePlay().catch(() => {})
                    }}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-text-primary px-8 py-3 rounded-xl font-semibold text-lg transition-all"
                  >
                    게임 시작
                  </button>
                  {!!game.description && (
                    <p className="text-text-secondary text-sm">{game.description as string}</p>
                  )}
                </div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                  💡 플레이 후 리뷰를 남겨 개발자에게 피드백을 전달하세요
                </div>
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
                  <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center space-y-4">
                    <button
                      onClick={handlePlay}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-text-primary px-8 py-3 rounded-xl font-semibold text-lg transition-all"
                    >
                      게임 시작
                    </button>
                    {!!game.description && (
                      <p className="text-text-secondary text-sm">{game.description as string}</p>
                    )}
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
                              <LevelBadge level={(review.userId as any)?.level} />
                              {(review.userId as any)?.role === 'developer' && <span className="text-xs text-cyan-400 border border-cyan-500/30 px-1 rounded">개발사</span>}
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
        {/* ── 상점 탭 ── */}
        {activeTab === 'shop' && (
          <div className="space-y-5">
            {/* 서브탭 */}
            <div className="flex items-stretch gap-3">
              <button
                onClick={() => setShopSubTab('currency')}
                className={`flex flex-col items-center gap-1.5 px-10 py-4 rounded-xl border-2 text-sm font-bold transition-all ${shopSubTab === 'currency' ? 'bg-gradient-to-b from-cyan-500 to-cyan-700 border-cyan-400 text-white' : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/60'}`}
              >
                <div className="flex items-center gap-2 text-white" style={{ textShadow: '2px 2px 0px rgba(0,0,0,1)' }}>
                  {game.shopCurrencyIconUrl && (
                    <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${game.shopCurrencyIconUrl as string}`} className="w-6 h-6 object-contain" alt="" />
                  )}
                  <span className="text-lg">{(game.shopCurrencyName as string) || '재화'}</span>
                </div>
                <span className="text-sm font-semibold text-white" style={{ textShadow: '2px 2px 0px rgba(0,0,0,1)' }}>
                  보유 50,000
                </span>
              </button>
              <button
                onClick={() => setShopSubTab('challenge')}
                className={`flex flex-col items-center justify-center px-10 rounded-xl border-2 text-sm font-bold transition-all ${shopSubTab === 'challenge' ? 'bg-gradient-to-b from-cyan-500 to-cyan-700 border-cyan-400 text-white' : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/60'}`}
              >
                <span className="text-lg font-bold text-white drop-shadow-none" style={{ textShadow: '3px 3px 0px rgba(0,0,0,1)', WebkitTextStroke: '0.5px rgba(0,0,0,0.3)' }}>챌린지 보상</span>
              </button>
              <div className="ml-auto relative" ref={shopMenuRef}>
                <button
                  onClick={() => setShopMenuOpen(v => !v)}
                  className="flex flex-col items-center justify-center gap-1.5 w-11 h-11 rounded-xl border-2 bg-white border-black hover:bg-gray-100 transition-all"
                >
                  <span className="block w-5 h-0.5 bg-black"></span>
                  <span className="block w-5 h-0.5 bg-black"></span>
                  <span className="block w-5 h-0.5 bg-black"></span>
                </button>
                {shopMenuOpen && (
                  <div className="absolute right-0 top-13 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="px-5 py-4 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-800">{_user?.email || '-'}</span>
                    </div>
                    {/* 메뉴 항목 */}
                    <button onClick={() => { setShopMenuOpen(false); setPaymentHistoryOpen(true); loadPaymentHistory() }} className="w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors">결제내역</button>
                    <button onClick={() => { setShopMenuOpen(false); setCurrencyHistoryOpen(true); loadPaymentHistory() }} className="w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors">재화내역</button>
<button className="w-full text-left px-5 py-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors">1대1 문의</button>
                  </div>
                )}
              </div>
            </div>

            {/* 챌린지 보상 */}
            {shopSubTab === 'challenge' && (
              <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
                <p className="text-text-secondary text-sm">챌린지 보상 기능은 준비 중입니다</p>
              </div>
            )}

            {/* 상품 목록 */}
            {shopSubTab === 'currency' && (shopLoading ? (
              <div className="text-center py-12 text-text-secondary text-sm">불러오는 중...</div>
            ) : shopItems.length === 0 ? (
              <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
                <p className="text-text-secondary text-sm">등록된 상품이 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {shopItems.map((item) => {
                  const currencySymbol = item.currency === 'KRW' ? '₩' : item.currency === 'USD' ? '$' : '€'
                  const amountLabel = item.bonusAmount > 0
                    ? `${item.currencyAmount.toLocaleString()}+${item.bonusAmount.toLocaleString()} Bonus`
                    : item.currencyAmount.toLocaleString()
                  return (
                    <div key={item._id} className="bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                      <div className="px-4 pt-4 pb-1 text-center">
                        <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                      </div>
                      <div className="relative flex items-center justify-center pt-4 pb-2 bg-bg-tertiary/30 mx-4 rounded-lg">
                        {item.imageUrl ? (
                          <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${item.imageUrl}`} alt={item.name} className="h-24 object-contain" />
                        ) : (
                          <div className="h-24 w-24 bg-bg-tertiary rounded-lg flex items-center justify-center text-text-muted text-3xl">💎</div>
                        )}
                        {item.isSpecial && (
                          <span className="absolute bottom-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">HOT!</span>
                        )}
                      </div>
                      <div className="px-4 pt-2 pb-1 flex items-center justify-center gap-1.5">
                        {game.shopCurrencyIconUrl && (
                          <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${game.shopCurrencyIconUrl as string}`} className="w-4 h-4 object-contain" alt="" />
                        )}
                        <p className="text-sm font-medium text-text-primary">{amountLabel}</p>
                      </div>
                      <div className="p-4 mt-auto">
                        <button
                          onClick={() => handlePurchase(item.name, item.price)}
                          className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-lg transition-colors text-sm"
                        >
                          {currencySymbol}{item.price.toLocaleString()}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── 챌린지 탭 ── */}
        {activeTab === 'challenge' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
            <p className="text-text-secondary">챌린지 기능은 준비 중입니다</p>
          </div>
        )}
      </div>

      {/* ── 결제내역 모달 ── */}
      {paymentHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">결제내역</h2>
              <button onClick={() => setPaymentHistoryOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {paymentHistoryLoading ? (
                <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">결제 내역이 없습니다</div>
              ) : (
                <>
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">총 결제금액</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₩{paymentHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                  {paymentHistory.map(p => (
                    <li key={p._id} className="px-6 py-4 flex items-center gap-3">
                      {p.gameId?.thumbnail ? (
                        <img
                          src={p.gameId.thumbnail.startsWith('http') ? p.gameId.thumbnail : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${p.gameId.thumbnail}`}
                          alt={p.gameId.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">{p.gameId?.title || p.metadata?.gameName || '-'}</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.metadata?.itemName || '-'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">₩{p.amount.toLocaleString()}</p>
                        <p className={`text-xs mt-0.5 ${p.status === 'completed' ? 'text-green-500' : p.status === 'failed' ? 'text-red-400' : 'text-gray-400'}`}>
                          {p.status === 'completed' ? '결제완료' : p.status === 'failed' ? '실패' : '처리중'}
                        </p>
                      </div>
                    </li>
                  ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 재화내역 모달 ── */}
      {currencyHistoryOpen && (() => {
        const gameMap = new Map<string, { title: string; thumbnail?: string; shopCurrencyName?: string; shopCurrencyIconUrl?: string }>()
        paymentHistory.forEach(p => {
          if (p.gameId?._id && !gameMap.has(p.gameId._id)) {
            gameMap.set(p.gameId._id, {
              title: p.gameId.title ?? p.metadata?.gameName ?? '-',
              thumbnail: p.gameId.thumbnail,
              shopCurrencyName: p.gameId.shopCurrencyName,
              shopCurrencyIconUrl: p.gameId.shopCurrencyIconUrl,
            })
          }
        })
        const games = Array.from(gameMap.values())
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900">재화내역</h2>
                <button onClick={() => setCurrencyHistoryOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
              </div>
              <div className="overflow-y-auto max-h-[60vh]">
                {paymentHistoryLoading ? (
                  <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
                ) : games.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">보유 재화 내역이 없습니다</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {games.map((g, i) => (
                      <li key={i} className="px-6 py-4 flex items-center gap-3">
                        {g.thumbnail ? (
                          <img
                            src={g.thumbnail.startsWith('http') ? g.thumbnail : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${g.thumbnail}`}
                            alt={g.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{g.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {g.shopCurrencyIconUrl && (
                              <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${g.shopCurrencyIconUrl}`} className="w-3.5 h-3.5 object-contain" alt="" />
                            )}
                            <p className="text-xs text-gray-400">{g.shopCurrencyName || '재화'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">-</p>
                          <p className="text-xs text-gray-400 mt-0.5">보유량</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
