'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import adminService, { PublicAnnouncement } from '@/services/adminService'
import communityService, { PostSummary } from '@/services/communityService'
import { postBackNav, communityTabHref } from '@/components/community/PostCard'
import { gameNoticeNav } from '@/components/pages/CommunityPage'
import { gameService, RecentGameAnnouncement } from '@/services/gameService'
import { useAuth } from '@/lib/useAuth'
import { formatDate } from '@/lib/formatDate'
import StarRating from '@/components/StarRating'
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
    <div className="relative h-[284px] bg-bg-secondary w-full">
      <Image
        src={`${UPLOADS_URL}${banner.imageUrl}`}
        alt={banner.title || ''}
        fill
        className="object-cover"
        unoptimized
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </div>
  )

  return (
    <div className="relative w-full overflow-hidden group">
      {banner.linkUrl ? (
        <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer"
          onClick={() => adminService.trackBannerEvent(banner._id, 'click')}>{inner}</Link>
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

// ────────── 게임 목록 컬럼 ──────────

function GameColumn({ title, games, serviceType, badge, columns = 1, hideMore = false }: { title: string; games: Game[]; serviceType: string; badge?: string; columns?: number; hideMore?: boolean }) {
  const router = useRouter()
  const chunkSize = 5
  const chunks = columns > 1
    ? Array.from({ length: columns }, (_, i) => games.slice(i * chunkSize, (i + 1) * chunkSize))
    : [games]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-primary font-semibold text-[22px]">{title}</span>
        {badge && <span className="text-xs text-text-muted">{badge}</span>}
        <div className="flex-1 h-px bg-line" />
        {!hideMore && (
          <Link href={serviceType === 'live' ? '/live_games' : '/betazone'} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</Link>
        )}
      </div>
      {games.length === 0 && <p className="text-xs text-text-muted py-4 text-center">게임이 없습니다</p>}
      <div className={columns > 1 ? 'grid gap-6' : 'flex flex-col gap-2'} style={columns > 1 ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
        {chunks.map((chunk, ci) => (
          <div key={ci} className="flex flex-col gap-2">
            {chunk.map((game, idx) => {
              const id = (game as any)._id || game.id
              const rank = ci * chunkSize + idx + 1
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
                    <p className="text-[14.72px] font-medium text-text-primary group-hover:text-accent transition-colors truncate">{game.title}</p>
                    <div className="flex items-center gap-1">
                      <StarRating value={Math.round(game.rating || 0)} size={3.5} />
                      <span className="text-yellow-400 font-bold text-xs">{(game.rating || 0).toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{game.genre || '기타'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
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
        <div ref={scrollRef} className="flex overflow-x-hidden gap-2 justify-end">
          {games.length === 0 && <p className="text-xs text-text-muted py-4">게임이 없습니다</p>}
          {games.map(game => {
            const id = (game as any)._id || game.id
            return (
              <div
                key={id}
                onClick={() => router.push(`/games/${id}`)}
                className="flex-shrink-0 cursor-pointer group"
                style={{ width: 'calc((100% - 16px) / 3 * 0.8)' }}
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

// 베타존 참가자 모집 — 관리자가 히어로 배너 이미지를 직접 업로드하고 게임을 연결하면 이름/참여 인원을 자동으로 보여줌
// (참여 인원이 목표 인원(maxTesters)에 도달하면 "모집 완료"로 표시)
function BetaZoneRecommendRow({ banners }: { banners: RecommendBannerItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set())
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [justAppliedIds, setJustAppliedIds] = useState<Set<string>>(new Set())
  const [testerBumps, setTesterBumps] = useState<Record<string, number>>({})

  // 서버가 로그인 유저의 실제 신청 여부(game.hasApplied)를 내려주면 그걸로 초기 상태를 채움 —
  // 이게 없으면 새로고침할 때마다 appliedIds가 빈 Set으로 리셋되어 이미 신청했어도 "바로 참가하기"로
  // 되돌아가 보이는 버그가 있었음(2026-09-17 발견)
  useEffect(() => {
    const applied = banners.filter(b => b.game?.hasApplied).map(b => b.game!._id)
    if (applied.length > 0) setAppliedIds(prev => new Set([...prev, ...applied]))
  }, [banners])

  if (banners.length === 0) {
    return <p className="text-xs text-text-muted py-4">등록된 베타존 참가자 모집 게임이 없습니다</p>
  }

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'right' ? el.offsetWidth : -el.offsetWidth, behavior: 'smooth' })
  }

  // 클릭 즉시 자동 참가(선착순 즉시 확정) — 카드 전체를 감싸는 Link 이동은 막고 이 버튼만 따로 동작
  const handleApply = async (e: React.MouseEvent, gameId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) { router.push('/login'); return }
    if (applyingIds.has(gameId) || appliedIds.has(gameId)) return
    setApplyingIds(prev => new Set(prev).add(gameId))
    try {
      const result = await gameService.applyBetaTester(gameId)
      if (result.success) {
        setAppliedIds(prev => new Set(prev).add(gameId))
        if (!result.alreadyApplied) setTesterBumps(prev => ({ ...prev, [gameId]: (prev[gameId] || 0) + 1 }))
        setJustAppliedIds(prev => new Set(prev).add(gameId))
        setTimeout(() => setJustAppliedIds(prev => { const next = new Set(prev); next.delete(gameId); return next }), 450)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '베타존 신청에 실패했습니다.')
    } finally {
      setApplyingIds(prev => { const next = new Set(prev); next.delete(gameId); return next })
    }
  }

  return (
    <div className="relative group/banner flex-1 min-h-0">
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-colors opacity-0 group-hover/banner:opacity-100"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <div ref={scrollRef} className="flex gap-4 overflow-x-hidden h-full items-stretch">
        {banners.map(b => {
          const gameId = b.game?._id
          const testers = (b.game?.testers ?? 0) + (gameId ? (testerBumps[gameId] || 0) : 0)
          const maxTesters = b.game?.maxTesters ?? 0
          const isFull = maxTesters > 0 && testers >= maxTesters
          const remaining = maxTesters - testers
          const startDateVal = b.game?.startDate ? new Date(b.game.startDate) : null
          const daysUntilStart = startDateVal ? (startDateVal.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : null
          const isStartingSoon = daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 5
          const isClosingSoon = !isFull && ((maxTesters > 0 && remaining <= 10) || isStartingSoon)
          const name = b.game?.title || b.title || ''
          const applied = !!gameId && appliedIds.has(gameId)
          const applying = !!gameId && applyingIds.has(gameId)
          const justApplied = !!gameId && justAppliedIds.has(gameId)
          const joinable = !isFull && !applied && !applying && !!gameId
          return (
            <Link key={b._id} href={b.linkUrl || '#'} className="flex flex-col w-[162px] flex-shrink-0 h-[288px] rounded-2xl overflow-hidden border border-line group">
              <div className="relative h-[160px] flex-shrink-0">
                <img src={`${UPLOADS_URL}${b.imageUrl}`} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                {isClosingSoon && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-semibold">마감임박</span>
                )}
              </div>
              <div className="p-3 h-[128px] overflow-hidden flex flex-col gap-1 flex-shrink-0">
                <p className="text-[14.72px] font-medium text-text-primary truncate group-hover:text-accent transition-colors">{name}</p>
                <span className="text-xs text-text-muted truncate">베타 시작 : {b.game?.startDate ? formatDate(b.game.startDate) : '-'}</span>
                <span className={`text-xs truncate ${isClosingSoon ? 'text-red-500 font-semibold' : 'text-text-muted'}`}>
                  {maxTesters > 0 ? `참여 ${testers.toLocaleString()}/${maxTesters.toLocaleString()}명` : `참여 ${testers.toLocaleString()}명`}
                </span>
                <span
                  onClick={joinable ? (e => handleApply(e, gameId!)) : undefined}
                  className={`flex items-center justify-center gap-1 text-center text-[11px] font-semibold px-2 py-1 rounded-md truncate transition-all duration-150 ${
                    joinable ? 'text-white bg-accent hover:bg-accent-hover cursor-pointer active:scale-90'
                    : applied ? 'text-white bg-blue-600'
                    : isFull ? 'bg-bg-tertiary text-text-secondary border border-line'
                    : 'text-white bg-accent/60 cursor-wait'
                  } ${justApplied ? 'animate-pop-scale' : ''}`}
                >
                  {applied && <Check className="w-3 h-3 flex-shrink-0" />}
                  {isFull ? '모집 완료' : applied ? '참가 완료' : applying ? '참가 중...' : '바로 참가하기'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-colors opacity-0 group-hover/banner:opacity-100"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
    </div>
  )
}

// ────────── 핫글 순위 컬럼 ──────────

const NOTICE_TABS = [
  { key: 'platform', label: '메인 공지' },
  { key: 'live', label: '게임 공지' },
  { key: 'beta', label: '베타 공지' },
  { key: 'hot', label: '인기글' },
] as const
type NoticeTabKey = typeof NOTICE_TABS[number]['key']

function CommunityHotCard({ posts, platformNotices, liveNotices, betaNotices }: {
  posts: (PostSummary & { likeCount: number })[]
  platformNotices: PublicAnnouncement[]
  liveNotices: RecentGameAnnouncement[]
  betaNotices: RecentGameAnnouncement[]
}) {
  const [tab, setTab] = useState<NoticeTabKey>('hot')

  // 메인 진입할 때마다 4개 탭 중 무작위로 하나를 기본 선택 (서버-클라이언트 hydration 불일치 방지를 위해 마운트 후에 결정)
  useEffect(() => {
    setTab(NOTICE_TABS[Math.floor(Math.random() * NOTICE_TABS.length)].key)
  }, [])

  const moreHref = tab === 'platform' ? communityTabHref('notice-platform')
    : tab === 'live' ? communityTabHref('notice-game')
    : tab === 'beta' ? communityTabHref('beta-game')
    : '/community?sort=popular'

  const rowCls = "group flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-bg-tertiary transition-colors"
  const rankCls = (i: number) => `w-5 text-center text-sm font-bold flex-shrink-0 ${i < 3 ? 'text-accent' : 'text-text-muted'}`
  const titleCls = "block text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors"

  return (
    <div className="flex flex-col h-full rounded-3xl border border-line bg-bg-card p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {NOTICE_TABS.map((t, i) => (
          <div key={t.key} className="flex items-center gap-2">
            {i > 0 && <span className="text-line text-xs">|</span>}
            <button
              onClick={() => setTab(t.key)}
              className={`pb-1 text-xs border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key ? 'text-accent font-semibold border-accent' : 'text-text-primary font-medium border-transparent hover:text-accent'
              }`}
            >
              {t.label}
            </button>
          </div>
        ))}
        <Link href={moreHref} className="ml-auto text-xs text-text-muted hover:text-accent transition-colors flex-shrink-0">더보기</Link>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-[9.65px]">
        {tab === 'hot' && (
          posts.length === 0 ? <p className="text-xs text-text-muted py-4 text-center">인기글이 없습니다</p> :
          posts.map((p, i) => {
            const nav = postBackNav(p)
            return (
              <Link key={p._id} href={`/community/${p._id}?from=${encodeURIComponent(nav.label)}&fromHref=${encodeURIComponent(nav.href)}`} className={rowCls}>
                <span className={rankCls(i)}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className={titleCls}>{p.title}</span>
                  <span className="block text-xs text-text-muted truncate mt-1.5">{nav.label}</span>
                </div>
              </Link>
            )
          })
        )}
        {tab === 'platform' && (
          platformNotices.length === 0 ? <p className="text-xs text-text-muted py-4 text-center">등록된 공지가 없습니다</p> :
          platformNotices.map((a, i) => (
            <Link key={a._id} href={`/community/announcement/${a._id}?from=${encodeURIComponent('커뮤니티 공지')}&fromHref=${encodeURIComponent(communityTabHref('notice-platform'))}`} className={rowCls}>
              <span className={rankCls(i)}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className={titleCls}>{a.title}</span>
                <span className="block text-xs text-text-muted truncate mt-1.5">{formatDate(a.publishedAt || a.createdAt)}</span>
              </div>
            </Link>
          ))
        )}
        {(tab === 'live' || tab === 'beta') && (() => {
          const list = tab === 'live' ? liveNotices : betaNotices
          if (list.length === 0) return <p className="text-xs text-text-muted py-4 text-center">등록된 공지가 없습니다</p>
          return list.map((n, i) => {
            const nav = gameNoticeNav(n)
            return (
              <Link key={n._id} href={`/community/game-announcement/${n._id}?from=${encodeURIComponent(nav.label)}&fromHref=${encodeURIComponent(nav.href)}`} className={rowCls}>
                <span className={rankCls(i)}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className={titleCls}>{n.title}</span>
                  <span className="block text-xs text-text-muted truncate mt-1.5">{n.game?.title ?? ''}</span>
                </div>
              </Link>
            )
          })
        })()}
      </div>
    </div>
  )
}

// ────────── 추천 게임 배너 박스 (관리자가 배너로 등록/관리) ──────────

type RecommendBannerItem = {
  _id: string; imageUrl: string; linkUrl?: string; title?: string
  game?: { _id: string; title: string; testers?: number; maxTesters?: number; startDate?: string; hasApplied?: boolean } | null
}

// 추천 게임 배너 — 관리자 등록 순서(sortOrder)대로 표시, 좌우 화살표로 넘김. 다음 배너를 오른쪽에 살짝 노출(그라데이션으로 흐려짐)해서 더 있다는 걸 힌트로 보여줌
// (2026-09-16, 우측 소형 스택 제거하고 전체 폭 단독 배치로 변경 → 이후 무작위 시작 제거하고 순서 고정 + 다음 배너 미리보기 방식으로 재변경)
// 2026-09-16: 직접 업로드 대신 게임의 히어로 배너(Game.bannerImage, 1920×823 = 21:9)를 그대로 재사용하게 되면서,
// 고정 높이(px) 대신 원본과 동일한 21:9 비율 박스로 변경 — "이미지 비율 절대 변경 금지" 규칙(업로드 비율 = 노출 박스 비율)을 지키기 위함
const REC_BIG_HEIGHT = 275 // 배너가 없을 때(빈 상태) 플레이스홀더 높이로만 사용

// 슬라이드 폭 — 컨테이너의 92%만 채우고 나머지 8%에 다음 배너를 살짝 노출(페이지가 더 있다는 힌트), 노출된 조각은 오른쪽 그라데이션으로 점점 흐려짐
const REC_SLIDE_WIDTH_PCT = 62.56 // 2026-09-16: 이미지 좌우 20% 축소(92 → 73.6) — 등록 이미지 자체의 표시 비율을 의도적으로 조정한 것(컨테이너/카테고리 패널 폭은 그대로 유지). 2026-09-17: 21:9 비율 유지한 채 크기 15% 추가 축소(73.6 → 62.56)

function RecommendBigBanner({ banners }: { banners: RecommendBannerItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  const goTo = (newIdx: number) => {
    if (banners.length === 0) return
    const clamped = (newIdx + banners.length) % banners.length
    setIdx(clamped)
    const slide = scrollRef.current?.children[clamped] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  useEffect(() => {
    const b = banners[idx]
    if (b) adminService.trackBannerEvent(b._id, 'impression')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, banners.length])

  if (banners.length === 0) {
    return (
      <div style={{ height: REC_BIG_HEIGHT }} className="rounded-lg border border-line bg-bg-tertiary flex items-center justify-center">
        <p className="text-xs text-text-muted">등록된 추천 게임이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="relative group/banner">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
        }}
      >
        {banners.map(b => (
          <div key={b._id} className="flex-shrink-0" style={{ width: `${REC_SLIDE_WIDTH_PCT}%` }}>
            <div
              onClick={() => b.linkUrl && window.open(b.linkUrl, '_blank')}
              className={`relative ${b.linkUrl ? 'cursor-pointer' : ''} group`}
            >
              <div className="aspect-[21/9] rounded-lg overflow-hidden border border-line bg-bg-tertiary group-hover:border-accent transition-colors">
                <img src={`${UPLOADS_URL}${b.imageUrl}`} alt={b.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && <>
        <button onClick={() => goTo(idx - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-colors opacity-0 group-hover/banner:opacity-100">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button onClick={() => goTo(idx + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-full transition-colors opacity-0 group-hover/banner:opacity-100">
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </>}
    </div>
  )
}

// ────────── 메인 페이지 ──────────

export default function MainPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [recommendBanners, setRecommendBanners] = useState<any[]>([])
  const [hotPosts, setHotPosts] = useState<(PostSummary & { likeCount: number })[]>([])
  const [platformNotices, setPlatformNotices] = useState<PublicAnnouncement[]>([])
  const [liveNotices, setLiveNotices] = useState<RecentGameAnnouncement[]>([])
  const [betaNotices, setBetaNotices] = useState<RecentGameAnnouncement[]>([])
  const [betaRecommendBanners, setBetaRecommendBanners] = useState<RecommendBannerItem[]>([])
  const [betaRanking, setBetaRanking] = useState<Game[]>([])
  const [liveRanking, setLiveRanking] = useState<Game[]>([])

  useEffect(() => {
    adminService.getMainBanners()
      .then(data => {
        setBanners(data.banners)
        data.banners.forEach((b: { _id: string }) => adminService.trackBannerEvent(b._id, 'impression'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    adminService.getRecommendBanners()
      .then(data => setRecommendBanners(data.banners || []))
      .catch(() => {})
    communityService.getStats()
      .then(data => setHotPosts((data.hotPosts || []).slice(0, 5)))
      .catch(() => {})
    adminService.getPublicAnnouncements()
      .then(data => setPlatformNotices((data.announcements || []).slice(0, 5)))
      .catch(() => {})
    gameService.getRecentGameAnnouncements(5, 1, undefined, 'latest', 'live')
      .then(data => setLiveNotices(data.announcements || []))
      .catch(() => {})
    gameService.getRecentGameAnnouncements(5, 1, undefined, 'latest', 'beta')
      .then(data => setBetaNotices(data.announcements || []))
      .catch(() => {})
    adminService.getNewGameBanners()
      .then(data => setBetaRecommendBanners(data.banners || []))
      .catch(() => {})
    gameService.getZoneRankings('beta', 5)
      .then(data => setBetaRanking(data.games || []))
      .catch(() => {})
    gameService.getZoneRankings('live', 10)
      .then(data => setLiveRanking(data.games || []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      {/* 최상단 히어로 배너 — 스팀 메인 캐러셀 참고. 좌우 폭 30% 축소(풀블리드 100% → 70%, 가운데 정렬) */}
      {banners.length > 0 && (
        <div className="pt-6 w-[70%] mx-auto">
          <MainBannerCarousel banners={banners} />
        </div>
      )}

      {/* 그 아래 전체 섹션은 폭을 30% 줄인 컨테이너로 */}
      <div className={`max-w-[1183px] mx-auto px-4 pb-6 space-y-[31px] ${banners.length > 0 ? 'mt-[31px]' : 'pt-6'}`}>
        {/* 추천 게임 — 새로고침마다 무작위 1개 표시, 좌우 넘김 (2026-09-16, 우측 소형 스택 제거) */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-text-primary font-semibold text-[22px]">추천 게임</span>
            <div className="flex-1 h-px bg-line" />
          </div>
          <div className="w-full">
            <RecommendBigBanner banners={recommendBanners} />
          </div>
        </div>

        {/* 베타존 참가자 모집 + 인기글 */}
        <div className="flex justify-between items-stretch">
          <div className="w-[70.2%] h-[367px] bg-bg-card border border-line rounded-2xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-text-primary font-semibold text-[22px]">베타존 참가자 모집</span>
              <div className="flex-1 h-px bg-line" />
            </div>
            <BetaZoneRecommendRow banners={betaRecommendBanners} />
          </div>
          <div style={{ width: '28.8%' }}>
            <CommunityHotCard posts={hotPosts} platformNotices={platformNotices} liveNotices={liveNotices} betaNotices={betaNotices} />
          </div>
        </div>

        {/* 순위 */}
        <div className="flex justify-between items-stretch">
          <div className="w-[67.2%] pt-4">
            <GameColumn title="최고 게임 순위" games={liveRanking} serviceType="live" columns={2} hideMore />
          </div>
          <div style={{ width: '28.8%' }} className="bg-bg-card border border-line rounded-2xl p-4">
            <GameColumn title="베타존 최고의 게임" games={betaRanking} serviceType="beta" hideMore />
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
