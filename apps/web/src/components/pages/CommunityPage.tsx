'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard, { ViewMode } from '@/components/community/PostCard'
import communityService from '@/services/communityService'
import adminService, { CommunityBanner } from '@/services/adminService'
import { gameService, RecentGameAnnouncement } from '@/services/gameService'
import { useAuth } from '@/lib/useAuth'
import { useQuery } from '@tanstack/react-query'
import {
  MessageSquare, Loader2, ChevronLeft, ChevronRight,
  PenSquare, Search, Bookmark, Megaphone, Pin, Eye,
  LayoutGrid, List,
  Home, Hash, Sparkles, FlaskConical, Gamepad2, MessageCircle,
  Clock, ThumbsUp, TrendingUp, ChevronDown, X, Gamepad2 as Gamepad
} from 'lucide-react'

const CATEGORIES = [
  { value: 'home', label: '홈', icon: Home },
  { value: 'all', label: '전체', icon: Hash },
  { value: 'new-game-intro', label: '신작게임소개', icon: Sparkles },
  { value: 'beta-game', label: '베타게임', icon: FlaskConical },
  { value: 'live-game', label: '라이브게임', icon: Gamepad2 },
  { value: 'free', label: '자유게시판', icon: MessageCircle },
  { value: 'bookmarks', label: '즐겨찾기', icon: Bookmark },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순', icon: Clock },
  { value: 'popular', label: '인기순', icon: ThumbsUp },
  { value: 'trending', label: '추천순', icon: TrendingUp },
]

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth()

  const router = useRouter()
  const searchParams = useSearchParams()

  const sort = searchParams.get('sort') || 'latest'
  const channel = searchParams.get('channel') || ''
  const search = searchParams.get('search') || ''
  const page = Number(searchParams.get('page') || 1)
  const gameIdParam = searchParams.get('gameId') || ''
  const gameTitleParam = searchParams.get('gameTitle') || ''
  const gameServiceTypeParam = searchParams.get('gameServiceType') || ''

  const [searchInput, setSearchInput] = useState(search)
  const [viewMode, setViewMode] = useState<ViewMode>('large')
  const [sortOpen, setSortOpen] = useState(false)
  const [banners, setBanners] = useState<CommunityBanner[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)
  const [notices, setNotices] = useState<{ _id: string; title: string; content: string; type: string; isPinned: boolean; views: number; createdAt: string; authorId?: { username: string; role: string } }[]>([])
  const [newGamePosts, setNewGamePosts] = useState<any[]>([])
  const [newGameIdx, setNewGameIdx] = useState(0)
  const selectedGame = gameIdParam && gameTitleParam ? { id: gameIdParam, title: gameTitleParam, serviceType: gameServiceTypeParam } : null
  const [annPage, setAnnPage] = useState(0)
  const [noticePage, setNoticePage] = useState(0)
  const [gameNoticePage, setGameNoticePage] = useState(1)
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({ 'beta-game': true, 'live-game': true })
  const toggleCollapse = (catValue: string) =>
    setCollapsedCats(prev => ({ ...prev, [catValue]: !prev[catValue] }))
  const NOTICE_PER_PAGE = 5
  const noticeTotalPages = Math.ceil(notices.length / NOTICE_PER_PAGE)
  const pagedNotices = notices.slice(noticePage * NOTICE_PER_PAGE, (noticePage + 1) * NOTICE_PER_PAGE)

  const isHomePage = !channel && !search && !selectedGame

  // 게임 선택 시 해당 serviceType 카테고리 탭 자동 펼치기
  useEffect(() => {
    if (!selectedGame?.serviceType) return
    const catValue = selectedGame.serviceType === 'beta' ? 'beta-game' : selectedGame.serviceType === 'live' ? 'live-game' : null
    if (catValue) setCollapsedCats(prev => ({ ...prev, [catValue]: false }))
  }, [selectedGame?.id])


  useEffect(() => {
    const saved = localStorage.getItem('community-view-mode') as ViewMode | null
    if (saved && saved !== 'medium') setViewMode(saved)
  }, [])

  useEffect(() => {
    adminService.getCommunityBanners().then(d => {
      setBanners(d.banners)
      d.banners.forEach((b: { _id: string }) => adminService.trackBannerEvent(b._id, 'impression'))
    }).catch(() => {})
    adminService.getPublicAnnouncements().then(d => setNotices(d.announcements || [])).catch(() => {})
    communityService.getPosts({ channel: 'new-game-intro', page: 1, limit: 10, sort: 'latest' }).then(d => setNewGamePosts(d.posts || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(timer)
  }, [banners.length])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    router.push('?' + next.toString())
  }

  const handleGameClick = (gameId: string, gameTitle: string, serviceType?: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('gameId', gameId)
    next.set('gameTitle', gameTitle)
    if (serviceType) next.set('gameServiceType', serviceType)
    else next.delete('gameServiceType')
    next.set('page', '1')
    router.push('?' + next.toString())
  }

  const closeGameTab = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('gameId')
    next.delete('gameTitle')
    next.delete('gameServiceType')
    next.set('page', '1')
    router.push('?' + next.toString())
    setAnnPage(0)
    setCollapsedCats({ 'beta-game': true, 'live-game': true })
  }

  const handleCategoryClick = (catValue: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete('gameId')
    next.delete('gameTitle')
    next.delete('gameServiceType')
    next.set('page', '1')
    if (catValue) next.set('channel', catValue)
    else next.delete('channel')
    router.push('?' + next.toString())
    setAnnPage(0)
    setGameNoticePage(1)
    setCollapsedCats({ 'beta-game': true, 'live-game': true })
  }

  const { data: betaGamesData } = useQuery({
    queryKey: ['sidebarGames', 'beta'],
    queryFn: () => gameService.getAllGames({ serviceType: 'beta', limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: liveGamesData } = useQuery({
    queryKey: ['sidebarGames', 'live'],
    queryFn: () => gameService.getAllGames({ serviceType: 'live', limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })
  const betaGames = betaGamesData?.games ?? []
  const liveGames = liveGamesData?.games ?? []

  const { data: recentGameNoticesData } = useQuery({
    queryKey: ['recentGameAnnouncements', gameNoticePage],
    queryFn: () => gameService.getRecentGameAnnouncements(15, gameNoticePage),
    enabled: isHomePage,
  })
  const gameNotices: RecentGameAnnouncement[] = recentGameNoticesData?.announcements ?? []
  const gameNoticeTotalPages = recentGameNoticesData?.totalPages ?? 1

  const { data: gameAnnouncementsData } = useQuery({
    queryKey: ['gameAnnouncements', selectedGame?.id],
    queryFn: () => gameService.getAnnouncementsByGame(selectedGame!.id, { limit: 5 }),
    enabled: !!selectedGame?.id,
  })
  const allGameAnnouncements = gameAnnouncementsData?.announcements ?? []
  const ANN_PER_PAGE = 3
  const annTotalPages = Math.ceil(allGameAnnouncements.length / ANN_PER_PAGE)
  const gameAnnouncements = allGameAnnouncements.slice(annPage * ANN_PER_PAGE, (annPage + 1) * ANN_PER_PAGE)

  const isBookmarksTab = channel === 'bookmarks'

  const limit = viewMode === 'small' ? 30 : 20

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page, sort, channel, search, gameId: selectedGame?.id, limit }],
    queryFn: () => isBookmarksTab
      ? communityService.getMyBookmarks(page, limit).then(r => ({ posts: r.posts, total: r.total, totalPages: Math.ceil(r.total / limit) }))
      : communityService.getPosts({
          page, limit, sort,
          channel: (channel && channel !== 'all') ? channel : undefined,
          search: search || undefined,
          gameId: selectedGame?.id,
        }),
  })

  const posts = data?.posts ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setParam('search', searchInput)
  }

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('community-view-mode', mode)
  }

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">게임업 커뮤니티</h1>
          </div>
          <div />
        </div>

        {/* 모바일 카테고리 탭 (lg 미만에서만 표시) */}
        <div className="flex flex-col lg:hidden mt-2">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-line pb-0">
            {CATEGORIES.map(cat => cat).map(cat => {
              const isHome = cat.value === 'home'
              const isBookmarks = cat.value === 'bookmarks'
              const isActive = isHome
                ? (!channel && !search && !selectedGame)
                : channel === cat.value
              return (
                <button key={cat.value}
                  onClick={() => {
                    if (isHome) { router.push('/community'); setCollapsedCats({ 'beta-game': true, 'live-game': true }) }
                    else if (isBookmarks) handleCategoryClick('bookmarks')
                    else handleCategoryClick(cat.value)
                  }}
                  className={`px-4 py-3 text-base font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}>
                  {'_sub' in cat && cat._sub ? `  ${cat.label}` : cat.label}
                </button>
              )
            })}
          </div>
          {selectedGame && (
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-accent-light">
              <Gamepad className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span className="text-accent text-xs font-semibold flex-1 truncate">{selectedGame.title}</span>
              <button onClick={closeGameTab} className="text-text-muted hover:text-text-primary flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* PC: 3컬럼 레이아웃 (왼쪽 카테고리 + 메인 + 오른쪽 사이드바), 모바일: 1컬럼 */}
        <div className="flex flex-col lg:flex-row gap-6 mt-4">

          {/* 왼쪽 카테고리 사이드바 - lg 이상에서만 표시 */}
          <nav className="hidden lg:flex flex-col w-44 flex-shrink-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">카테고리</p>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const isHome = cat.value === 'home'
              const isBookmarks = cat.value === 'bookmarks'
              const isActive = isHome
                ? (!channel && !search && !selectedGame)
                : channel === cat.value
              const subGames = cat.value === 'beta-game' ? betaGames : cat.value === 'live-game' ? liveGames : []
              const subTabs: any[] = []
              const hasSubGames = subGames.length > 0
              const isCollapsed = !!collapsedCats[cat.value]
              return (
                <div key={cat.value}>
                  <div className={`flex items-center rounded-xl transition-colors ${
                    isActive ? 'bg-accent-light' : 'hover:bg-bg-tertiary'
                  }`}>
                    {/* 탭 이동 버튼 */}
                    <button
                      onClick={() => {
                        if (isHome) { router.push('/community'); setCollapsedCats({ 'beta-game': true, 'live-game': true }) }
                        else if (isBookmarks) handleCategoryClick('bookmarks')
                        else handleCategoryClick(cat.value)
                      }}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 text-base font-medium text-left ${
                        isActive ? 'text-accent' : 'text-text-secondary'
                      }`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {cat.label}
                    </button>
                    {/* 접기/펼치기 버튼 (하위 게임 있는 탭만) */}
                    {hasSubGames && (
                      <button
                        onClick={() => toggleCollapse(cat.value)}
                        className={`pr-2 py-2.5 transition-colors ${
                          isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* 정적 하위 탭 (신작게임소개 등) - 항상 표시 */}
                  {subTabs.length > 0 && (
                    <div className="mt-0.5 mb-1 ml-3">
                      {subTabs.map((sub, idx) => {
                        const isLast = idx === subTabs.length - 1 && subGames.length === 0
                        const SubIcon = sub.icon
                        const isSubActive = channel === sub.value
                        return (
                          <div key={sub.value} className="relative flex items-center" style={{ minHeight: 28 }}>
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => handleCategoryClick(sub.value)}
                              className={`ml-4 flex-1 flex items-center gap-1.5 text-left text-base px-2 py-1 rounded-lg truncate transition-colors ${
                                isSubActive
                                  ? 'bg-accent-light text-accent font-semibold'
                                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              <SubIcon className="w-3 h-3 flex-shrink-0" />
                              {sub.label}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 베타/라이브 게임 하위 탭 */}
                  {hasSubGames && !isCollapsed && (
                    <div className="mt-0.5 mb-1 ml-3">
                      {subGames.map((game, idx) => {
                        const isLast = idx === subGames.length - 1
                        const isSelected = selectedGame?.id === game._id
                        return (
                          <div key={game._id} className="relative flex items-center" style={{ minHeight: 28 }}>
                            {/* 꺽은 선: 세로선 */}
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            {/* 꺽은 선: 가로선 */}
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => handleGameClick(game._id!, game.title, game.serviceType as string)}
                              className={`ml-4 flex-1 text-left text-base px-2 py-1 rounded-lg truncate transition-colors ${
                                isSelected
                                  ? 'bg-accent-light text-accent font-semibold'
                                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              {game.title}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* 메인 콘텐츠 영역 */}
          <div className="flex-1 min-w-0">

            {/* 홈 탭 배너 롤링 */}
            {isHomePage && banners.length > 0 && (
              <div className="relative w-full mb-6 rounded-2xl overflow-hidden border border-line group" style={{ maxHeight: 200 }}>
                {banners.map((b, i) => (
                  <a key={b._id} href={b.linkUrl || undefined} target={b.linkUrl ? '_blank' : undefined} rel="noopener noreferrer"
                    className={`absolute inset-0 transition-opacity duration-700 ${i === bannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    style={{ cursor: b.linkUrl ? 'pointer' : 'default' }}
                    onClick={() => { if (b.linkUrl) adminService.trackBannerEvent(b._id, 'click') }}>
                    <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${b.imageUrl}`}
                      alt={b.title || '커뮤니티 배너'} className="w-full object-cover" style={{ maxHeight: 200 }} />
                  </a>
                ))}
                {banners.length > 1 && (
                  <>
                    <button onClick={() => setBannerIdx(i => (i - 1 + banners.length) % banners.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setBannerIdx(i => (i + 1) % banners.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                      {banners.map((_, i) => (
                        <button key={i} onClick={() => setBannerIdx(i)}
                          className={`rounded-full transition-all ${i === bannerIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
                <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${banners[0].imageUrl}`}
                  alt="" className="w-full object-cover invisible" style={{ maxHeight: 200 }} aria-hidden />
              </div>
            )}

            {/* 홈 탭 공지 + 신작게임소개 행 */}
            {isHomePage && (notices.length > 0 || newGamePosts.length > 0) && (
              <div className="mb-6 flex gap-4 items-stretch">
            {/* 공지사항 */}
            {notices.length > 0 && (
              <div className="w-[60%] bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">공지사항</span>
                </div>
                <ul className="flex-1">
                  {pagedNotices.map((n, i) => {
                    const d = new Date(n.createdAt)
                    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
                    const badgeCls = n.type === 'maintenance' ? 'bg-orange-500/10 text-orange-400' :
                      n.type === 'update' ? 'bg-green-500/10 text-green-400' :
                      n.type === 'event'  ? 'bg-purple-500/10 text-purple-400' :
                                            'bg-blue-500/10 text-blue-400'
                    const typeLabel = n.type === 'notice' ? '공지' : n.type === 'event' ? '이벤트' : n.type === 'maintenance' ? '점검' : '업데이트'
                    return (
                      <li key={n._id} onClick={() => router.push(`/community/announcement/${n._id}?from=${encodeURIComponent('홈')}`)}
                        className={`px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-text-primary text-sm font-medium truncate">{n.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badgeCls}`}>{typeLabel}</span>
                          {n.isPinned && <Pin className="w-3 h-3 text-accent flex-shrink-0" />}
                          <div className="flex-1" />
                          <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                          <span>게임업 관리자</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />0</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />0</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {noticeTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-line">
                    <button onClick={() => setNoticePage(p => Math.max(0, p - 1))} disabled={noticePage === 0}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-text-secondary font-medium tabular-nums">
                      {noticePage + 1}/{String(noticeTotalPages).padStart(2, '0')}
                    </span>
                    <button onClick={() => setNoticePage(p => Math.min(noticeTotalPages - 1, p + 1))} disabled={noticePage === noticeTotalPages - 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 신작게임소개 대형 카드 */}
            {newGamePosts.length > 0 && (
              <div className="w-[42%] bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">신작게임소개</span>
                </div>
                <div className="flex-1">
                  <PostCard post={newGamePosts[newGameIdx]} viewMode="large" currentUserId={user?.id} fromLabel="홈" />
                </div>
                {newGamePosts.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2 border-t border-line">
                    <button onClick={() => setNewGameIdx(i => (i - 1 + newGamePosts.length) % newGamePosts.length)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-muted">{newGameIdx + 1}/{newGamePosts.length}</span>
                    <button onClick={() => setNewGameIdx(i => (i + 1) % newGamePosts.length)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

              </div>
            )}

            {/* 홈 탭 게임별 공지 박스 */}
            {isHomePage && gameNotices.length > 0 && (
              <div className="mb-6 bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Gamepad className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">게임별 공지사항</span>
                </div>
                <ul>
                  {gameNotices.map((n, i) => {
                    const d = new Date(n.createdAt)
                    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
                    const badgeCls = n.type === 'maintenance' ? 'bg-orange-500/10 text-orange-400' :
                      n.type === 'update' ? 'bg-green-500/10 text-green-400' :
                      n.type === 'event'  ? 'bg-purple-500/10 text-purple-400' :
                                            'bg-blue-500/10 text-blue-400'
                    const typeLabel = n.type === 'notice' ? '공지' : n.type === 'event' ? '이벤트' : n.type === 'maintenance' ? '점검' : '업데이트'
                    return (
                      <li key={n._id} onClick={() => router.push(`/community/game-announcement/${n._id}?from=${encodeURIComponent('홈')}`)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        {n.game?.thumbnail ? (
                          <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${n.game.thumbnail}`} alt={n.game.title} className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-[52px] h-[52px] rounded-lg bg-bg-muted flex items-center justify-center flex-shrink-0">
                            <Gamepad className="w-[26px] h-[26px] text-text-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-primary text-sm font-medium truncate">{n.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badgeCls}`}>{typeLabel}</span>
                            <div className="flex-1" />
                            <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                            {n.game ? (
                              <button onClick={e => { e.stopPropagation(); handleGameClick(n.game!._id, n.game!.title, n.game!.serviceType) }}
                                className="truncate max-w-[120px] hover:text-accent transition-colors">
                                {n.game.title}
                              </button>
                            ) : <span>알 수 없는 게임</span>}
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />0</span>
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />0</span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {gameNoticeTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-line">
                    <button onClick={() => setGameNoticePage(p => Math.max(1, p - 1))} disabled={gameNoticePage === 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-text-secondary font-medium tabular-nums">
                      {gameNoticePage}/{String(gameNoticeTotalPages).padStart(2, '0')}
                    </span>
                    <button onClick={() => setGameNoticePage(p => Math.min(gameNoticeTotalPages, p + 1))} disabled={gameNoticePage === gameNoticeTotalPages}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 정렬 + 검색 + 보기 모드 (홈 탭 제외) */}
            {!isHomePage && isBookmarksTab && (
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-accent" />
                <span className="text-text-primary text-sm font-semibold">내 즐겨찾기</span>
                <span className="text-text-muted text-xs">총 {total}개</span>
              </div>
            )}

            {!isHomePage && !isBookmarksTab && <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-shrink-0" onBlur={() => setTimeout(() => setSortOpen(false), 150)}>
                {(() => {
                  const currentSort = SORT_OPTIONS.find(s => s.value === sort) || SORT_OPTIONS[0]
                  return (
                    <>
                      <button onClick={() => setSortOpen(o => !o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-base text-text-muted hover:text-text-primary bg-bg-secondary border border-line rounded-lg transition-colors">
                        <currentSort.icon className="w-3.5 h-3.5" />
                        {currentSort.label}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {sortOpen && (
                        <div className="absolute left-0 top-full mt-1 w-32 bg-bg-card border border-line rounded-lg shadow-lg z-20 py-1">
                          {SORT_OPTIONS.map(opt => (
                            <button key={opt.value}
                              onClick={() => { setParam('sort', opt.value); setSortOpen(false) }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-base transition-colors ${
                                sort === opt.value
                                  ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                                  : 'text-text-muted hover:bg-bg-tertiary'
                              }`}>
                              <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              <form onSubmit={handleSearch} className="flex-1 flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="게시글 검색..."
                    className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-line text-text-primary text-sm rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  />
                </div>
                {search && (
                  <button type="button" onClick={() => { setSearchInput(''); setParam('search', '') }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              <div className="flex items-center gap-1 flex-shrink-0">
                {([
                  { mode: 'large' as ViewMode, icon: LayoutGrid, title: '대형' },
                  { mode: 'small' as ViewMode, icon: List, title: '소형' },
                ]).map(({ mode, icon: Icon, title }) => (
                  <button key={mode} onClick={() => changeViewMode(mode)} title={title}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === mode
                        ? 'bg-accent-light text-accent'
                        : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
                    }`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {isAuthenticated && !isBookmarksTab && (
                <button onClick={() => {
                  const params = new URLSearchParams()
                  if (channel && channel !== 'all' && channel !== 'home') params.set('channel', channel)
                  if (selectedGame?.id) params.set('gameId', selectedGame.id)
                  router.push('/community/write' + (params.toString() ? '?' + params.toString() : ''))
                }}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-text-primary px-3 py-1.5 rounded-lg text-base font-medium transition-colors flex-shrink-0">
                  <PenSquare className="w-3.5 h-3.5" /> 글쓰기
                </button>
              )}
            </div>}

            {/* 전체 탭 공지 박스 */}
            {channel === 'all' && notices.length > 0 && (
              <div className="mb-4 bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">공지사항</span>
                </div>
                <ul>
                  {pagedNotices.map((n, i) => {
                    const d = new Date(n.createdAt)
                    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
                    const badgeCls = n.type === 'maintenance' ? 'bg-orange-500/10 text-orange-400' :
                      n.type === 'update' ? 'bg-green-500/10 text-green-400' :
                      n.type === 'event'  ? 'bg-purple-500/10 text-purple-400' :
                                            'bg-blue-500/10 text-blue-400'
                    const typeLabel = n.type === 'notice' ? '공지' : n.type === 'event' ? '이벤트' : n.type === 'maintenance' ? '점검' : '업데이트'
                    return (
                      <li key={n._id} onClick={() => router.push(`/community/announcement/${n._id}?from=${encodeURIComponent('전체')}`)}
                        className={`px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-text-primary text-sm font-medium truncate">{n.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badgeCls}`}>{typeLabel}</span>
                          {n.isPinned && <Pin className="w-3 h-3 text-accent flex-shrink-0" />}
                          <div className="flex-1" />
                          <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                          <span>게임업 관리자</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />0</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />0</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {noticeTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-line">
                    <button onClick={() => setNoticePage(p => Math.max(0, p - 1))} disabled={noticePage === 0}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-text-secondary font-medium tabular-nums">
                      {noticePage + 1}/{String(noticeTotalPages).padStart(2, '0')}
                    </span>
                    <button onClick={() => setNoticePage(p => Math.min(noticeTotalPages - 1, p + 1))} disabled={noticePage === noticeTotalPages - 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 게임 선택 시 해당 게임 공지 (3개씩 페이지네이션) */}
            {selectedGame && allGameAnnouncements.length > 0 && (
              <div className="mb-4 bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">{selectedGame.title} 공지사항</span>
                </div>
                <ul>
                  {gameAnnouncements.map((ann, i) => {
                    const d = new Date(ann.createdAt)
                    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
                    const badgeCls = ann.type === 'maintenance' ? 'bg-orange-500/10 text-orange-400' :
                      ann.type === 'update' ? 'bg-green-500/10 text-green-400' :
                      ann.type === 'event'  ? 'bg-purple-500/10 text-purple-400' :
                                              'bg-blue-500/10 text-blue-400'
                    const typeLabel = ann.type === 'notice' ? '공지' : ann.type === 'event' ? '이벤트' : ann.type === 'maintenance' ? '점검' : '업데이트'
                    return (
                      <li key={ann._id} onClick={() => router.push(`/community/game-announcement/${ann._id}?from=${encodeURIComponent(selectedGame?.title ?? '커뮤니티')}`)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        {ann.game?.thumbnail ? (
                          <img src={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${ann.game.thumbnail}`} alt={ann.game.title} className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-[52px] h-[52px] rounded-lg bg-bg-muted flex items-center justify-center flex-shrink-0">
                            <Gamepad className="w-[26px] h-[26px] text-text-muted" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-primary text-sm font-medium truncate">{ann.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badgeCls}`}>{typeLabel}</span>
                            <div className="flex-1" />
                            <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                            {ann.game ? (
                              <button onClick={e => { e.stopPropagation(); handleGameClick(ann.game!._id, ann.game!.title, ann.game!.serviceType) }}
                                className="truncate max-w-[120px] hover:text-accent transition-colors">
                                {ann.game.title}
                              </button>
                            ) : <span>알 수 없는 게임</span>}
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(ann as RecentGameAnnouncement).views ?? 0}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />0</span>
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />0</span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {annTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 px-4 py-2 border-t border-line">
                    <button
                      onClick={() => setAnnPage(p => Math.max(0, p - 1))}
                      disabled={annPage === 0}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: annTotalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setAnnPage(i)}
                        className={`w-7 h-6 rounded text-base font-medium transition-colors ${
                          i === annPage
                            ? 'bg-accent text-text-primary'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setAnnPage(p => Math.min(annTotalPages - 1, p + 1))}
                      disabled={annPage === annTotalPages - 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 게시글 리스트 */}
            {!isHomePage && (
              <div className={`${
                viewMode === 'large'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : viewMode === 'medium'
                    ? 'space-y-4'
                    : 'space-y-2'
              }`}>
                {isLoading ? (
                  <div className="flex justify-center py-20 col-span-full">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="bg-bg-card border border-line rounded-2xl p-16 text-center col-span-full">
                    <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary">게시글이 없습니다</p>
                    {isAuthenticated && (
                      <button onClick={() => {
                        const params = new URLSearchParams()
                        if (channel && channel !== 'all' && channel !== 'home') params.set('channel', channel)
                        if (selectedGame?.id) params.set('gameId', selectedGame.id)
                        router.push('/community/write' + (params.toString() ? '?' + params.toString() : ''))
                      }}
                        className="mt-4 bg-accent hover:bg-accent-hover text-text-primary px-5 py-2 rounded-xl text-base font-medium transition-colors">
                        첫 글 작성하기
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {(() => {
                      const TAB_LABELS: Record<string, string> = {
                        'all': '전체', 'beta-game': '베타게임', 'live-game': '라이브게임',
                        'free': '자유게시판', 'new-game-intro': '신작게임소개', 'bookmarks': '즐겨찾기',
                      }
                      const currentTabLabel = selectedGame?.title ?? TAB_LABELS[channel] ?? '커뮤니티'
                      return posts.map((post, idx) => (
                        <PostCard key={post._id} post={post} currentUserId={user?.id} priority={idx === 0} viewMode={viewMode} onGameClick={handleGameClick} fromLabel={currentTabLabel} />
                      ))
                    })()}
                  </>
                )}
              </div>
            )}

            {/* 페이지네이션 */}
            {!isHomePage && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6">
                <button disabled={page <= 1}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page - 1)); router.push('?' + n.toString()) }}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary tabular-nums font-medium">
                  {page} / {totalPages}
                </span>
                <button disabled={page >= totalPages}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page + 1)); router.push('?' + n.toString()) }}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
