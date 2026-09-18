'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/Button'
import { Search, Loader2, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'
import { gameService } from '@/services/gameService'
import { playerService } from '@/services/playerService'
import { useAuth } from '@/lib/useAuth'
import { Game } from '@gameup/types'
import EventBannerCarousel from '@/components/EventBannerCarousel'
import { formatDate } from '@/lib/formatDate'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='256' viewBox='0 0 400 256'%3E%3Crect fill='%231e293b' width='400' height='256'/%3E%3Ctext fill='%23334155' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EGame%3C/text%3E%3C/svg%3E"

import { FILTER_GENRES as GENRES } from '@/constants/game'

// 베타존 전용 테스트 단계 — 종료일이 지났으면 종료, 시작일이 지났으면 진행 중, 그 전이면 시작 전(모집 중)
function getBetaPhase(game: Game): 'before' | 'active' | 'ended' {
  const now = new Date()
  const start = game.startDate ? new Date(game.startDate) : null
  const end = game.endDate ? new Date(game.endDate) : null
  if (end && now > end) return 'ended'
  if (start && now >= start) return 'active'
  return 'before'
}

function GameCard({ game }: { game: Game }) {
  const router = useRouter()
  const id = (game as any)._id || game.id
  const phase = getBetaPhase(game)
  const testers = game.testers ?? 0
  const maxTesters = game.maxTesters ?? 0
  const isFull = maxTesters > 0 && testers >= maxTesters
  const remaining = maxTesters - testers
  const startDateVal = game.startDate ? new Date(game.startDate) : null
  const daysUntilStart = startDateVal ? (startDateVal.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : null
  const isStartingSoon = daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 5
  const isClosingSoon = phase === 'before' && !isFull && ((maxTesters > 0 && remaining <= 10) || isStartingSoon)

  return (
    <div
      className={`group h-full ${phase === 'ended' ? '' : 'cursor-pointer'}`}
      onClick={() => { if (phase !== 'ended') router.push(`/games/${id}`) }}
    >
      <div className={`h-full flex flex-col rounded-2xl overflow-hidden bg-bg-tertiary border-2 border-gray-300 dark:border-gray-600 transition-colors ${phase === 'ended' ? '' : 'group-hover:border-gray-500 dark:group-hover:border-gray-400'}`}>
        <div className="relative aspect-[5/5]">
          <Image
            src={game.thumbnail || PLACEHOLDER}
            alt={game.title}
            fill
            className={`object-cover transition-transform duration-500 ${phase === 'ended' ? '' : 'group-hover:scale-105'}`}
            unoptimized
          />
          {isClosingSoon && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-semibold">마감임박</span>
          )}
          {phase === 'before' && (
            <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md text-xs font-semibold ${isFull ? 'bg-gray-600 text-white' : 'bg-accent text-white'}`}>
              {isFull ? '모집 완료' : '베타 모집 중'}
            </span>
          )}
        </div>
        <div className={`p-2 flex-1 flex flex-col ${phase === 'ended' ? 'opacity-40' : ''}`}>
          <div>
            <h3 className="text-[18.2px] font-semibold text-text-primary truncate">{game.title}</h3>
            <p className="text-xs text-text-muted mt-[2.4px] pl-1">
              {phase === 'before'
                ? (game.startDate ? `${formatDate(game.startDate)} 테스트 시작` : '테스트 시작 전')
                : phase === 'active' ? '테스트 중' : '테스트 종료'}
            </p>
          </div>
          <div className="mt-auto pt-1.5 pl-1 flex items-center justify-between gap-2">
            <span className={`text-xs ${isClosingSoon ? 'text-red-500 font-semibold' : 'text-text-muted'}`}>
              {maxTesters > 0 ? `참여 ${testers.toLocaleString()}/${maxTesters.toLocaleString()}명` : `참여 ${testers.toLocaleString()}명`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 플레이 중인 게임 — 한 줄로 최근 플레이한 순서(왼쪽부터), 넘치면 마우스 드래그로 스크롤
// 아이콘 폭은 게임 카드 그리드와 완전히 동일한 CSS 계산식(calc)으로 맞춘다 — JS 실측 방식은 타이밍에 따라 어긋나서 폐기함
// 게임 카드 그리드 쪽 폭/간격(`xl:max-w-[77%]`, `gap-x-[85px]`, 4열)을 바꾸면 아래 calc식도 반드시 같이 바꿀 것
function PlayedGamesRow({ games }: { games: { _id: string; title: string; thumbnail?: string; subIcon?: string }[] }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const startX = useRef(0)
  const startScrollLeft = useRef(0)

  if (games.length === 0) return null

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    dragging.current = true
    moved.current = false
    startX.current = e.pageX
    startScrollLeft.current = scrollRef.current.scrollLeft
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !scrollRef.current) return
    const dx = e.pageX - startX.current
    if (Math.abs(dx) > 5) moved.current = true
    scrollRef.current.scrollLeft = startScrollLeft.current - dx
  }
  const endDrag = () => { dragging.current = false }

  return (
    <div className="mb-8">
      {/* 폭 제한(xl:max-w-[77%])은 이 컴포넌트가 아니라 호출부(BetazonePage 본문)의 공유 래퍼에서 그리드와 함께 준다 — 항상 동일 폭 유지, 2026-09-15 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-text-primary font-semibold text-lg">플레이 중인 게임</span>
      </div>
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="flex gap-4 overflow-x-auto cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {games.map((g) => (
          <div
            key={g._id}
            onClick={() => { if (!moved.current) router.push(`/games/${g._id}`) }}
            className="flex-shrink-0 min-w-0 w-[109.85px] xl:w-[calc((100%_-_255px)/4*0.624)] cursor-pointer"
          >
            <div className="relative aspect-[20/9] rounded-xl overflow-hidden bg-bg-tertiary border-2 border-gray-300 dark:border-gray-600 pointer-events-none">
              <Image src={g.subIcon || PLACEHOLDER} alt={g.title} fill sizes="115px" className="object-cover" />
            </div>
            <p className="w-full text-sm text-text-primary mt-1.5 line-clamp-2 text-left pointer-events-none">{g.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BetazonePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('전체')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [eventBanners, setEventBanners] = useState<any[]>([])
  const [myGamesOnly, setMyGamesOnly] = useState(false)
  const [playedIds, setPlayedIds] = useState<string[] | null>(null)
  const [recentGames, setRecentGames] = useState<{ _id: string; title: string; thumbnail?: string; subIcon?: string }[]>([])

  useEffect(() => {
    if (!isAuthenticated) { setRecentGames([]); return }
    playerService.getMyRecentGames('beta')
      .then(data => setRecentGames(data.games || []))
      .catch(() => setRecentGames([]))
  }, [isAuthenticated])

  // 헤더 검색창 — 더 이상 아래 게임 카드 목록을 필터링하지 않고, 입력창 아래 드롭다운으로 결과만 보여준다
  const [dropdownResults, setDropdownResults] = useState<Game[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/event-banners')
      .then(r => r.json())
      .then(data => setEventBanners(data.banners || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setDropdownResults([])
      setDropdownOpen(false)
      return
    }
    const t = setTimeout(async () => {
      try {
        const data = await gameService.quickSearchGames(q, 'beta')
        setDropdownResults(data.games || [])
        setDropdownOpen(true)
      } catch {
        setDropdownResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      const inDesktop = desktopSearchRef.current?.contains(t)
      const inMobile = mobileSearchRef.current?.contains(t)
      if (!inDesktop && !inMobile) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goToGame = (id: string) => {
    setDropdownOpen(false)
    router.push(`/games/${id}`)
  }

  const loadGames = useCallback(async () => {
    setLoading(true)
    try {
      if (myGamesOnly && (!playedIds || playedIds.length === 0)) {
        setGames([])
        setTotalPages(1)
        return
      }

      const params: any = { sort: 'newest', page, limit: 12, serviceType: 'beta' }
      if (selectedGenre !== '전체') params.genre = selectedGenre
      if (myGamesOnly && playedIds) params.ids = playedIds.join(',')

      const data = await gameService.getAllGames(params)
      setGames(data.games || [])
      if ((data as any).pagination) {
        setTotalPages((data as any).pagination.pages || 1)
      }
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [selectedGenre, page, myGamesOnly, playedIds])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  // 테스트 종료된 게임은 정렬 순서와 무관하게 항상 맨 뒤로 보낸다
  const sortedGames = useMemo(() => {
    const notEnded = games.filter(g => getBetaPhase(g) !== 'ended')
    const ended = games.filter(g => getBetaPhase(g) === 'ended')
    return [...notEnded, ...ended]
  }, [games])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (dropdownResults[0]) goToGame((dropdownResults[0] as any)._id)
  }

  const handleSelectGenre = (genre: string) => {
    setSelectedGenre(genre)
    setMyGamesOnly(false)
    setPage(1)
  }

  const handleToggleMyGames = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (myGamesOnly) return // 다른 태그와 동일하게, 이미 선택된 태그를 다시 눌러도 유지
    try {
      const data = await playerService.getMyPlayedGameIds()
      setPlayedIds(data.gameIds)
    } catch {
      setPlayedIds([])
    }
    setSelectedGenre('전체')
    setMyGamesOnly(true)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setSelectedGenre('전체')
    setMyGamesOnly(false)
    setPage(1)
  }

  return (
    <div className="accent-green min-h-screen bg-bg-primary text-text-primary accent-green">
      <Navbar />

      {/* Event Banner Carousel */}
      {eventBanners.length > 0 && (
        <section className="container mx-auto px-4 pt-6">
          <EventBannerCarousel banners={eventBanners} />
        </section>
      )}

      {/* Header */}
      <section className="bg-gradient-to-b from-bg-secondary to-bg-primary border-b border-line pt-[43px] pb-[24px]">
        <div className="container mx-auto px-4 relative">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-[35px] bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
              베타존
            </h1>
            <p className="text-text-secondary text-base sm:text-lg">베타 테스트 중인 게임을 탐색하고 참여하세요</p>
          </div>

          {/* Search — 설명과 같은 줄 높이, 오른쪽에 배치(설명 자체는 원래 위치인 중앙 정렬 유지) */}
          <div ref={desktopSearchRef} className="hidden md:block absolute right-4 bottom-0 w-[322px]">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { if (dropdownResults.length > 0) setDropdownOpen(true) }}
                placeholder="게임 검색하기"
                className="w-full bg-bg-tertiary border border-line rounded-full pl-4 pr-10 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-accent-hover transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
            {dropdownOpen && search.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-line rounded-xl overflow-hidden z-20 max-h-96 overflow-y-auto">
                {dropdownResults.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-text-muted">검색 결과가 없습니다.</div>
                ) : (
                  dropdownResults.map((g: any) => (
                    <button
                      key={g._id}
                      onClick={() => goToGame(g._id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left"
                    >
                      <div className="relative w-14 aspect-[20/9] rounded-md overflow-hidden flex-shrink-0 bg-bg-tertiary">
                        <Image src={g.subIcon || PLACEHOLDER} alt={g.title} fill sizes="60px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{g.title}</p>
                        {g.genre && <p className="text-xs text-text-muted truncate">{g.genre}</p>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 모바일 — 넓은 화면에서만 헤더에 얹으므로, 좁은 화면에선 아래쪽에 별도로 노출 */}
        <div ref={mobileSearchRef} className="container mx-auto px-4 mt-4 md:hidden relative">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => { if (dropdownResults.length > 0) setDropdownOpen(true) }}
              placeholder="게임 검색하기"
              className="w-full bg-bg-tertiary border border-line rounded-full pl-4 pr-10 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-accent-hover transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
          {dropdownOpen && search.trim() && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-bg-secondary border border-line rounded-xl overflow-hidden z-20 max-h-96 overflow-y-auto">
              {dropdownResults.length === 0 ? (
                <div className="px-3 py-3 text-sm text-text-muted">검색 결과가 없습니다.</div>
              ) : (
                dropdownResults.map((g: any) => (
                  <button
                    key={g._id}
                    onClick={() => goToGame(g._id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <div className="relative w-14 aspect-[20/9] rounded-md overflow-hidden flex-shrink-0 bg-bg-tertiary">
                      <Image src={g.subIcon || PLACEHOLDER} alt={g.title} fill sizes="60px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{g.title}</p>
                      {g.genre && <p className="text-xs text-text-muted truncate">{g.genre}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 pt-6 pb-12">
        {/* 장르/내 게임 태그 — UI에서만 숨김(2026-09-15), 아래 필터 로직/상태는 유지 */}

        {/* "플레이 중인 게임"과 게임 그리드는 항상 같은 폭 — 폭 제한(xl:max-w-[77%])을 이 공유 래퍼 하나에서만 준다. 2026-09-15, 사용자가 "다르게 이야기하기 전까지" 유지하라고 명시 */}
        <div className="xl:max-w-[77%] xl:mx-auto">
          <PlayedGamesRow games={recentGames} />

          {/* Game Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-24 text-text-secondary">
              <Gamepad2 className="w-20 h-20 mx-auto mb-6 opacity-20" />
              <p className="text-xl font-semibold mb-2">게임을 찾을 수 없습니다</p>
              <p className="text-sm">
                {myGamesOnly
                  ? '플레이 중인 게임이 없습니다.'
                  : search || selectedGenre !== '전체'
                  ? '검색 조건을 변경해 보세요.'
                  : '현재 등록된 베타 게임이 없습니다. 잠시 후 다시 확인해 주세요.'}
              </p>
              {(search || selectedGenre !== '전체' || myGamesOnly) && (
                <Button
                  className="mt-6 bg-accent hover:bg-accent-hover"
                  onClick={resetFilters}
                >
                  필터 초기화
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-[85px] gap-y-[28px]">
                {sortedGames.map((game) => (
                  <GameCard key={(game as any)._id || game.id} game={game} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-10 h-10 rounded-full bg-bg-tertiary hover:bg-bg-tertiary flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-full text-base font-medium transition-colors ${
                        page === i + 1
                          ? 'bg-accent text-text-primary'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-10 h-10 rounded-full bg-bg-tertiary hover:bg-bg-tertiary flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-bg-secondary border-t border-line mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-text-secondary">
          <p>&copy; 2026 GameUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
