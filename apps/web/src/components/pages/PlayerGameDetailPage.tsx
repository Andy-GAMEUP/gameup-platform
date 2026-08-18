'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/useAuth'
import { gameService } from '@/services/gameService'
import playerService, { Review } from '@/services/playerService'
import apiClient from '@/services/api'
import LevelBadge from '@/components/LevelBadge'
import OfficialBadge from '@/components/OfficialBadge'
import AdminBadge from '@/components/AdminBadge'
import GracRatingBadge from '@/components/GracRatingBadge'
import ConfirmModal from '@/components/ConfirmModal'

interface GameQA {
  _id: string
  gameId: string
  userId: { _id: string; username: string; profileImage?: string }
  developerId: { _id: string; username: string; profileImage?: string }
  question: string
  answer?: string
  answeredAt?: string
  createdAt: string
}
import TossPaymentModal from '@/components/TossPaymentModal'
import { formatDate } from '@/lib/formatDate'

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''
const toAbsUrl = (raw: string) => raw.startsWith('http') ? raw : `${UPLOADS_URL}${raw}`

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
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'shop' | 'challenge'>('overview')
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
  const [showDeleteReviewConfirm, setShowDeleteReviewConfirm] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playStartTime, setPlayStartTime] = useState<number | null>(null)

  // Q&A
  const [qas, setQAs] = useState<GameQA[]>([])
  const [qaTotal, setQATotal] = useState(0)
  const [qaPage, setQAPage] = useState(1)
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaSubmitting, setQaSubmitting] = useState(false)

  // 스크린샷 & 동영상
  const [screenshots, setScreenshots] = useState<{ _id: string; title: string; url: string; order: number }[]>([])
  const [videos, setVideos] = useState<{ _id: string; title: string; url: string; order: number }[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [selectedShotIdx, setSelectedShotIdx] = useState(0)

  // 상점 서브탭
  const [shopSubTab, setShopSubTab] = useState<'currency' | 'challenge'>('currency')

  // 상점
  const [shopItems, setShopItems] = useState<{
    _id: string; name: string; description: string; imageUrl: string
    price: number; currency: string; currencyType: string; currencyId?: string
    currencyAmount: number; bonusAmount: number; isSpecial?: boolean; specialImageUrl?: string; active: boolean; sortOrder: number
  }[]>([])
  const [shopLoading, setShopLoading] = useState(false)
  type SpecialItem = {
    _id: string; name: string; price: number; currency: string
    currencyAmount: number; bonusAmount: number; specialImageUrl?: string; imageUrl: string; stock?: string
  }
  const [specialPopupItem, setSpecialPopupItem] = useState<SpecialItem | null>(null)
  const [savedSpecialItem, setSavedSpecialItem] = useState<SpecialItem | null>(null)

  // ── 결제 모달 상태 ────────────────────────────────────────────
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean
    itemName: string
    amount: number
  }>({ open: false, itemName: '', amount: 0 })

  type CapcoinModalItem = typeof shopItems[number] & { currencyName?: string; currencyIconUrl?: string }
  const [capcoinModal, setCapcoinModal] = useState<{
    open: boolean
    item: CapcoinModalItem | null
    qty: number
    gameUserId: string
    userPoints: number | null
    purchasing: boolean
    purchaseError: string
    purchaseSuccess: boolean
  }>({ open: false, item: null, qty: 1, gameUserId: '', userPoints: null, purchasing: false, purchaseError: '', purchaseSuccess: false })


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
      const [ssData, vidData] = await Promise.all([
        gameService.getGameMedia(id, 'screenshot'),
        gameService.getGameMedia(id, 'video'),
      ])
      setScreenshots((ssData.media || []).slice().sort((a: { order: number }, b: { order: number }) => a.order - b.order))
      setVideos((vidData.media || []).slice().sort((a: { order: number }, b: { order: number }) => a.order - b.order))
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
      const data = await gameService.getPublicShopItems(id)
      const activeItems = (data.items || []).filter((i: { active: boolean }) => i.active)
      const special = activeItems.find((i: { isSpecial?: boolean }) => i.isSpecial)
      const nonSpecial = activeItems.filter((i: { isSpecial?: boolean }) => !i.isSpecial)
      setShopItems(nonSpecial)
      if (special) { setSpecialPopupItem(special); setSavedSpecialItem(special) }
      const hasCash = nonSpecial.some((i: { paymentType?: string }) => i.paymentType !== 'capcoin')
      const hasCapcoin = nonSpecial.some((i: { paymentType?: string }) => i.paymentType === 'capcoin')
      if (!hasCash && hasCapcoin) setShopSubTab('challenge')
      else setShopSubTab('currency')
    } catch { /* ignore */ } finally {
      setShopLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (activeTab === 'shop') loadShopItems()
  }, [activeTab, loadShopItems])

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

  const handleCapcoinPurchase = async (item: typeof shopItems[number], currencyName: string, currencyIconUrl: string) => {
    if (!isAuthenticated) { router.push('/login'); return }
    setCapcoinModal({ open: true, item: { ...item, currencyName, currencyIconUrl }, qty: 1, gameUserId: '', userPoints: null, purchasing: false, purchaseError: '', purchaseSuccess: false })
    try {
      const { data } = await apiClient.get('/profile')
      setCapcoinModal(prev => ({ ...prev, userPoints: data.points ?? 0 }))
    } catch { /* ignore */ }
  }

  const submitCapcoinPurchase = async () => {
    if (!capcoinModal.item || !id) return
    setCapcoinModal(prev => ({ ...prev, purchasing: true, purchaseError: '' }))
    try {
      const result = await gameService.purchaseShopItemWithCapcoin(id, capcoinModal.item._id, capcoinModal.gameUserId, capcoinModal.qty)
      setCapcoinModal(prev => ({ ...prev, purchasing: false, purchaseSuccess: true, userPoints: result.newBalance }))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '구매에 실패했습니다'
      setCapcoinModal(prev => ({ ...prev, purchasing: false, purchaseError: msg }))
    }
  }

