'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard, { ViewMode, communityTabHref, postBackNav } from '@/components/community/PostCard'
import NoticeTypeBadge from '@/components/NoticeTypeBadge'
import communityService from '@/services/communityService'
import adminService, { CommunityBanner } from '@/services/adminService'
import { authService } from '@/services/authService'
import { gameService, RecentGameAnnouncement } from '@/services/gameService'
import { useAuth } from '@/lib/useAuth'
import { formatDate } from '@/lib/formatDate'
import { useQuery } from '@tanstack/react-query'
import {
  MessageSquare, Loader2, ChevronLeft, ChevronRight,
  PenSquare, Search, Bookmark, Megaphone, Eye,
  LayoutGrid, List,
  Home, Sparkles, FlaskConical, Gamepad2, MessageCircle,
  Clock, ThumbsUp, TrendingUp, ChevronDown, X, Gamepad2 as Gamepad, Flame, Star
} from 'lucide-react'

const NOTICE_SUB_TABS = [
  { value: 'notice-platform', label: '커뮤니티 공지', icon: Megaphone },
  { value: 'notice-game', label: '게임 공지', icon: Gamepad2 },
]

const CATEGORIES = [
  { value: 'home', label: '홈', icon: Home },
  { value: 'notice-hub', label: '공지사항', icon: Megaphone, subTabs: NOTICE_SUB_TABS },
  { value: 'new-game-intro', label: '신작게임소개', icon: Sparkles },
  { value: 'beta-game', label: '베타게임', icon: FlaskConical },
  { value: 'live-game', label: '라이브게임', icon: Gamepad2 },
  { value: 'free', label: '자유게시판', icon: MessageCircle },
  { value: 'bookmarks', label: '내 커뮤니티', icon: Bookmark },
]

const CAT_GAME_SERVICE_TYPE: Record<string, string> = { 'beta-game': 'beta', 'live-game': 'live' }

// 게임별 공지(RecentGameAnnouncement) 클릭 시 뒤로가기 라벨/목적지 — 게임이 있으면 사이드바에서 그 게임을 클릭했을 때(handleGameClick)와 동일한 채널(베타게임/라이브게임)의 자녀 탭으로, 없으면 "게임 공지" 탭으로
const gameNoticeNav = (n: { game?: { _id: string; title: string; serviceType?: string } | null }) => {
  if (n.game) {
    const catChannel = n.game.serviceType === 'beta' ? 'beta-game' : n.game.serviceType === 'live' ? 'live-game' : 'notice-game'
    return { label: n.game.title, href: communityTabHref(catChannel, n.game) }
  }
  return { label: '게임 공지', href: communityTabHref('notice-game') }
}

// 사이드바 카테고리 강조 규칙 (모든 탭 공통, docs/sidebar-tab-consistency-rule.md 참고):
// 1) 홈: channel/search/selectedGame이 전부 없을 때만 강조
// 2) 하위 탭(subTabs)이 있는 카테고리(예: 공지사항): channel이 그 하위 탭 중 하나와 일치하면 부모도 강조
// 3) 하위 게임 목록이 있는 카테고리(베타게임/라이브게임): channel이 일치하거나, 지금 보고 있는 게임이 그 서비스타입에 속하면 강조
// 4) 그 외(신작게임소개/자유게시판/즐겨찾기): channel이 일치할 때만 강조
const isCategoryActive = (
  cat: { value: string; subTabs?: { value: string }[] },
  channel: string, search: string, selectedGame: { serviceType?: string } | null,
  viaBookmarks: boolean
) => {
  if (cat.value === 'home') return !channel && !search && !selectedGame
  if (cat.value === 'bookmarks') return viaBookmarks || channel === 'bookmarks'
  if (viaBookmarks) return false
  if (cat.subTabs?.length) return cat.subTabs.some(s => s.value === channel)
  const gameServiceType = CAT_GAME_SERVICE_TYPE[cat.value]
  if (gameServiceType) return channel === cat.value || selectedGame?.serviceType === gameServiceType
  return channel === cat.value
}

const DEFAULT_COLLAPSED_CATS = { 'notice-hub': true, 'beta-game': true, 'live-game': true, 'bookmarks': true }

// 카테고리(라벨) 클릭 시 최종 펼침 상태를 한 번에 계산 — catValue가 어떤 카테고리의 subTabs 중 하나로 귀결되면(예: 공지사항 라벨 클릭 → 첫 하위 탭) 그 카테고리는 펼친 채로, 나머지는 기본(접힘)
const collapsedStateForCategoryNav = (catValue: string) => {
  const next: Record<string, boolean> = { ...DEFAULT_COLLAPSED_CATS }
  const parent = CATEGORIES.find(c => c.subTabs?.some(s => s.value === catValue))
  if (parent) next[parent.value] = false
  return next
}

