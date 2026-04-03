'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { Card, CardContent } from '@/components/Card'
import { Heart, Star, Search, Filter, Loader2, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'
import { gameService } from '@/services/gameService'
import { Game } from '@gameup/types'
import EventBannerCarousel from '@/components/EventBannerCarousel'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='256' viewBox='0 0 400 256'%3E%3Crect fill='%231e293b' width='400' height='256'/%3E%3Ctext fill='%23334155' font-family='sans-serif' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EGame%3C/text%3E%3C/svg%3E"

const GENRES = ['전체', 'RPG', '액션', 'FPS', '전략', '퍼즐', '스포츠', '레이싱', '어드벤처', '시뮬레이션']
const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'rating', label: '평점순' },
]

function GameCard({ game }: { game: Game }) {
  const router = useRouter()
  const id = (game as any)._id || game.id
  const [favorite, setFavorite] = useState(false)

  const statusLabel = game.status === 'beta' ? '베타' : game.status === 'published' ? '공개' : game.status
  const statusClass =
    game.status === 'beta'
      ? 'bg-accent text-text-primary'
      : 'bg-blue-600/80 text-text-primary'

  return (
    <div className="cursor-pointer group" onClick={() => router.push(`/games/${id}`)}>
      <Card className="bg-bg-secondary/50 border-2 border-accent-muted overflow-hidden hover:border-accent transition-all h-full">
        <div className="relative h-48 overflow-hidden">
          <Image
            src={game.thumbnail || PLACEHOLDER}
            alt={game.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            unoptimized
          />
          <div className="absolute top-3 left-3">
            <Badge className={statusClass}>{statusLabel}</Badge>
          </div>
          <div className="absolute top-3 right-3">
            <button
              className="w-8 h-8 rounded-full bg-bg-primary/70 backdrop-blur-sm flex items-center justify-center hover:bg-bg-tertiary transition-colors"
              onClick={(e) => { e.stopPropagation(); setFavorite((f) => !f) }}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1 text-text-primary truncate">{game.title}</h3>
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">{game.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(game.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-text-muted'
                  }`}
                />
              ))}
              <span className="text-xs text-text-secondary ml-1">{(game.rating || 0).toFixed(1)}</span>
            </div>
            <span className="text-xs text-text-muted">{(game.playCount || 0).toLocaleString()} 플레이</span>
          </div>
          {game.genre && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs border-accent-muted text-accent">
                {game.genre}
              </Badge>
            </div>
          )}
          {game.isPaid && game.price ? (
            <div className="mt-2 text-sm font-semibold text-yellow-400">₩{game.price.toLocaleString()}</div>
          ) : (
            <div className="mt-2 text-sm font-semibold text-accent">무료</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function GameListPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('전체')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [eventBanners, setEventBanners] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/event-banners')
      .then(r => r.json())
      .then(data => setEventBanners(data.banners || []))
      .catch(() => {})
  }, [])

  const loadGames = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { sort, page, limit: 12 }
      if (search.trim()) params.search = search.trim()
      if (selectedGenre !== '전체') params.genre = selectedGenre

      const data = await gameService.getAllGames(params)
      setGames(data.games || [])
      if ((data as any).pagination) {
        setTotalPages((data as any).pagination.pages || 1)
        setTotalCount((data as any).pagination.total || 0)
      }
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [search, selectedGenre, sort, page])

  useEffect(() => {
    loadGames()
  }, [loadGames])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadGames()
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      {/* Event Banner Carousel */}
      {eventBanners.length > 0 && (
        <section className="container mx-auto px-4 pt-6">
          <EventBannerCarousel banners={eventBanners} />
        </section>
      )}

      {/* Header */}
      <section className="bg-gradient-to-b from-bg-secondary to-bg-primary border-b border-line py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-accent-light text-accent border border-green-600/50 px-4 py-1">
              ⚡ 베타 테스트 진행중
            </Badge>
            <h1 className="text-4xl font-bold mb-3">
              <span className="text-accent">베타존</span> 게임 목록
            </h1>
            <p className="text-text-secondary">승인된 모든 베타 게임을 탐색하고 참여하세요</p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="게임 이름 또는 설명 검색..."
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent-hover px-4 py-1.5 rounded text-sm font-medium transition-colors"
            >
              검색
            </button>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
          {/* Genre Filter */}
          <div className="flex flex-wrap gap-2">
            <Filter className="w-4 h-4 text-text-secondary self-center" />
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => { setSelectedGenre(genre); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedGenre === genre
                    ? 'bg-accent text-text-primary'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">정렬:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSort(opt.value); setPage(1) }}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  sort === opt.value
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-text-secondary mb-6">
            총 <span className="text-text-primary font-semibold">{totalCount}</span>개의 게임
          </p>
        )}

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
              {search || selectedGenre !== '전체'
                ? '검색 조건을 변경해 보세요.'
                : '현재 등록된 베타 게임이 없습니다. 잠시 후 다시 확인해 주세요.'}
            </p>
            {(search || selectedGenre !== '전체') && (
              <Button
                className="mt-6 bg-accent hover:bg-accent-hover"
                onClick={() => { setSearch(''); setSelectedGenre('전체'); setPage(1) }}
              >
                필터 초기화
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  className="w-10 h-10 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      page === i + 1
                        ? 'bg-accent text-text-primary'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors"
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
