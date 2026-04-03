'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import CategoryNav from '@/components/community/CategoryNav'
import TrendingCarousel from '@/components/community/TrendingCarousel'
import PostCard, { ViewMode } from '@/components/community/PostCard'
import communityService, { PostSummary, HotGame } from '@/services/communityService'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/useTheme'
import { useQuery } from '@tanstack/react-query'
import {
  MessageSquare, Loader2, ChevronLeft, ChevronRight,
  PenSquare, Search, Bookmark, Sun, Moon,
  LayoutGrid, StretchHorizontal, List
} from 'lucide-react'

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sort = searchParams.get('sort') || 'latest'
  const channel = searchParams.get('channel') || ''
  const search = searchParams.get('search') || ''
  const page = Number(searchParams.get('page') || 1)
  const [searchInput, setSearchInput] = useState(search)
  const [searchOpen, setSearchOpen] = useState(!!search)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('community-view-mode') as ViewMode) || 'large'
    }
    return 'large'
  })

  const [stats, setStats] = useState<{
    hotPosts: (PostSummary & { likeCount: number })[]
    hotGames: HotGame[]
  } | null>(null)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    router.push('?' + next.toString())
  }

  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page, sort, channel, search }],
    queryFn: () => communityService.getPosts({
      page, limit: 15, sort,
      channel: channel || undefined,
      search: search || undefined,
    }),
  })

  const posts = data?.posts ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  useEffect(() => {
    communityService.getStats().then(setStats).catch(() => {})
  }, [])

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">커뮤니티</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              총 {total.toLocaleString()}개 게시글
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 테마 전환 */}
            <button onClick={toggleTheme}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              title={theme === 'light' ? '다크 모드' : '라이트 모드'}>
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {/* 검색 */}
            <button onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            {/* 북마크 */}
            {isAuthenticated && (
              <Link href="/community/bookmarks"
                className="p-2 rounded-xl text-text-secondary hover:text-accent hover:bg-bg-tertiary transition-colors">
                <Bookmark className="w-5 h-5" />
              </Link>
            )}
            {/* 글쓰기 */}
            {isAuthenticated && (
              <button onClick={() => router.push('/community/write')}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-text-primary px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <PenSquare className="w-4 h-4" /> 글쓰기
              </button>
            )}
          </div>
        </div>

        {/* 검색바 (토글) */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="게시글 검색..."
                autoFocus
                className="flex-1 bg-bg-secondary border border-line text-text-primary text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
              <button type="submit" className="bg-accent hover:bg-accent-hover text-text-primary px-4 rounded-xl transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* 카테고리 탭 네비게이션 */}
        <CategoryNav
          selected={channel}
          onChange={(ch) => setParam('channel', ch)}
          sortBy={sort}
          onSortChange={(s) => setParam('sort', s)}
        />

        {/* PC: 2컬럼 레이아웃 (메인 + 사이드바), 모바일: 1컬럼 */}
        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          {/* 메인 콘텐츠 영역 */}
          <div className="flex-1 min-w-0">
            {/* 캐러셀 위젯배너 - 모바일에서만 표시 (PC는 사이드바) */}
            {stats && (stats.hotPosts?.length > 0 || stats.hotGames?.length > 0) && (
              <div className="mb-4 lg:hidden">
                <TrendingCarousel
                  hotPosts={stats.hotPosts || []}
                  hotGames={stats.hotGames || []}
                />
              </div>
            )}

            {/* 보기 모드 토글 */}
            <div className="flex items-center justify-end gap-1 mb-2">
              <span className="text-xs text-text-muted mr-1">보기</span>
              {([
                { mode: 'large' as ViewMode, icon: LayoutGrid, title: '대형' },
                { mode: 'medium' as ViewMode, icon: StretchHorizontal, title: '중형' },
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

            {/* 게시글 리스트 */}
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
                    <button onClick={() => router.push('/community/write')}
                      className="mt-4 bg-accent hover:bg-accent-hover text-text-primary px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                      첫 글 작성하기
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {posts.map((post, idx) => (
                    <PostCard key={post._id} post={post} currentUserId={user?.id} priority={idx === 0} viewMode={viewMode} />
                  ))}
                </>
              )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button disabled={page <= 1}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page - 1)); router.push('?' + n.toString()) }}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                  return (
                    <button key={p} onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(p)); router.push('?' + n.toString()) }}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-accent text-text-primary'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                      }`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page >= totalPages}
                  onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page + 1)); router.push('?' + n.toString()) }}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* PC 사이드바 - lg 이상에서만 표시 */}
          <aside className="hidden lg:block w-80 flex-shrink-0 space-y-4">
            {/* 트렌딩 캐러셀 */}
            {stats && (stats.hotPosts?.length > 0 || stats.hotGames?.length > 0) && (
              <TrendingCarousel
                hotPosts={stats.hotPosts || []}
                hotGames={stats.hotGames || []}
              />
            )}

            {/* 글쓰기 CTA */}
            {isAuthenticated && (
              <div className="bg-bg-card border border-line rounded-2xl p-5">
                <p className="text-text-secondary text-sm mb-3">커뮤니티에 참여해보세요</p>
                <button onClick={() => router.push('/community/write')}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <PenSquare className="w-4 h-4" /> 글쓰기
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
