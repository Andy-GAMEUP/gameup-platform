'use client'
import { Fragment, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/Button'
import { Search, Loader2, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'
import { gameService } from '@/services/gameService'
import { playerService } from '@/services/playerService'
import { useAuth } from '@/lib/useAuth'
import { Game } from '@gameup/types'
import StarRating from '@/components/StarRating'
import EventBannerCarousel from '@/components/EventBannerCarousel'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='256' viewBox='0 0 400 256'%3E%3Crect fill='%231e293b' width='400' height='256'/%3E%3Ctext fill='%23334155' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EGame%3C/text%3E%3C/svg%3E"

import { FILTER_GENRES as GENRES } from '@/constants/game'

function GameCard({ game }: { game: Game }) {
  const router = useRouter()
  const id = (game as any)._id || game.id

  return (
    <div className="cursor-pointer group h-full" onClick={() => router.push(`/games/${id}`)}>
      <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-bg-tertiary border-2 border-gray-300 dark:border-gray-600 group-hover:border-gray-500 dark:group-hover:border-gray-400 transition-colors">
        <div className="relative aspect-[5/5]">
          <Image
            src={game.thumbnail || PLACEHOLDER}
            alt={game.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        </div>
        <div className="p-2 flex-1 flex flex-col">
          <div>
            <h3 className="text-[18.2px] font-semibold text-text-primary truncate">{game.title}</h3>
            <p className="text-xs text-text-muted mt-[2.4px] pl-1">{game.description}</p>
          </div>
          <div className="mt-auto pt-1.5 pl-1">
            <div className="flex items-center gap-1">
              <StarRating value={Math.round(game.rating || 0)} size={3.5} />
              <span className="text-yellow-400 font-bold text-xs ml-1">{(game.rating || 0).toFixed(1)}</span>
            </div>
            {game.genre && (
              <p className="text-xs text-accent mt-1.5">{game.genre}</p>
            )}
          </div>
        </div>
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

  useEffect(() => {
    fetch('/api/event-banners')
      .then(r => r.json())
      .then(data => setEventBanners(data.banners || []))
      .catch(() => {})
  }, [])

  const loadGames = useCallback(async () => {
    setLoading(true)
    try {
      if (myGamesOnly && (!playedIds || playedIds.length === 0)) {
        setGames([])
        setTotalPages(1)
        return
      }

      const params: any = { sort: 'newest', page, limit: 12, serviceType: 'beta' }
      if (search.trim()) params.search = search.trim()
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
  }, [search, selectedGenre, page, myGamesOnly, playedIds])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadGames()
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
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-[35px] bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
              베타존
            </h1>
            <p className="text-text-secondary text-base sm:text-lg">베타 테스트 중인 게임을 탐색하고 참여하세요</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pt-6 pb-12">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-10">
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Fragment key={genre}>
                <button
                  onClick={() => handleSelectGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors ${
                    selectedGenre === genre && !myGamesOnly
                      ? 'bg-accent text-text-primary'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  {genre}
                </button>
                {genre === '전체' && (
                  <button
                    onClick={handleToggleMyGames}
                    className={`px-3 py-1.5 rounded-full text-base font-medium transition-colors ${
                      myGamesOnly
                        ? 'bg-accent text-text-primary'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                    }`}
                  >
                    내 게임
                  </button>
                )}
              </Fragment>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative w-full md:w-[403px] flex-shrink-0 md:ml-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="게임 이름 또는 설명 검색..."
              className="w-full bg-bg-tertiary border border-line rounded-full pl-4 pr-10 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-accent-hover transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-[122px] gap-y-[28px]">
              {games.map((game) => (
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

      {/* Footer */}
      <footer className="bg-bg-secondary border-t border-line mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-text-secondary">
          <p>&copy; 2026 GameUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
