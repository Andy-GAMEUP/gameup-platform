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

const PLACEHOLDER = 'https://via.placeholder.com/400x256/1e293b/334155?text=Game'

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
      ? 'bg-green-600/80 text-white'
      : 'bg-blue-600/80 text-white'

  return (
    <div className="cursor-pointer group" onClick={() => router.push(`/games/${id}`)}>
      <Card className="bg-slate-900/50 border-2 border-green-500/30 overflow-hidden hover:border-green-500 transition-all h-full">
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
              className="w-8 h-8 rounded-full bg-slate-950/70 backdrop-blur-sm flex items-center justify-center hover:bg-slate-900 transition-colors"
              onClick={(e) => { e.stopPropagation(); setFavorite((f) => !f) }}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1 text-white truncate">{game.title}</h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">{game.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(game.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-1">{(game.rating || 0).toFixed(1)}</span>
            </div>
            <span className="text-xs text-slate-500">{(game.playCount || 0).toLocaleString()} 플레이</span>
          </div>
          {game.genre && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs border-green-500/40 text-green-400">
                {game.genre}
              </Badge>
            </div>
          )}
          {game.isPaid && game.price ? (
            <div className="mt-2 text-sm font-semibold text-yellow-400">₩{game.price.toLocaleString()}</div>
          ) : (
            <div className="mt-2 text-sm font-semibold text-green-400">무료</div>
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
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-green-600/20 text-green-400 border border-green-600/50 px-4 py-1">
              ⚡ 베타 테스트 진행중
            </Badge>
            <h1 className="text-4xl font-bold mb-3">
              <span className="text-green-400">베타존</span> 게임 목록
            </h1>
            <p className="text-slate-400">승인된 모든 베타 게임을 탐색하고 참여하세요</p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="게임 이름 또는 설명 검색..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-green-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded text-sm font-medium transition-colors"
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
            <Filter className="w-4 h-4 text-slate-400 self-center" />
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => { setSelectedGenre(genre); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedGenre === genre
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">정렬:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSort(opt.value); setPage(1) }}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  sort === opt.value
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-sm text-slate-400 mb-6">
            총 <span className="text-white font-semibold">{totalCount}</span>개의 게임
          </p>
        )}

        {/* Game Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <Gamepad2 className="w-20 h-20 mx-auto mb-6 opacity-20" />
            <p className="text-xl font-semibold mb-2">게임을 찾을 수 없습니다</p>
            <p className="text-sm">
              {search || selectedGenre !== '전체'
                ? '검색 조건을 변경해 보세요.'
                : '현재 등록된 베타 게임이 없습니다. 잠시 후 다시 확인해 주세요.'}
            </p>
            {(search || selectedGenre !== '전체') && (
              <Button
                className="mt-6 bg-green-600 hover:bg-green-700"
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
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      page === i + 1
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-slate-400">
          <p>&copy; 2026 GameUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
