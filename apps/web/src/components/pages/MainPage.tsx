'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import adminService, { PublicAnnouncement } from '@/services/adminService'
import { gameService } from '@/services/gameService'
import { Game } from '@gameup/types'

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%231e293b' width='80' height='80'/%3E%3C/svg%3E"

// ────────── 메인 배너 캐러셀 ──────────

function MainBannerCarousel({ banners }: { banners: { _id: string; imageUrl: string; linkUrl?: string; title?: string }[] }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = useCallback((idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrent((idx + banners.length) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setTimeout(() => go(current + 1), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, go, banners.length])

  if (banners.length === 0) return null

  const banner = banners[current]
  const inner = (
    <div className="relative h-[207px] md:h-[322px] bg-bg-secondary w-full">
      <Image
        src={`${UPLOADS_URL}${banner.imageUrl}`}
        alt={banner.title || ''}
        fill
        className="object-cover"
        unoptimized
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {banner.title && (
        <div className="absolute bottom-5 left-6 right-16">
          <p className="text-white font-bold text-lg drop-shadow">{banner.title}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{inner}</Link>
      ) : inner}

      {banners.length > 1 && (
        <>
          <button onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => go(idx)}
                className={`rounded-full transition-all ${idx === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ────────── 추천 게임 ──────────

const ITEM_W = 160
const GAP = 12
const ITEM_STRIDE = ITEM_W + GAP
const SLIDE_AMOUNT = ITEM_STRIDE * 4

function RecommendedGames({ games }: { games: Game[] }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  // 전체 콘텐츠가 항상 넓은 화면보다 넓도록 복제 수 동적 계산
  const copyWidth = games.length * ITEM_STRIDE
  const copies = copyWidth > 0 ? Math.max(3, Math.ceil(3200 / copyWidth) + 2) : 3
  const items = Array.from({ length: copies }, () => games).flat()

  // 중간 복사본으로 초기화
  useEffect(() => {
    const el = scrollRef.current
    if (el && copyWidth > 0) el.scrollLeft = copyWidth
  }, [copyWidth])

  // 경계 루프 감지 (드래그 중에도 동작)
  const checkLoop = useCallback(() => {
    const el = scrollRef.current
    if (!el || copyWidth === 0) return
    if (el.scrollLeft >= copyWidth * 2) el.scrollLeft -= copyWidth
    if (el.scrollLeft < copyWidth) el.scrollLeft += copyWidth
  }, [copyWidth])

  const slide = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el || copyWidth === 0) return
    const target = el.scrollLeft + (dir === 'right' ? SLIDE_AMOUNT : -SLIDE_AMOUNT)
    const start = el.scrollLeft
    const distance = target - start
    const duration = 350
    let startTime: number | null = null

    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      el.scrollLeft = start + distance * easeInOut(progress)
      checkLoop()
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = null
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)
  }


  if (games.length === 0) return null

  return (
    <div className="w-full group/section">
      <div className="flex items-center gap-3 mb-3 px-1">
        <span className="text-text-primary font-semibold text-[22px]">추천 게임</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="relative">
        <button
          onClick={() => slide('left')}
          className="absolute left-0 top-[45%] -translate-y-1/2 -translate-x-1 z-10 w-8 h-8 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-bg-tertiary"
        >
          <ChevronLeft className="w-4 h-4 text-text-primary" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-hidden select-none"
        >
          {items.map((game, i) => {
            const id = (game as any)._id || game.id
            return (
              <div
                key={`${id}-${i}`}
                onClick={() => router.push(`/games/${id}`)}
                className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                style={{ width: ITEM_W }}
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden border border-line bg-bg-tertiary group-hover:border-accent transition-colors">
                  <img
                    src={game.thumbnail ? `${UPLOADS_URL}${game.thumbnail}` : PLACEHOLDER}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors text-center truncate w-full px-1">
                  {game.title}
                </span>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => slide('right')}
          className="absolute right-0 top-[45%] -translate-y-1/2 translate-x-1 z-10 w-8 h-8 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-bg-tertiary"
        >
          <ChevronRight className="w-4 h-4 text-text-primary" />
        </button>
      </div>
    </div>
  )
}

// ────────── 게임 목록 컬럼 ──────────

function GameColumn({ title, games, serviceType, badge }: { title: string; games: Game[]; serviceType: string; badge?: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-primary font-semibold text-[22px]">{title}</span>
        {badge && <span className="text-xs text-text-muted">{badge}</span>}
        <div className="flex-1 h-px bg-line" />
        <Link href={`/betazone?serviceType=${serviceType}`} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</Link>
      </div>
      <div className="flex flex-col gap-2">
        {games.length === 0 && <p className="text-xs text-text-muted py-4 text-center">게임이 없습니다</p>}
        {games.map((game, idx) => {
          const id = (game as any)._id || game.id
          const rank = idx + 1
          return (
            <div
              key={id}
              onClick={() => router.push(`/games/${id}`)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer group"
            >
              <span className={`w-5 text-center text-sm font-bold flex-shrink-0 ${rank <= 3 ? 'text-accent' : 'text-text-muted'}`}>
                {rank}
              </span>
              <div className="w-[68px] h-[68px] flex-shrink-0 rounded-lg overflow-hidden border border-line bg-bg-tertiary">
                <img
                  src={game.thumbnail ? `${UPLOADS_URL}${game.thumbnail}` : PLACEHOLDER}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">{game.title}</p>
                <p className="text-xs text-text-muted truncate">{game.genre || '기타'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────── 가로 스크롤 게임 섹션 ──────────

function HorizontalGameSection({ title, games }: { title: string; games: Game[] }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardW = el.offsetWidth / 3
    el.scrollBy({ left: dir === 'right' ? cardW * 3 : -cardW * 3, behavior: 'smooth' })
  }

  return (
    <div className="w-full group/section">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-text-primary font-semibold text-[22px]">{title}</span>
        <div className="flex-1 h-px bg-line" />
      </div>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-6 h-6 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-bg-tertiary"
        >
          <ChevronLeft className="w-3 h-3 text-text-primary" />
        </button>
        <div ref={scrollRef} className="flex overflow-x-hidden gap-2">
          {games.length === 0 && <p className="text-xs text-text-muted py-4">게임이 없습니다</p>}
          {games.map(game => {
            const id = (game as any)._id || game.id
            return (
              <div
                key={id}
                onClick={() => router.push(`/games/${id}`)}
                className="flex-shrink-0 cursor-pointer group"
                style={{ width: 'calc(30% - 6px)' }}
              >
                <div className="aspect-[16/9] rounded-lg overflow-hidden border border-line bg-bg-tertiary group-hover:border-accent transition-colors mb-1.5">
                  <img
                    src={game.bannerImage ? `${UPLOADS_URL}${game.bannerImage}` : (game.thumbnail ? `${UPLOADS_URL}${game.thumbnail}` : PLACEHOLDER)}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs text-text-primary group-hover:text-accent transition-colors truncate font-medium">{game.title}</p>
                <p className="text-[10px] text-text-muted truncate">{game.genre || '기타'}</p>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-6 h-6 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-bg-tertiary"
        >
          <ChevronRight className="w-3 h-3 text-text-primary" />
        </button>
      </div>
    </div>
  )
}

// ────────── 공지 컬럼 ──────────

const NOTICE_TYPE_LABEL: Record<string, string> = {
  notice: '공지', event: '이벤트', maintenance: '점검', update: '업데이트'
}
const NOTICE_TYPE_COLOR: Record<string, string> = {
  notice: 'bg-blue-500/20 text-blue-400',
  event: 'bg-purple-500/20 text-purple-400',
  maintenance: 'bg-yellow-500/20 text-yellow-400',
  update: 'bg-green-500/20 text-green-400',
}

function NoticeColumn({ notices }: { notices: PublicAnnouncement[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-primary font-semibold text-[22px]">커뮤니티 공지</span>
        <div className="flex-1 h-px bg-line" />
        <Link href="/community" className="text-xs text-text-muted hover:text-accent transition-colors">더보기</Link>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {notices.length === 0 && <p className="text-xs text-text-muted py-4 text-center">공지가 없습니다</p>}
        {notices.map(n => (
          <Link
            key={n._id}
            href={`/community/announcement/${n._id}`}
            className="flex flex-col gap-1 p-2 rounded-lg hover:bg-bg-tertiary transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${NOTICE_TYPE_COLOR[n.type] || 'bg-bg-tertiary text-text-muted'}`}>
                {NOTICE_TYPE_LABEL[n.type] || n.type}
              </span>
              <p className="text-sm text-text-primary group-hover:text-accent transition-colors truncate">{n.title}</p>
            </div>
            <p className="text-xs text-text-muted">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ────────── 이벤트 배너 박스 ──────────

type EventBannerItem = { _id: string; imageUrl: string; linkUrl?: string; title?: string }

function BannerCell({ banner, className = '' }: { banner: EventBannerItem; className?: string }) {
  const cls = `relative overflow-hidden bg-bg-secondary ${className}`
  const content = (
    <>
      <img
        src={`${UPLOADS_URL}${banner.imageUrl}`}
        alt={banner.title || ''}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {banner.title && (
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-bold text-sm drop-shadow truncate">{banner.title}</p>
        </div>
      )}
    </>
  )
  return banner.linkUrl
    ? <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={cls}>{content}</Link>
    : <div className={cls}>{content}</div>
}

function EventBannerBox({ banners }: { banners: EventBannerItem[] }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(Math.max(banners.length, 1) / 4)
  const slots = Array.from({ length: 4 }, (_, i) => banners[page * 4 + i] ?? null)
  const hasMore = banners.length > 4

  return (
    <div className="relative">
      {hasMore && page > 0 && (
        <button
          onClick={() => setPage(p => p - 1)}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md hover:bg-bg-tertiary transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-text-primary" />
        </button>
      )}

      <div className="grid grid-cols-4 gap-2">
        {slots.map((b, i) =>
          b ? (
            <BannerCell key={b._id} banner={b} className="aspect-[5/4] rounded-xl" />
          ) : (
            <div key={i} className="aspect-[5/4] rounded-xl bg-bg-tertiary border border-line flex items-center justify-center">
              {i === 0 && banners.length === 0 && (
                <p className="text-xs text-text-muted text-center px-2">등록된 이벤트가 없습니다</p>
              )}
            </div>
          )
        )}
      </div>

      {hasMore && page < totalPages - 1 && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-bg-card border border-line rounded-full shadow-md hover:bg-bg-tertiary transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-text-primary" />
        </button>
      )}
    </div>
  )
}

// ────────── 메인 페이지 ──────────

export default function MainPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [recGames, setRecGames] = useState<Game[]>([])
  const [eventBanners, setEventBanners] = useState<any[]>([])
  const [notices, setNotices] = useState<PublicAnnouncement[]>([])
  const [newGames, setNewGames] = useState<Game[]>([])
  const [betaRanking, setBetaRanking] = useState<Game[]>([])
  const [liveRanking, setLiveRanking] = useState<Game[]>([])

  useEffect(() => {
    adminService.getMainBanners()
      .then(data => setBanners(data.banners))
      .catch(() => {})
  }, [])

  useEffect(() => {
    gameService.getAllGames({ sort: 'newest', limit: 20 })
      .then(data => setRecGames(data.games || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    adminService.getEventBanners()
      .then(data => setEventBanners(data.banners || []))
      .catch(() => {})
    adminService.getPublicAnnouncements()
      .then(data => setNotices((data.announcements || []).slice(0, 6)))
      .catch(() => {})
    gameService.getAllGames({ sort: 'newest', serviceType: 'live', limit: 10 })
      .then(data => setNewGames(data.games || []))
      .catch(() => {})
    gameService.getAllGames({ serviceType: 'beta', limit: 5 })
      .then(data => setBetaRanking(data.games || []))
      .catch(() => {})
    gameService.getAllGames({ serviceType: 'live', limit: 5 })
      .then(data => setLiveRanking(data.games || []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {banners.length > 0 && <MainBannerCarousel banners={banners} />}
        <RecommendedGames games={recGames} />

        {/* 이벤트 + 신작게임 + 공지 */}
        <div className="flex gap-4 items-start mt-8">
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-text-primary font-semibold text-[22px]">이벤트</span>
                <div className="flex-1 h-px bg-line" />
              </div>
              <EventBannerBox banners={eventBanners} />
            </div>
            <HorizontalGameSection title="신작 게임" games={newGames} />
            <div className="grid grid-cols-2 gap-6">
              <GameColumn title="베타존" games={betaRanking} serviceType="beta" badge="(순위 책정 더미)" />
              <GameColumn title="라이브게임" games={liveRanking} serviceType="live" badge="(순위 책정 더미)" />
            </div>
          </div>
          <div style={{ width: '20%' }} className="bg-bg-card border border-line rounded-2xl p-4 flex flex-col">
            <NoticeColumn notices={notices} />
          </div>
        </div>
      </div>

      <footer className="bg-bg-secondary border-t border-line mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-text-secondary">
          <p>&copy; 2026 GameUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