// 첫 렌더링(서버 사이드 렌더링 포함) 시점의 펼침 상태를 URL 상태(channel/selectedGame)에 맞게 미리 계산
// — 이게 없으면 딥링크/새로고침으로 들어왔을 때 "전부 접힘"으로 그려졌다가 클라이언트 useEffect가 실행된 뒤에야 펼쳐지는 깜빡임이 생긴다
const initialCollapsedCats = (channelValue: string, gameServiceType?: string): Record<string, boolean> => {
  const next: Record<string, boolean> = { ...DEFAULT_COLLAPSED_CATS }
  const subTabParent = CATEGORIES.find(c => c.subTabs?.some(s => s.value === channelValue))
  if (subTabParent) next[subTabParent.value] = false
  for (const [catValue, svcType] of Object.entries(CAT_GAME_SERVICE_TYPE)) {
    if (gameServiceType && svcType === gameServiceType) next[catValue] = false
  }
  return next
}

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순', icon: Clock },
  { value: 'views', label: '시청순', icon: Eye },
  { value: 'trending', label: '추천순', icon: TrendingUp },
]

export default function CommunityPage() {
  const { user, isAuthenticated, updateUser } = useAuth()

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
  const [notices, setNotices] = useState<{ _id: string; title: string; content: string; type: string; views: number; likes?: string[]; images?: string[]; thumbnailIndex?: number; createdAt: string; authorId?: { username: string; role: string } }[]>([])
  const [newGamePosts, setNewGamePosts] = useState<any[]>([])
  const [newGamePage, setNewGamePage] = useState(0)
  const [hotPosts, setHotPosts] = useState<any[]>([])
  const [freePosts, setFreePosts] = useState<any[]>([])
  const selectedGame = gameIdParam && gameTitleParam ? { id: gameIdParam, title: gameTitleParam, serviceType: gameServiceTypeParam } : null
  const [annPage, setAnnPage] = useState(0)
  const [noticePage, setNoticePage] = useState(0)
  const [gameNoticePage, setGameNoticePage] = useState(1)
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>(() => initialCollapsedCats(channel, selectedGame?.serviceType))
  const toggleCollapse = (catValue: string) =>
    setCollapsedCats(prev => ({ ...prev, [catValue]: !prev[catValue] }))
  // 즐겨찾기(내 커뮤니티) 하위 항목을 통해 이동했는지 여부 — true면 원본 카테고리(베타게임/라이브게임 등)는 강조/자동펼침하지 않고 "내 커뮤니티"만 강조한다
  const [viaBookmarks, setViaBookmarks] = useState(false)
  const HOME_NOTICE_PREVIEW = 5
  const NOTICE_PER_PAGE = 20
  const filteredNotices = notices
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      return sort === 'latest'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : (b.views ?? 0) - (a.views ?? 0)
    })
  const noticeTotalPages = Math.ceil(filteredNotices.length / NOTICE_PER_PAGE)
  const pagedNotices = filteredNotices.slice(noticePage * NOTICE_PER_PAGE, (noticePage + 1) * NOTICE_PER_PAGE)
  const homeNotices = filteredNotices.slice(0, HOME_NOTICE_PREVIEW)

  const isHomePage = !channel && !search && !selectedGame

  useEffect(() => {
    setNoticePage(0)
    setGameNoticePage(1)
  }, [search, sort])

  // 게임 선택 시 해당 serviceType 카테고리 탭 자동 펼치기 (단, 즐겨찾기로 이동한 경우는 원본 탭을 펼치지 않는다)
  // selectedGame?.id만 의존성으로 둔다 — viaBookmarks까지 넣으면, "내 커뮤니티"에서 다른 곳(홈 등)으로 나갈 때
  // setViaBookmarks(false)는 즉시 반영되지만 router.push로 인한 selectedGame(=URL 기반) 갱신은 한 박자 늦게 반영되는
  // 타이밍 차이 때문에, 그 사이 렌더에서 "selectedGame은 아직 이전 게임, viaBookmarks만 false"인 순간이 생겨
  // 원치 않게 그 게임의 카테고리를 다시 펼쳐버리는 버그가 있었다(2026-08-19, "내 커뮤니티 갔다가 홈 가면 즐겨찾기한
  // 게임 탭이 펼쳐진 채로 나옴"). viaBookmarks는 계속 클로저로 참조만 하고 의존성에서만 뺀다.
  useEffect(() => {
    if (!selectedGame?.serviceType || viaBookmarks) return
    const catValue = selectedGame.serviceType === 'beta' ? 'beta-game' : selectedGame.serviceType === 'live' ? 'live-game' : null
    if (catValue) setCollapsedCats(prev => ({ ...prev, [catValue]: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame?.id])

  // 하위 탭(subTabs)이 있는 카테고리(공지사항 등): 그 하위 탭이 선택되면 자동 펼치기 (게임 카테고리와 동일 규칙)
  useEffect(() => {
    const parent = CATEGORIES.find(c => c.subTabs?.some(s => s.value === channel))
    if (parent) setCollapsedCats(prev => ({ ...prev, [parent.value]: false }))
  }, [channel])


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
    communityService.getPosts({ channel: 'free', page: 1, limit: 15, sort: 'latest' }).then(d => setFreePosts(d.posts || [])).catch(() => {})
    communityService.getStats().then(d => setHotPosts((d.hotPosts || []).slice(0, 5))).catch(() => {})
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
    setViaBookmarks(false)
    const next = new URLSearchParams(searchParams)
    next.set('gameId', gameId)
    next.set('gameTitle', gameTitle)
    if (serviceType) {
      next.set('gameServiceType', serviceType)
      // 게임을 선택하면 그 게임이 속한 채널로 전환한다 — 사이드바(선택된 게임)와 본문(보여지는 콘텐츠)이 항상 일치해야 함
      const catValue = serviceType === 'beta' ? 'beta-game' : serviceType === 'live' ? 'live-game' : null
      if (catValue) next.set('channel', catValue)
    } else {
      next.delete('gameServiceType')
    }
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
    setCollapsedCats(DEFAULT_COLLAPSED_CATS)
  }

  const handleCategoryClick = (catValue: string) => {
    setViaBookmarks(false)
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
    setCollapsedCats(collapsedStateForCategoryNav(catValue))
  }

  const handleBookmarkedTabClick = (entry: { channel?: string; gameId?: string; label: string }) => {
    if (entry.gameId && entry.channel) {
      handleGameClick(entry.gameId, entry.label, CAT_GAME_SERVICE_TYPE[entry.channel])
    } else if (entry.channel) {
      handleCategoryClick(entry.channel)
    }
    setViaBookmarks(true)
  }

  // 하위 탭(subTabs) 항목 선택 — 게임 목록의 특정 게임 선택(handleGameClick)과 동일 규칙: 펼침 상태를 건드리지 않는다
  const handleSubTabClick = (subValue: string) => {
    setViaBookmarks(false)
    const next = new URLSearchParams(searchParams)
    next.delete('gameId')
    next.delete('gameTitle')
    next.delete('gameServiceType')
    next.set('page', '1')
    next.set('channel', subValue)
    router.push('?' + next.toString())
    setAnnPage(0)
    setGameNoticePage(1)
  }

  const { data: betaGamesData } = useQuery({
    queryKey: ['sidebarGames', 'beta'],
    queryFn: () => gameService.getAllGames({ serviceType: 'beta', limit: 100, includeDeleted: true }),
    staleTime: 5 * 60 * 1000,
  })
  const { data: liveGamesData } = useQuery({
    queryKey: ['sidebarGames', 'live'],
    queryFn: () => gameService.getAllGames({ serviceType: 'live', limit: 100, includeDeleted: true }),
    staleTime: 5 * 60 * 1000,
  })
  const betaGames = betaGamesData?.games ?? []
  const liveGames = liveGamesData?.games ?? []

  // 관리자가 커뮤니티에서 숨긴(hiddenFromCommunity) 게임은 betaGames/liveGames 목록에도 안 잡히므로,
  // 그 게임을 즐겨찾기해뒀던 사용자의 "내 커뮤니티" 목록에서도 같이 숨긴다
  const visibleGameIds = new Set([...betaGames, ...liveGames].map(g => g._id))
  const visibleBookmarkedTabs = (user?.bookmarkedTabs ?? []).filter(entry => !entry.gameId || visibleGameIds.has(entry.gameId))

  // 카테고리 라벨 클릭 — 하위 항목(정적 subTabs 또는 동적 게임 목록)이 있으면 그 첫 항목을 바로 선택해서 자녀 화면으로 진입한다.
  // 부모 자체의 "전체 보기" 화면을 거치지 않는다 — 공지사항/베타게임/라이브게임 전부 동일 규칙.
  const handleCategoryLabelClick = (cat: { value: string; subTabs?: { value: string }[] }) => {
    // 클릭한 카테고리는 (채널 값이 실제로 바뀌든 안 바뀌든) 항상 펼침 상태로 만든다 —
    // 접었다가 같은 하위 탭이 이미 선택된 채로 다시 열려고 하면 channel 값이 안 바뀌어서
    // 펼침 상태를 channel 변경에만 의존하면 안 열리는 버그가 있었음
    setCollapsedCats(prev => ({ ...prev, [cat.value]: false }))
    if (cat.subTabs?.length) { handleSubTabClick(cat.subTabs[0].value); return }
    if (cat.value === 'bookmarks') {
      const first = user?.bookmarkedTabs?.[0]
      if (first) { handleBookmarkedTabClick(first); return }
      handleCategoryClick(cat.value)
      return
    }
    const subGames = cat.value === 'beta-game' ? betaGames : cat.value === 'live-game' ? liveGames : []
    if (subGames.length > 0) {
      const first = subGames[0]
      handleGameClick(first._id!, first.title, first.serviceType as string)
      return
    }
    handleCategoryClick(cat.value)
  }

  const isTabBookmarked = (key: string) => !!user?.bookmarkedTabs?.some(t => t.key === key)

  const toggleTabBookmark = async (e: React.MouseEvent, entry: { key: string; label: string; channel?: string; gameId?: string }) => {
    e.stopPropagation()
    if (!isAuthenticated) { router.push('/login'); return }
    try {
      await authService.toggleBookmarkedTab(entry)
      await updateUser({})
    } catch { /* noop */ }
  }

  const isNoticeTab = channel === 'notice-platform' || channel === 'notice-game'
  const gameNoticeLimit = channel === 'notice-game' ? 20 : 15

  const { data: recentGameNoticesData } = useQuery({
    queryKey: ['recentGameAnnouncements', gameNoticePage, gameNoticeLimit, search, sort],
    queryFn: () => gameService.getRecentGameAnnouncements(gameNoticeLimit, gameNoticePage, channel === 'notice-game' ? search : undefined, sort),
    enabled: isHomePage || channel === 'notice-game',
  })
  const gameNotices: RecentGameAnnouncement[] = recentGameNoticesData?.announcements ?? []
  const gameNoticeTotalPages = recentGameNoticesData?.totalPages ?? 1

  const { data: gameAnnouncementsData } = useQuery({
    queryKey: ['gameAnnouncements', selectedGame?.id],
    queryFn: () => gameService.getAnnouncementsByGame(selectedGame!.id, { limit: 50 }),
    enabled: !!selectedGame?.id,
  })
  const allGameAnnouncements = gameAnnouncementsData?.announcements ?? []
  const ANN_PER_PAGE = 5
  const annTotalPages = Math.ceil(allGameAnnouncements.length / ANN_PER_PAGE)
  const gameAnnouncements = allGameAnnouncements.slice(annPage * ANN_PER_PAGE, (annPage + 1) * ANN_PER_PAGE)

  const isBookmarksTab = channel === 'bookmarks'
  // 신작게임소개는 관리자 전용 작성 채널 — 일반 사용자 글쓰기 진입점을 노출하지 않음
  const isNewGameIntroTab = channel === 'new-game-intro'

  const limit = viewMode === 'small' ? 30 : 20

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page, sort, channel, search, gameId: selectedGame?.id, limit }],
    queryFn: () => communityService.getPosts({
      page, limit, sort,
      channel: channel || undefined,
      search: search || undefined,
      gameId: selectedGame?.id,
    }),
    enabled: !isNoticeTab && !isBookmarksTab,
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

  // 공지 대형 카드 (viewMode==='large'일 때 공지 목록에서 공용으로 사용)
  const renderNoticeLargeCard = (opts: {
    key: string
    title: string
    type: string
    dateStr: string
    authorNode: React.ReactNode
    views: number
    likes: number
    thumbnail?: string | null
    onClick: () => void
  }) => (
    <div key={opts.key} onClick={opts.onClick}
      className="bg-bg-card dark:bg-bg-secondary border border-line rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
      {opts.thumbnail !== undefined && (
        <div className="relative aspect-video bg-bg-tertiary overflow-hidden flex items-center justify-center">
          {opts.thumbnail
            ? <img src={opts.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <Gamepad className="w-10 h-10 text-text-muted" />
          }
        </div>
      )}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{opts.title}</span>
          <NoticeTypeBadge type={opts.type} className="flex-shrink-0" />
          <div className="flex-1" />
          <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{opts.dateStr}</span>
        </div>
        <div className="flex items-center gap-3 mb-2 text-xs text-text-muted">
          {opts.authorNode}
        </div>
        <div className="border-t border-line my-2" />
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{opts.views}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{opts.likes}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
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
              const isActive = isCategoryActive(cat, channel, search, selectedGame, viaBookmarks)
              return (
                <button key={cat.value}
                  onClick={() => {
                    if (isHome) { setViaBookmarks(false); router.push('/community'); setCollapsedCats(DEFAULT_COLLAPSED_CATS) }
                    else if (isBookmarks) handleCategoryClick('bookmarks')
                    else handleCategoryLabelClick(cat)
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
              const subGames = cat.value === 'beta-game' ? betaGames : cat.value === 'live-game' ? liveGames : []
              const subTabs = cat.subTabs || []
              const bookmarkedEntries = isBookmarks ? visibleBookmarkedTabs : []
              const isActive = isCategoryActive(cat, channel, search, selectedGame, viaBookmarks)
              const hasSubGames = subGames.length > 0
              const hasSubItems = hasSubGames || subTabs.length > 0 || bookmarkedEntries.length > 0
              const isCollapsed = !!collapsedCats[cat.value]
              return (
                <div key={cat.value}>
                  <div className={`flex items-center border-l-[3px] transition-colors ${
                    isActive ? 'bg-accent-light border-accent rounded-r-xl' : 'border-transparent rounded-xl hover:bg-bg-tertiary'
                  }`}>
                    {/* 탭 이동 버튼 */}
                    <button
                      onClick={() => {
                        if (isHome) { setViaBookmarks(false); router.push('/community'); setCollapsedCats(DEFAULT_COLLAPSED_CATS) }
                        else if (hasSubItems && !isCollapsed) toggleCollapse(cat.value)
                        else handleCategoryLabelClick(cat)
                      }}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 text-base text-left ${
                        isActive ? 'text-accent font-semibold' : 'text-text-secondary font-medium'
                      }`}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {cat.label}
                    </button>
                    {/* 접기/펼치기 버튼 (하위 탭 있는 카테고리만) */}
                    {hasSubItems && (
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

                  {/* 정적 하위 탭 (공지사항 등) */}
                  {subTabs.length > 0 && !isCollapsed && (
                    <div className="mt-0.5 mb-1 ml-3">
                      {subTabs.map((sub, idx) => {
                        const isLast = idx === subTabs.length - 1 && subGames.length === 0
                        const isSubActive = channel === sub.value
                        return (
                          <div key={sub.value} className="relative flex items-center" style={{ minHeight: 28 }}>
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => handleSubTabClick(sub.value)}
                              className={`ml-4 flex-1 flex items-center gap-1.5 text-left text-base px-2 py-1 rounded-r-lg truncate transition-colors border-l-2 ${
                                isSubActive
                                  ? 'border-accent text-accent font-semibold'
                                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
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
                        const isSelected = selectedGame?.id === game._id && !viaBookmarks
                        return (
                          <div key={game._id} className="relative flex items-center" style={{ minHeight: 28 }}>
                            {/* 꺽은 선: 세로선 */}
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            {/* 꺽은 선: 가로선 */}
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => handleGameClick(game._id!, game.title, game.serviceType as string)}
                              className={`ml-4 flex-1 text-left text-base px-2 py-1 rounded-r-lg truncate transition-colors border-l-2 ${
                                isSelected
                                  ? 'border-accent text-accent font-semibold'
                                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              {game.title}
                            </button>
                            <button
                              onClick={(e) => toggleTabBookmark(e, { key: `game:${game._id}`, label: game.title, channel: cat.value, gameId: game._id })}
                              title={isTabBookmarked(`game:${game._id}`) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                              className={`mr-1 p-1 flex-shrink-0 transition-colors ${isTabBookmarked(`game:${game._id}`) ? 'text-amber-400' : 'text-text-muted hover:text-amber-400'}`}
                            >
                              <Star className={`w-3 h-3 ${isTabBookmarked(`game:${game._id}`) ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 즐겨찾기한 탭 (내 커뮤니티 하위) */}
                  {bookmarkedEntries.length > 0 && !isCollapsed && (
                    <div className="mt-0.5 mb-1 ml-3">
                      {bookmarkedEntries.map((entry, idx) => {
                        const isLast = idx === bookmarkedEntries.length - 1
                        const isSelected = viaBookmarks && (entry.gameId ? selectedGame?.id === entry.gameId : channel === entry.channel)
                        return (
                          <div key={entry.key} className="relative flex items-center" style={{ minHeight: 28 }}>
                            <div className={`absolute left-0 w-px bg-line ${isLast ? 'h-1/2 top-0' : 'h-full'}`} />
                            <div className="absolute left-0 top-1/2 w-3 h-px bg-line" />
                            <button
                              onClick={() => handleBookmarkedTabClick(entry)}
                              className={`ml-4 flex-1 flex items-center gap-1.5 text-left text-base px-2 py-1 rounded-r-lg truncate transition-colors border-l-2 ${
                                isSelected
                                  ? 'border-accent text-accent font-semibold'
                                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              <span className="truncate">{entry.label}</span>
                            </button>
                            <button
                              onClick={(e) => toggleTabBookmark(e, entry)}
                              title="즐겨찾기 해제"
                              className="mr-1 p-1 flex-shrink-0 text-text-muted hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
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

            {/* 홈 탭 커뮤니티 공지 (전체 폭) */}
            {isHomePage && notices.length > 0 && (
              <div className="mb-6 bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-[16.8px] font-semibold">커뮤니티 공지</span>
                  <div className="flex-1" />
                  <button onClick={() => handleSubTabClick('notice-platform')} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</button>
                </div>
                <ul className="flex-1">
                  {homeNotices.map((n, i) => {
                    const dateStr = formatDate(n.createdAt)
                    const noticeThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                    return (
                      <li key={n._id} onClick={() => router.push(`/community/announcement/${n._id}?from=${encodeURIComponent('커뮤니티 공지')}&fromHref=${encodeURIComponent(communityTabHref('notice-platform'))}`)}
                        className={`group flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        {noticeThumb && (
                          <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-bg-tertiary ring-1 ring-black/5 dark:ring-white/10">
                            <img src={noticeThumb.startsWith('http') ? noticeThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${noticeThumb}`} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{n.title}</span>
                          <NoticeTypeBadge type={n.type} className="flex-shrink-0" />
                          <div className="flex-1" />
                          <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                          <span className="text-[13.2px] text-text-secondary">{n.authorId?.username ?? '게임업 관리자'}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{n.likes?.length ?? 0}</span>
                        </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* 신작게임소개 + 커뮤니티 인기글 행 */}
            {isHomePage && (newGamePosts.length > 0 || hotPosts.length > 0) && (
              <div className="mb-6 flex gap-4 items-stretch h-[340px]">

            {/* 신작게임소개 대형 카드 */}
            {newGamePosts.length > 0 && (
              <div className="w-[70.6%] bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">신작게임소개</span>
                  <div className="flex-1" />
                  <button onClick={() => handleCategoryClick('new-game-intro')} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</button>
                </div>
                {(() => {
                  const perPage = 3
                  const totalNewGamePages = Math.ceil(newGamePosts.length / perPage)
                  const page = newGamePage % totalNewGamePages
                  const pagePosts = newGamePosts.slice(page * perPage, page * perPage + perPage)
                  return (
                    <div className="relative flex-1 min-h-0 group/newgame">
                      <div className="flex h-full gap-2 p-2">
                        {pagePosts.map(p => {
                          const thumb = p.images?.[p.thumbnailIndex || 0] || p.images?.[0]
                          const nav = postBackNav(p)
                          return (
                            <div key={p._id}
                              onClick={() => router.push(`/community/${p._id}?from=${encodeURIComponent(nav.label)}&fromHref=${encodeURIComponent(nav.href)}`)}
                              className="flex-1 min-w-0 flex flex-col rounded-lg overflow-hidden bg-bg-tertiary cursor-pointer group/card">
                              <div className="relative flex-1 min-h-0 overflow-hidden bg-bg-tertiary flex items-center justify-center">
                                {thumb
                                  ? <img src={thumb.startsWith('http') ? thumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${thumb}`} alt=""
                                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
                                  : <Gamepad className="w-8 h-8 text-text-muted" />
                                }
                              </div>
                              <p className="text-text-primary text-[13.2px] font-medium truncate px-2 py-1.5 flex-shrink-0 group-hover/card:text-accent transition-colors">{p.title}</p>
                            </div>
                          )
                        })}
                      </div>
                      {totalNewGamePages > 1 && (
                        <>
                          <button onClick={() => setNewGamePage(i => (i - 1 + totalNewGamePages) % totalNewGamePages)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 ring-2 ring-white/70 flex items-center justify-center text-white opacity-0 group-hover/newgame:opacity-100 transition-opacity">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button onClick={() => setNewGamePage(i => (i + 1) % totalNewGamePages)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 ring-2 ring-white/70 flex items-center justify-center text-white opacity-0 group-hover/newgame:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 커뮤니티 인기글 */}
            {hotPosts.length > 0 && (
              <div className="w-[29.4%] ml-auto bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary flex-shrink-0">
                  <Flame className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">커뮤니티 인기글</span>
                </div>
                <ul className="flex-1">
                  {hotPosts.map((p, i) => {
                    const nav = postBackNav(p)
                    return (
                      <li key={p._id} onClick={() => router.push(`/community/${p._id}?from=${encodeURIComponent(nav.label)}&fromHref=${encodeURIComponent(nav.href)}`)}
                        className={`group flex items-center gap-3 px-4 py-2 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        <span className="text-accent text-2xl font-extrabold flex-shrink-0 w-6 text-center leading-none">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{p.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                            <span className="truncate">{nav.label}</span>
                            <span className="flex items-center gap-1 text-accent font-semibold flex-shrink-0"><MessageSquare className="w-3 h-3" />{p.commentCount ?? 0}</span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

              </div>
            )}

            {/* 홈 탭 게임별 공지사항 (전체 폭) */}
            {isHomePage && gameNotices.length > 0 && (
              <div className="mb-6 bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">게임 공지</span>
                  <div className="flex-1" />
                  <button onClick={() => handleSubTabClick('notice-game')} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</button>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {gameNotices.slice(0, 12).map(n => {
                    const dateStr = formatDate(n.createdAt)
                    const ownThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                    const thumbSrc = ownThumb ? (ownThumb.startsWith('http') ? ownThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${ownThumb}`) : null
                    const nNav = gameNoticeNav(n)
                    return (
                      <div key={n._id} onClick={() => router.push(`/community/game-announcement/${n._id}?from=${encodeURIComponent(nNav.label)}&fromHref=${encodeURIComponent(nNav.href)}`)}
                        className="group flex items-center gap-3 p-3 rounded-lg border border-line hover:bg-bg-tertiary transition-colors cursor-pointer">
                        {thumbSrc && (
                          <img src={thumbSrc} alt="" className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{n.title}</span>
                            <NoticeTypeBadge type={n.type} className="flex-shrink-0" />
                            <div className="flex-1" />
                            <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                            <span className="text-[13.2px] text-text-secondary">{n.game?.title ?? '알 수 없는 게임'}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{n.likes?.length ?? 0}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 홈 탭 자유게시판 (전체 폭, 소형 카드) */}
            {isHomePage && freePosts.length > 0 && (
              <div className="mb-6 bg-bg-secondary border border-line rounded-xl overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <MessageSquare className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-text-primary text-sm font-semibold">자유게시판</span>
                  <div className="flex-1" />
                  <button onClick={() => handleCategoryClick('free')} className="text-xs text-text-muted hover:text-accent transition-colors">더보기</button>
                </div>
                <div>
                  {freePosts.slice(0, 15).map((p, i) => (
                    <PostCard key={p._id} post={p} viewMode="small" currentUserId={user?.id} isFirstInList={i === 0} />
                  ))}
                </div>
              </div>
            )}

            {/* 정렬 + 검색 + 보기 모드 (홈 탭 제외) */}
            {!isHomePage && isBookmarksTab && (
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-accent" />
                <span className="text-text-primary text-sm font-semibold">즐겨찾기한 탭</span>
                <span className="text-text-muted text-xs">총 {visibleBookmarkedTabs.length}개</span>
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

              {isAuthenticated && !isBookmarksTab && !isNoticeTab && !isNewGameIntroTab && (
                <button onClick={() => {
                  const params = new URLSearchParams()
                  if (channel && channel !== 'home') params.set('channel', channel)
                  if (selectedGame?.id) params.set('gameId', selectedGame.id)
                  router.push('/community/write' + (params.toString() ? '?' + params.toString() : ''))
                }}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-text-primary px-3 py-1.5 rounded-lg text-base font-medium transition-colors flex-shrink-0">
                  <PenSquare className="w-3.5 h-3.5" /> 글쓰기
                </button>
              )}
            </div>}

            {/* 공지사항 > 커뮤니티 공지 탭 */}
            {channel === 'notice-platform' && notices.length > 0 && (
              <div className="mb-4 bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                </div>
                {viewMode === 'large' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {pagedNotices.map(n => {
                      const dateStr = formatDate(n.createdAt)
                      const noticeThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                      return renderNoticeLargeCard({
                        key: n._id, title: n.title, type: n.type, dateStr,
                        authorNode: <span className="text-[13.2px] text-text-secondary">{n.authorId?.username ?? '게임업 관리자'}</span>,
                        views: n.views ?? 0, likes: n.likes?.length ?? 0,
                        thumbnail: noticeThumb ? (noticeThumb.startsWith('http') ? noticeThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${noticeThumb}`) : undefined,
                        onClick: () => router.push(`/community/announcement/${n._id}?from=${encodeURIComponent('커뮤니티 공지')}&fromHref=${encodeURIComponent(communityTabHref('notice-platform'))}`),
                      })
                    })}
                  </div>
                ) : (
                <ul>
                  {pagedNotices.map((n, i) => {
                    const dateStr = formatDate(n.createdAt)
                    const noticeThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                    return (
                      <li key={n._id} onClick={() => router.push(`/community/announcement/${n._id}?from=${encodeURIComponent('커뮤니티 공지')}&fromHref=${encodeURIComponent(communityTabHref('notice-platform'))}`)}
                        className={`group flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        {noticeThumb && (
                          <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-bg-tertiary ring-1 ring-black/5 dark:ring-white/10">
                            <img src={noticeThumb.startsWith('http') ? noticeThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${noticeThumb}`} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{n.title}</span>
                          <NoticeTypeBadge type={n.type} className="flex-shrink-0" />
                          <div className="flex-1" />
                          <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                          <span className="text-[13.2px] text-text-secondary">{n.authorId?.username ?? '게임업 관리자'}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{n.likes?.length ?? 0}</span>
                        </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                )}
                {noticeTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 px-4 py-2 border-t border-line">
                    <button onClick={() => setNoticePage(p => Math.max(0, p - 1))} disabled={noticePage === 0}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: noticeTotalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setNoticePage(i)}
                        className={`w-7 h-6 rounded text-base font-medium transition-colors ${
                          i === noticePage
                            ? 'bg-accent text-text-primary'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setNoticePage(p => Math.min(noticeTotalPages - 1, p + 1))} disabled={noticePage === noticeTotalPages - 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 공지사항 > 게임 공지 탭 (전체 게임 공지를 시간순으로) — 특정 게임이 선택된 상태면 아래 "게임 선택 시 해당 게임 공지" 섹션과 중복되므로 숨긴다 */}
            {channel === 'notice-game' && !selectedGame && (
              <div className="mb-4 bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-bg-tertiary">
                  <Megaphone className="w-4 h-4 text-accent flex-shrink-0" />
                </div>
                {gameNotices.length === 0 ? (
                  <div className="p-16 text-center text-text-secondary">공지가 없습니다</div>
                ) : viewMode === 'large' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {gameNotices.map(n => {
                      const dateStr = formatDate(n.createdAt)
                      const ownThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                      const thumbSrc = ownThumb ? (ownThumb.startsWith('http') ? ownThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${ownThumb}`) : undefined
                      const nNav = gameNoticeNav(n)
                      return renderNoticeLargeCard({
                        key: n._id, title: n.title, type: n.type, dateStr,
                        thumbnail: thumbSrc,
                        authorNode: <span className="text-[13.2px] text-text-secondary">{n.developer?.username ?? '알 수 없는 개발사'}</span>,
                        views: n.views ?? 0, likes: n.likes?.length ?? 0,
                        onClick: () => router.push(`/community/game-announcement/${n._id}?from=${encodeURIComponent(nNav.label)}&fromHref=${encodeURIComponent(nNav.href)}`),
                      })
                    })}
                  </div>
                ) : (
                  <ul>
                    {gameNotices.map((n, i) => {
                      const dateStr = formatDate(n.createdAt)
                      const ownThumb = n.images?.[n.thumbnailIndex || 0] || n.images?.[0]
                      const thumbSrc = ownThumb ? (ownThumb.startsWith('http') ? ownThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${ownThumb}`) : null
                      const nNav = gameNoticeNav(n)
                      return (
                        <li key={n._id} onClick={() => router.push(`/community/game-announcement/${n._id}?from=${encodeURIComponent(nNav.label)}&fromHref=${encodeURIComponent(nNav.href)}`)}
                          className={`group flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                          {thumbSrc && (
                            <img src={thumbSrc} alt="" className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{n.title}</span>
                              <NoticeTypeBadge type={n.type} className="flex-shrink-0" />
                              <div className="flex-1" />
                              <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                              <span className="text-[13.2px] text-text-secondary">{n.developer?.username ?? '알 수 없는 개발사'}</span>
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.views ?? 0}</span>
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{n.likes?.length ?? 0}</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {gameNoticeTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 px-4 py-2 border-t border-line">
                    <button onClick={() => setGameNoticePage(p => Math.max(1, p - 1))} disabled={gameNoticePage === 1}
                      className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: gameNoticeTotalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setGameNoticePage(i + 1)}
                        className={`w-7 h-6 rounded text-base font-medium transition-colors ${
                          i + 1 === gameNoticePage
                            ? 'bg-accent text-text-primary'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setGameNoticePage(p => Math.min(gameNoticeTotalPages, p + 1))} disabled={gameNoticePage === gameNoticeTotalPages}
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
                </div>
                <ul>
                  {gameAnnouncements.map((ann, i) => {
                    const dateStr = formatDate(ann.createdAt)
                    const ownThumb = ann.images?.[ann.thumbnailIndex || 0] || ann.images?.[0]
                    const thumbSrc = ownThumb ? (ownThumb.startsWith('http') ? ownThumb : `${process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''}${ownThumb}`) : null
                    return (
                      <li key={ann._id} onClick={() => router.push(`/community/game-announcement/${ann._id}?from=${encodeURIComponent(selectedGame?.title ?? '커뮤니티')}&fromHref=${encodeURIComponent(communityTabHref(channel || 'live-game', selectedGame ? { _id: selectedGame.id, title: selectedGame.title, serviceType: selectedGame.serviceType } : undefined))}`)}
                        className={`group flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer ${i !== 0 ? 'border-t border-line' : ''}`}>
                        {thumbSrc && (
                          <img src={thumbSrc} alt="" className="w-[52px] h-[52px] rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-primary text-[14.72px] font-medium truncate group-hover:text-accent transition-colors">{ann.title}</span>
                            <NoticeTypeBadge type={ann.type} className="flex-shrink-0" />
                            <div className="flex-1" />
                            <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
                            <span className="text-[13.2px] text-text-secondary">{(ann as RecentGameAnnouncement).developer?.username ?? '알 수 없는 개발사'}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(ann as RecentGameAnnouncement).views ?? 0}</span>
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{(ann as RecentGameAnnouncement).likes?.length ?? 0}</span>
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

            {/* 즐겨찾기한 탭 안내 (실제 목록은 왼쪽 사이드바 "내 커뮤니티" 하위에 표시) */}
            {!isHomePage && isBookmarksTab && (
              <div className="bg-bg-secondary border border-line rounded-2xl overflow-hidden text-center p-16">
                <Star className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">즐겨찾기한 탭이 없습니다</p>
                <p className="text-text-muted text-sm mt-1">탭 옆의 별표를 눌러 즐겨찾기에 추가해보세요</p>
              </div>
            )}

            {/* 게시글 리스트 */}
            {!isHomePage && !isNoticeTab && !isBookmarksTab && (
              <div className={`${
                viewMode === 'large'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : viewMode === 'medium'
                    ? 'space-y-4'
                    : 'bg-bg-secondary border border-line rounded-2xl overflow-hidden shadow-sm'
              }`}>
                {isLoading ? (
                  <div className="flex justify-center py-20 col-span-full">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className={`text-center col-span-full p-16 ${viewMode === 'small' ? '' : 'bg-bg-card border border-line rounded-2xl'}`}>
                    <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary">게시글이 없습니다</p>
                    {isAuthenticated && !isNewGameIntroTab && (
                      <button onClick={() => {
                        const params = new URLSearchParams()
                        if (channel && channel !== 'home') params.set('channel', channel)
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
                        'beta-game': '베타게임', 'live-game': '라이브게임',
                        'free': '자유게시판', 'new-game-intro': '신작게임소개', 'bookmarks': '내 커뮤니티',
                      }
                      const currentTabLabel = selectedGame?.title ?? TAB_LABELS[channel] ?? '커뮤니티'
                      return posts.map((post, idx) => (
                        <PostCard key={post._id} post={post} currentUserId={user?.id} priority={idx === 0} viewMode={viewMode} onGameClick={handleGameClick} fromLabel={currentTabLabel} isFirstInList={idx === 0} />
                      ))
                    })()}
                  </>
                )}
              </div>
            )}

            {/* 페이지네이션 */}
            {!isHomePage && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-6">
                <button disabled={page <= 1}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page - 1)); router.push('?' + n.toString()) }}
                  className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(i + 1)); router.push('?' + n.toString()) }}
                    className={`w-7 h-6 rounded text-base font-medium transition-colors ${
                      i + 1 === page
                        ? 'bg-accent text-text-primary'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={page >= totalPages}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page + 1)); router.push('?' + n.toString()) }}
                  className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