const avgRating = game ? (game.rating as number) || 0 : 0
  const totalReviewCount = Object.values(ratingDist).reduce((a, b) => a + b, 0)
  const rawThumb = game?.thumbnail as string | undefined
  const rawBanner = game?.bannerImage as string | undefined
  const thumbUrl = rawThumb
    ? toAbsUrl(rawThumb)
    : GENRE_IMG[(game?.genre as string) || ''] || GENRE_IMG.default
  const bannerUrl = rawBanner ? toAbsUrl(rawBanner) : thumbUrl
  const gameFileUrl = game?.gameFile ? `/${(game.gameFile as string)}` : null
  const rawDomain = (game?.gameDomain as string) || null
  const gameDomainUrl = rawDomain
    ? `${rawDomain}${rawDomain.includes('?') ? '&' : '?'}gameup_return=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`
    : null
  const monetization = (game?.monetization as string) || 'free'
  const gamePrice = (game?.price as number) || 0

  const TABS = [
    { key: 'overview',  label: '게임 소개' },
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
            className="absolute top-4 right-4 text-white/60 hover:text-white text-base leading-none"
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
            src={lightboxShots[lightboxIndex]?.url ? toAbsUrl(lightboxShots[lightboxIndex].url) : ''}
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
                {game.status !== 'archived' && (gameDomainUrl || gameFileUrl) && (
                  <button
                    onClick={() => {
                      const url = gameDomainUrl || (gameFileUrl ? `${typeof window !== 'undefined' ? window.location.origin : ''}${gameFileUrl}` : null)
                      if (url) window.open(url, '_blank', 'noopener,noreferrer')
                      handlePlay().catch(() => {})
                    }}
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
                className={`px-5 py-3 text-base font-medium border-b-2 transition-colors ${
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
          <div className="grid grid-cols-1 lg:grid-cols-[11fr_4fr] gap-6">
            {/* CTA 버튼 - 전체 너비 */}
            {monetization === 'paid' && gamePrice > 0 && (
              <div className="lg:col-span-2 flex justify-center">
                <button
                  onClick={() => handlePurchase(`${game.title as string} 정식 구매`, gamePrice)}
                  className="w-[50%] bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-text-primary py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg shadow-yellow-900/30"
                >
                  💰 ₩{gamePrice.toLocaleString()} 구매하기
                </button>
              </div>
            )}

            {/* 스크린샷 + 게임설명 (왼쪽 컬럼) */}
            {(() => {
              const videoEntries = videos.map(v => ({ kind: 'video' as const, _id: v._id, title: v.title, url: v.url }))
              const shotEntries = screenshots.filter(s => s.url).map(s => ({ kind: 'screenshot' as const, _id: s._id, title: s.title, url: s.url }))
              const mediaList = [...videoEntries, ...shotEntries]
              const selected = mediaList[selectedShotIdx]
              const UPLOADS_BASE = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''
              return (
            <div className="space-y-6">
            <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
              {mediaList.length === 0 ? (
                <div className="p-5">
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-video rounded-lg bg-bg-tertiary/50 border border-line/40 flex flex-col items-center justify-center gap-1.5">
                        <span className="text-2xl opacity-30">🖼️</span>
                        <span className="text-text-muted text-xs opacity-60">스크린샷 없음</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-5 flex gap-4 h-[437px]">
                  {/* 왼쪽: 메인 뷰 */}
                  <div className="flex-1 rounded-xl overflow-hidden bg-bg-tertiary border border-line/50">
                    {selected?.kind === 'video' ? (
                      <video
                        key={selected.url}
                        src={`${UPLOADS_BASE}${selected.url}`}
                        className="w-full h-full object-contain bg-black"
                        autoPlay
                        controls
                        playsInline
                      />
                    ) : selected?.url ? (
                      <img
                        src={toAbsUrl(selected.url)}
                        alt={selected.title}
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => {
                          const shotIdx = shotEntries.findIndex(s => s._id === selected._id)
                          if (shotIdx >= 0) setLightboxIndex(shotIdx)
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <span className="text-4xl opacity-30">🖼️</span>
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 썸네일 리스트 */}
                  <div
                    className="w-[186px] flex flex-col gap-2 overflow-y-auto flex-shrink-0"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
                  >
                    {mediaList.map((item, i) => (
                      <div
                        key={item._id || i}
                        className={`flex-shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-150 relative ${
                          i === selectedShotIdx
                            ? 'border-accent shadow-sm shadow-accent/30'
                            : 'border-transparent hover:border-line'
                        }`}
                        style={{ aspectRatio: '16/9' }}
                        onClick={() => setSelectedShotIdx(i)}
                      >
                        {item.kind === 'video' ? (
                          <>
                            <video src={`${UPLOADS_BASE}${item.url}`} className="w-full h-full object-cover" muted preload="metadata" onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 1 }} />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              </div>
                            </div>
                          </>
                        ) : item.url ? (
                          <img src={toAbsUrl(item.url)} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
                            <span className="text-text-muted text-xs">🖼️</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 게임 설명 */}
            <div className="bg-bg-secondary border border-line rounded-xl p-6 min-h-[500px]">
              <p className="text-text-primary font-bold mb-3" style={{ fontSize: '30px' }}>게임 설명</p>
              <p className="text-text-secondary leading-relaxed">{game.notes as string}</p>
            </div>
            </div>
              )
            })()}

            <div className="space-y-4">
              {/* 개발사 정보 */}
              {game.developerId != null && typeof game.developerId === 'object' ? (
                <div className="bg-bg-secondary border border-line rounded-xl p-5">
                  <p className="text-text-primary font-semibold mb-3" style={{ fontSize: '30px' }}>개발사 정보</p>
                  <div className="flex items-center gap-3 mb-3">
                    {(game.developerId as any).profileImage ? (
                      <img src={toAbsUrl((game.developerId as any).profileImage)} alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-text-primary font-bold">
                        {((game.developerId as any).username || '?')[0].toUpperCase()}
                      </div>
                    )}
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
            <div className="lg:col-span-2">
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
                        className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary text-base px-5 py-2 rounded-lg font-medium transition-colors"
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
                            {qa.userId?.profileImage ? (
                              <img src={toAbsUrl(qa.userId.profileImage)} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-text-inverse">
                                {(qa.userId?.username || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-text-primary text-sm font-medium">{qa.userId?.username || '익명'}</span>
                            <span className="text-text-muted text-xs">{formatDate(qa.createdAt)}</span>
                          </div>
                          <p className="text-text-secondary text-sm">{qa.question}</p>
                        </div>
                        {qa.answer ? (
                          <div className="bg-cyan-900/10 border-t border-cyan-500/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {qa.developerId?.profileImage ? (
                                <img src={toAbsUrl(qa.developerId.profileImage)} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-text-primary">
                                  {(qa.developerId?.username || 'D')[0].toUpperCase()}
                                </div>
                              )}
                              <span className="text-cyan-400 text-sm font-medium">{qa.developerId?.username || '개발사'}</span>
                              <OfficialBadge />
                              {qa.answeredAt && <span className="text-text-muted text-xs">{formatDate(qa.answeredAt)}</span>}
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
                        className={`w-8 h-8 rounded text-base ${qaPage === p ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                        <button onClick={() => setShowReviewForm(true)} className="text-base bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded hover:bg-blue-600/40 transition-colors">수정</button>
                        <button onClick={() => setShowDeleteReviewConfirm(true)} className="text-base bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded hover:bg-red-600/40 transition-colors">삭제</button>
                      </>
                    )}
                    {!myReview && !showReviewForm && (
                      <button onClick={() => setShowReviewForm(true)} className="text-base bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-600/40 transition-colors">+ 리뷰 작성</button>
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
                      <button onClick={handleReviewSubmit} disabled={reviewSubmitting} className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-text-primary py-2 rounded font-medium text-base transition-colors">
                        {reviewSubmitting ? '등록 중...' : myReview ? '수정 완료' : '리뷰 등록'}
                      </button>
                      <button onClick={() => { setShowReviewForm(false); setReviewError('') }} className="flex-1 border border-line text-text-secondary hover:text-text-primary py-2 rounded text-base transition-colors">취소</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                {[['', '전체'], ['general', '일반'], ['praise', '칭찬'], ['suggestion', '제안'], ['bug', '버그']].map(([val, label]) => (
                  <button key={val} onClick={() => { setReviewFilter(val); setReviewPage(1) }}
                    className={`px-3 py-1 rounded text-base font-medium transition-colors ${reviewFilter === val ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                {[['recent', '최신순'], ['helpful', '도움순']].map(([val, label]) => (
                  <button key={val} onClick={() => setReviewSort(val as 'recent' | 'helpful')}
                    className={`px-3 py-1 rounded text-base transition-colors ${reviewSort === val ? 'text-cyan-400' : 'text-text-muted hover:text-text-secondary'}`}>
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
                          {review.userId?.profileImage ? (
                            <img src={toAbsUrl(review.userId.profileImage)} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-sm font-bold text-text-inverse">
                              {(review.userId?.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-text-primary text-sm font-medium">{review.userId?.username || '익명'}</span>
                              {review.userId?.role === 'developer' ? <OfficialBadge /> : review.userId?.role === 'admin' ? <AdminBadge /> : <LevelBadge level={review.userId?.level} size="xs" />}
                              {review.isVerifiedTester && <span className="text-xs text-cyan-400 border border-cyan-500/30 px-1 rounded">인증 테스터</span>}
                            </div>
                            <p className="text-text-muted text-xs">{formatDate(review.createdAt)}</p>
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
                        <button onClick={() => handleHelpful(review._id)} className="flex items-center gap-1 text-base text-text-muted hover:text-cyan-400 transition-colors">
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
                    className={`w-8 h-8 rounded text-base ${reviewPage === p ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ── 특별 상품 플로팅 버튼 ── */}
        {activeTab === 'shop' && savedSpecialItem && !specialPopupItem && (
          <button
            onClick={() => setSpecialPopupItem(savedSpecialItem)}
            className="fixed bottom-8 right-8 z-40 w-20 h-20 rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            {savedSpecialItem.specialImageUrl || savedSpecialItem.imageUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${savedSpecialItem.specialImageUrl || savedSpecialItem.imageUrl}`}
                alt="특별 상품"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(160deg, #f97316 0%, #dc2626 100%)' }}>🎁</div>
            )}
            <div className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white" style={{ background: 'rgba(0,0,0,0.55)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              특별 상품
            </div>
          </button>
        )}

        {/* ── 상점 탭 ── */}
        {activeTab === 'shop' && (
          <div className="relative space-y-5">
            {/* 서브탭 */}
            {(() => {
              const hasCashTab = shopItems.some(i => (i as { paymentType?: string }).paymentType !== 'capcoin')
              const hasCapcoinTab = shopItems.some(i => (i as { paymentType?: string }).paymentType === 'capcoin')
              return (
            <div className="flex items-stretch gap-3">
              {hasCashTab && (
              <button
                onClick={() => setShopSubTab('currency')}
                className={`flex flex-col items-center gap-1.5 px-10 py-4 rounded-xl border-2 text-base font-bold transition-all ${shopSubTab === 'currency' ? 'bg-gradient-to-b from-cyan-500 to-cyan-700 border-cyan-400 text-white' : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/60'}`}
              >
                <div className="flex items-center gap-2 text-white" style={{ textShadow: '2px 2px 0px rgba(0,0,0,1)' }}>
                  {!!game.shopCurrencyIconUrl && (
                    <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${game.shopCurrencyIconUrl as string}`} className="w-6 h-6 object-contain" alt="" />
                  )}
                  <span className="text-lg">{(game.shopCurrencyName as string) || '재화'}</span>
                </div>
                <span className="text-sm font-semibold text-white" style={{ textShadow: '2px 2px 0px rgba(0,0,0,1)' }}>
                  보유 50,000
                </span>
              </button>
              )}
              {hasCapcoinTab && (
              <button
                onClick={() => setShopSubTab('challenge')}
                className={`flex flex-col items-center justify-center px-10 rounded-xl border-2 text-base font-bold transition-all ${shopSubTab === 'challenge' ? 'bg-gradient-to-b from-cyan-500 to-cyan-700 border-cyan-400 text-white' : 'bg-zinc-800/40 border-zinc-700/40 hover:bg-zinc-800/60 hover:border-zinc-600/60'}`}
              >
                <span className="text-lg font-bold text-white drop-shadow-none" style={{ textShadow: '3px 3px 0px rgba(0,0,0,1)', WebkitTextStroke: '0.5px rgba(0,0,0,0.3)' }}>챌린지 보상</span>
              </button>
              )}
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
                    <button onClick={() => { setShopMenuOpen(false); setPaymentHistoryOpen(true); loadPaymentHistory() }} className="w-full text-left px-5 py-4 text-base text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors">결제내역</button>
                    <button onClick={() => { setShopMenuOpen(false); setCurrencyHistoryOpen(true); loadPaymentHistory() }} className="w-full text-left px-5 py-4 text-base text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors">재화내역</button>
<button className="w-full text-left px-5 py-4 text-base text-gray-700 hover:bg-gray-50 transition-colors">1대1 문의</button>
                  </div>
                )}
              </div>
            </div>
              )
            })()}

            {/* 챌린지 보상 */}
            {shopSubTab === 'challenge' && (() => {
              const UPLOADS_BASE = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''

              const capcoinItems = shopItems.filter(item => (item as { paymentType?: string }).paymentType === 'capcoin')

              if (capcoinItems.length === 0) {
                return (
                  <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
                    <p className="text-text-secondary text-sm">챌린지 보상 기능은 준비 중입니다</p>
                  </div>
                )
              }
              return (
                <div className="grid grid-cols-4 gap-4">
                  {capcoinItems.map(item => {
                    const rewardIconUrl = (item as { currencyIconUrl?: string }).currencyIconUrl ?? ''
                    const rewardName = (item as { currencyName?: string }).currencyName ?? ''
                    const capcoinIconUrl = (item as { capcoinIconUrl?: string }).capcoinIconUrl ?? ''
                    const capcoinName = (item as { capcoinName?: string }).capcoinName ?? ''
                    const capcoinPrice = (item as { capcoinPrice?: number }).capcoinPrice ?? 0
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
                            <img src={`${UPLOADS_BASE}${item.imageUrl}`} alt={item.name} className="h-24 object-contain" />
                          ) : (
                            <div className="h-24 w-24 bg-bg-tertiary rounded-lg flex items-center justify-center text-text-muted text-3xl">💎</div>
                          )}
                          {item.isSpecial && (
                            <span className="absolute bottom-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">HOT!</span>
                          )}
                        </div>
                        <div className="px-4 pt-2 pb-1 flex items-center justify-center gap-1.5">
                          {rewardIconUrl && <img src={`${UPLOADS_BASE}${rewardIconUrl}`} className="w-4 h-4 object-contain" alt="" />}
                          <p className="text-sm font-medium text-text-primary">{amountLabel} {rewardName}</p>
                        </div>
                        <div className="p-4 mt-auto">
                          <button
                            onClick={() => handleCapcoinPurchase(item, capcoinName, capcoinIconUrl)}
                            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-lg transition-colors text-base"
                          >
                            {capcoinIconUrl && <img src={`${UPLOADS_BASE}${capcoinIconUrl}`} className="inline w-4 h-4 object-contain mr-1" alt="" />}
                            {capcoinPrice.toLocaleString()} {capcoinName || '포인트'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* 상품 목록 */}
            {shopSubTab === 'currency' && (() => {
              const cashItems = shopItems.filter(item => (item as { paymentType?: string }).paymentType !== 'capcoin')
              return shopLoading ? (
                <div className="text-center py-12 text-text-secondary text-sm">불러오는 중...</div>
              ) : cashItems.length === 0 ? (
                <div className="bg-bg-secondary border border-line rounded-xl p-12 text-center">
                  <p className="text-text-secondary text-sm">등록된 상품이 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                {cashItems.map((item) => {
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
                        {!!game.shopCurrencyIconUrl && (
                          <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${game.shopCurrencyIconUrl as string}`} className="w-4 h-4 object-contain" alt="" />
                        )}
                        <p className="text-sm font-medium text-text-primary">{amountLabel}</p>
                      </div>
                      <div className="p-4 mt-auto">
                        <button
                          onClick={() => handlePurchase(item.name, item.price)}
                          className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-lg transition-colors text-base"
                        >
                          {currencySymbol}{item.price.toLocaleString()}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              )
            })()}
          </div>
        )}

        {/* ── 챌린지 탭 ── */}
        {activeTab === 'challenge' && (
          <div className="bg-bg-secondary border border-line rounded-xl p-10 text-center">
            <p className="text-text-secondary">챌린지 기능은 준비 중입니다</p>
          </div>
        )}
      </div>

      {/* ── 특별 상품 팝업 ── */}
      {specialPopupItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-[340px] mx-4 rounded-2xl overflow-hidden shadow-2xl bg-white">
            {/* 닫기 */}
            <button
              onClick={() => setSpecialPopupItem(null)}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-500 text-base transition-colors"
            >✕</button>

            {/* 헤더 */}
            <div className="flex items-center justify-center gap-2 pt-5 pb-3 px-6">
              <span className="text-orange-400 text-lg">❖</span>
              <span className="text-gray-900 font-extrabold text-xl tracking-wide">특별 상품</span>
              <span className="text-orange-400 text-lg">❖</span>
            </div>

            {/* 특별 이미지 */}
            <div className="relative flex items-center justify-center px-4 pb-2" style={{ minHeight: 220 }}>
              {(specialPopupItem.specialImageUrl || specialPopupItem.imageUrl) ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${specialPopupItem.specialImageUrl || specialPopupItem.imageUrl}`}
                  alt={specialPopupItem.name}
                  className="w-full object-contain rounded-lg"
                  style={{ maxHeight: 220 }}
                />
              ) : (
                <div className="w-48 h-48 rounded-xl bg-gray-100 flex items-center justify-center text-6xl">🎁</div>
              )}
            </div>

            {/* 상품 정보 */}
            <div className="px-6 pb-2 text-center">
              <p className="text-gray-900 font-bold text-lg leading-tight">{specialPopupItem.name}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {!!game.shopCurrencyIconUrl && (
                  <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${game.shopCurrencyIconUrl as string}`} className="w-4 h-4 object-contain" alt="" />
                )}
                <p className="text-orange-500 text-sm font-semibold">
                  {specialPopupItem.currencyAmount.toLocaleString()}
                  {specialPopupItem.bonusAmount > 0 && <span className="text-gray-500">(+{specialPopupItem.bonusAmount.toLocaleString()})</span>}
                </p>
              </div>
            </div>

            {/* 구매 버튼 */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => { handlePurchase(specialPopupItem.name, specialPopupItem.price); setSpecialPopupItem(null) }}
                className="w-full py-3.5 rounded-xl font-extrabold text-base text-white shadow-lg transition-all active:scale-95"
                style={{ background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)', boxShadow: '0 4px 0 #0369a1' }}
              >
                {specialPopupItem.currency === 'KRW' ? '₩' : specialPopupItem.currency === 'USD' ? '$' : '€'}{specialPopupItem.price.toLocaleString()}
              </button>
              {specialPopupItem.stock !== undefined && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  구매 가능 수량 : {specialPopupItem.stock === '무제한' ? '무제한' : Number(specialPopupItem.stock).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 결제내역 모달 ── */}
      {paymentHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">결제내역</h2>
              <button onClick={() => setPaymentHistoryOpen(false)} className="text-gray-400 hover:text-gray-700 text-base leading-none">✕</button>
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
                <button onClick={() => setCurrencyHistoryOpen(false)} className="text-gray-400 hover:text-gray-700 text-base leading-none">✕</button>
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

      {/* ── 캡코인 구매 모달 ── */}
      {capcoinModal.open && capcoinModal.item && (() => {
        const item = capcoinModal.item!
        const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''
        const totalCost = ((item as { capcoinPrice?: number }).capcoinPrice ?? item.currencyAmount) * capcoinModal.qty
        const remaining = (capcoinModal.userPoints ?? 0) - totalCost
        const insufficient = capcoinModal.userPoints !== null && remaining < 0
        const canPurchase = capcoinModal.gameUserId.trim() !== '' && !insufficient && !capcoinModal.purchaseSuccess

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bg-overlay">
            <div className="bg-bg-secondary w-full max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* 헤더 */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-line flex-shrink-0">
                <button onClick={() => setCapcoinModal(prev => ({ ...prev, open: false }))} className="p-1 rounded-lg hover:bg-bg-tertiary transition-colors">
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="font-bold text-base text-text-primary">상품 결제</h2>
              </div>

              <div className="overflow-y-auto flex-1">
                {/* 상품 정보 */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-line">
                  <div className="w-14 h-14 rounded-lg bg-bg-tertiary flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.imageUrl
                      ? <img src={`${uploadsBase}${item.imageUrl}`} alt={item.name} className="w-full h-full object-contain" />
                      : <span className="text-2xl">💎</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">겜스토어 전용</span>
                      {item.isSpecial && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">HOT</span>}
                    </div>
                    <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                  </div>
                </div>

                {/* 게임 ID */}
                <div className="px-4 py-4 border-b border-line">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-text-primary">게임 ID</p>
                    <button className="text-base text-cyan-400 hover:underline">게임 ID는 어디에있나요?</button>
                  </div>
                  {capcoinModal.purchaseSuccess ? (
                    <div className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary text-sm text-text-secondary">{capcoinModal.gameUserId}</div>
                  ) : (
                    <input
                      type="text"
                      value={capcoinModal.gameUserId}
                      onChange={e => setCapcoinModal(prev => ({ ...prev, gameUserId: e.target.value }))}
                      placeholder="게임 ID를 입력해 주세요."
                      className="w-full px-3 py-2.5 rounded-lg bg-bg-tertiary border border-line text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>

                {/* 구매 수량 */}
                {!capcoinModal.purchaseSuccess && (
                  <div className="px-4 py-4 border-b border-line">
                    <p className="text-sm font-semibold text-text-primary mb-3">구매 수량</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1 border border-line rounded-lg overflow-hidden">
                        <button
                          onClick={() => setCapcoinModal(prev => ({ ...prev, qty: Math.max(1, prev.qty - 1) }))}
                          className="px-4 py-2.5 text-text-secondary hover:bg-bg-tertiary transition-colors text-base"
                        >−</button>
                        <span className="flex-1 text-center text-sm font-semibold text-text-primary py-2.5">{capcoinModal.qty}</span>
                        <button
                          onClick={() => setCapcoinModal(prev => ({ ...prev, qty: prev.qty + 1 }))}
                          className="px-4 py-2.5 text-text-secondary hover:bg-bg-tertiary transition-colors text-base"
                        >+</button>
                      </div>
                      <button
                        onClick={() => {
                          if (capcoinModal.userPoints !== null && item.currencyAmount > 0) {
                            setCapcoinModal(prev => ({ ...prev, qty: Math.floor(capcoinModal.userPoints! / item.currencyAmount) || 1 }))
                          }
                        }}
                        className="px-4 py-2.5 border border-line rounded-lg text-base text-text-secondary hover:bg-bg-tertiary transition-colors"
                      >최대</button>
                    </div>
                  </div>
                )}

                {/* 결제 예정 */}
                <div className="px-4 py-4 border-b border-line">
                  <p className="text-sm font-semibold text-text-primary mb-3">결제 예정</p>
                  <div className="bg-bg-tertiary rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">총 결제 {item.currencyName}</span>
                      <div className="flex items-center gap-1.5">
                        {item.currencyIconUrl && <img src={`${uploadsBase}${item.currencyIconUrl}`} className="w-4 h-4 object-contain" alt="" />}
                        <span className="text-sm font-bold text-text-primary">{totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">• 보유</span>
                      <div className="flex items-center gap-1.5">
                        {item.currencyIconUrl && <img src={`${uploadsBase}${item.currencyIconUrl}`} className="w-4 h-4 object-contain" alt="" />}
                        <span className="text-sm text-text-secondary">
                          {capcoinModal.userPoints === null ? '...' : capcoinModal.userPoints.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">• 잔여</span>
                      <div className="flex items-center gap-1.5">
                        {item.currencyIconUrl && <img src={`${uploadsBase}${item.currencyIconUrl}`} className="w-4 h-4 object-contain" alt="" />}
                        <span className={`text-sm font-medium ${insufficient ? 'text-red-400' : 'text-text-secondary'}`}>
                          {capcoinModal.userPoints === null ? '...' : remaining.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 청약 철회 */}
                <div className="px-4 py-4 mx-4 my-3 bg-bg-tertiary/50 rounded-xl text-xs text-text-muted space-y-1.5 border border-line">
                  <p className="font-semibold text-text-secondary flex items-center gap-1">ⓘ 청약 철회</p>
                  <p>상품 구매 시, 입력한 게임 ID의 우편함으로 상품이 즉시 지급됩니다.</p>
                  <p>구매 후 청약 철회는 구매일로부터 7일 이내 가능합니다.</p>
                  <p>단, 사용(게임 내 수령)한 경우 청약 철회가 제한됩니다.</p>
                </div>
              </div>

              {/* 하단 버튼 영역 */}
              <div className="px-4 pb-6 pt-3 flex-shrink-0 border-t border-line space-y-2">
                {capcoinModal.purchaseError && (
                  <p className="text-xs text-red-400 text-center">{capcoinModal.purchaseError}</p>
                )}
                {insufficient && !capcoinModal.purchaseSuccess && (
                  <div className="flex justify-center">
                    <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">잔액이 부족해요</span>
                  </div>
                )}
                {capcoinModal.purchaseSuccess ? (
                  <button
                    onClick={() => setCapcoinModal(prev => ({ ...prev, open: false }))}
                    className="w-full py-4 rounded-xl font-bold text-base bg-cyan-500 text-white"
                  >
                    구매 완료! 닫기
                  </button>
                ) : (
                  <button
                    onClick={capcoinModal.gameUserId.trim() === '' ? undefined : submitCapcoinPurchase}
                    disabled={capcoinModal.gameUserId.trim() === '' || insufficient || capcoinModal.purchasing}
                    className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${
                      capcoinModal.gameUserId.trim() === '' || insufficient
                        ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                    }`}
                  >
                    {capcoinModal.purchasing ? '처리 중...' : capcoinModal.gameUserId.trim() === '' ? '게임 ID를 입력해주세요.' : canPurchase ? `구매하기 (${totalCost.toLocaleString()} ${(item as { capcoinName?: string }).capcoinName ?? item.currencyName ?? ''})` : '구매하기'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmModal
        isOpen={showDeleteReviewConfirm}
        title="리뷰 삭제"
        message="리뷰를 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          setShowDeleteReviewConfirm(false)
          handleDeleteReview()
        }}
        onCancel={() => setShowDeleteReviewConfirm(false)}
      />
    </div>
  )
}
