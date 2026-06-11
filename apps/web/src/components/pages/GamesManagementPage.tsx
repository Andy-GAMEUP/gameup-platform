'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Plus, Search, Star, RefreshCw, Settings } from 'lucide-react'
import { gameService } from '@/services/gameService'
import DeleteGameModal from '@/components/DeleteGameModal'

interface Game {
  _id: string
  title: string
  thumbnail?: string | null
  genre: string
  status: string
  approvalStatus: string
  serviceType?: string
  monetization: string
  playCount: number
  testers?: number
  rating: number
  createdAt: string
  betaEndDate?: string
  description?: string
  bannerImage?: string
  hasScreenshots?: boolean
  ratingCertificate?: { ratingClass?: string }
  suspendedAt?: string
  suspendReason?: string
}

const approvalBadge: Record<string, string> = {
  not_submitted: 'bg-bg-tertiary/40 text-text-muted border border-line/50',
  approved: 'bg-accent-light text-accent border border-accent-muted',
  pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  review:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/50',
}
// 요구사항: 승인상태 = 미제출 / 심사중 / 반려 / 완료
const approvalLabel: Record<string, string> = {
  not_submitted: '초안 작성 중',
  approved: '완료',
  pending:  '심사중',
  review:   '심사중',
  rejected: '심사 거부',
}

// 요구사항: 서비스 = 베타 / 라이브 / 종료
const getServiceDisplay = (game: Game): { label: string; className: string } => {
  if (game.status === 'archived' || game.serviceType === 'ended') {
    return { label: '종료', className: 'bg-orange-500 text-white border-orange-400' }
  }
  if (game.serviceType === 'live' || game.status === 'published') {
    return { label: '라이브', className: 'bg-accent text-white border-accent shadow-sm shadow-accent/40' }
  }
  return { label: '베타', className: 'bg-blue-500 text-white border-blue-400 shadow-sm shadow-blue-500/40' }
}

// 요구사항: 수익모델 4종 - 무료, 광고, 유료, 프리미엄
const monetizationLabel: Record<string, string> = {
  free:     '무료',
  ad:       '광고',
  paid:     '유료',
  freemium: '프리미엄',
}

export default function GamesManagementPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null)

  const loadGames = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await gameService.getMyGames()
      setGames((data.games || []) as unknown as Game[])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '게임 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGames() }, [])

const filteredGames = games.filter((game) =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isPending = (g: Game) => g.approvalStatus === 'pending' || g.approvalStatus === 'review'
  const liveGames = games.filter(g => g.serviceType === 'live' || g.status === 'published')
  const betaGames = games.filter(g => !liveGames.includes(g) && g.status !== 'archived' && g.serviceType !== 'ended')

  const stats = [
    { label: '전체 게임', value: games.length,                                              color: 'text-text-primary',  sub: null },
    { label: '초안 작성 중',    value: games.filter(g => g.approvalStatus === 'not_submitted').length, color: 'text-text-muted', sub: null },
    { label: '라이브',    value: liveGames.length, color: 'text-accent',   sub: liveGames.filter(isPending).length },
    { label: '베타',      value: betaGames.length, color: 'text-blue-400', sub: betaGames.filter(isPending).length },
    { label: '심사 거부',  value: games.filter(g => g.approvalStatus === 'rejected').length, color: 'text-red-400', sub: null },
  ]

  const formatEndDate = (game: Game): string => {
    // 베타: betaEndDate 표시, 그 외: '유지'
    if ((game.serviceType === 'beta' || game.status === 'beta') && game.betaEndDate) {
      return new Date(game.betaEndDate).toLocaleDateString('ko-KR')
    }
    return '유지'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">게임 관리</h1>
          <p className="text-text-secondary">등록된 게임을 관리하세요</p>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-bg-secondary border border-line rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="게임 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadGames} className="text-xs underline">다시 시도</button>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 게임이 없습니다.'}
            {!searchQuery && (
              <div className="mt-4 flex justify-center">
                <Link href="/upload">
                  <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> 첫 게임 등록하기
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
            {filteredGames.map((game) => {
              const service      = getServiceDisplay(game)
              const isLive       = service.label === '라이브'
              const isBeta       = service.label === '베타'
              const isPublished  = game.status === 'published'
              const topBorder    = isLive ? 'border-t-accent' : isBeta ? 'border-t-blue-500' : 'border-t-gray-600'
              const cardBorder   = isPublished ? 'border-transparent' : 'border-gray-400'
              const thumbSrc  = game.thumbnail
                ? (game.thumbnail.startsWith('http') || game.thumbnail.startsWith('/uploads/')
                    ? game.thumbnail
                    : `/uploads/thumbnails/${game.thumbnail.split('/').pop()}`)
                : null

              return (
                <div key={game._id} className={`group flex flex-col rounded-2xl border-2 ${cardBorder} border-t-4 ${topBorder} bg-bg-secondary hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200`}>

                  {/* 상단: 썸네일 + 제목 */}
                  <div className="flex items-start gap-3 pt-5 px-5 pb-2.5">
                    <div className="flex-shrink-0 w-[74px] h-[74px] rounded-xl overflow-hidden border border-line/40 bg-bg-tertiary">
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={game.title} className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[26px]">🎮</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-text-primary truncate leading-tight text-[19px]">{game.title}</p>
                        {game.rating > 0 && (
                          <span className="flex-shrink-0 flex items-center gap-0.5 text-xs text-yellow-400 font-medium ml-auto">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {game.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[13px] text-text-muted">{game.genre}</span>
                        {game.suspendedAt && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            강제 중지
                          </span>
                        )}
                        {!game.suspendedAt && game.approvalStatus === 'not_submitted' && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                            초안 작성 중
                          </span>
                        )}
                        {!game.suspendedAt && (game.approvalStatus === 'pending' || game.approvalStatus === 'review') && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-yellow-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                            심사중
                          </span>
                        )}
                        {!game.suspendedAt && game.approvalStatus === 'approved' && game.status === 'published' && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-blue-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            운영 중
                          </span>
                        )}
                        {!game.suspendedAt && game.approvalStatus === 'approved' && game.status !== 'published' && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-accent">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            출시 대기
                          </span>
                        )}
                        {!game.suspendedAt && game.approvalStatus === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-[15px] font-medium text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            심사 거부
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 구분선 + 서비스 뱃지 */}
                  <div className="flex items-center px-4">
                    <div className="flex-1 h-[2px] bg-line" />
                    <span className={`mx-2 text-[13px] px-2.5 py-0.5 rounded-full border font-bold ${service.className}`}>
                      {service.label}
                    </span>
                    <div className="flex-1 h-[2px] bg-line" />
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex flex-col gap-1.5 p-2.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/games/${game._id}`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1 py-1 text-text-secondary hover:text-text-primary bg-bg-tertiary border border-line/60 hover:border-line rounded-md transition-colors text-[11px] font-semibold">
                          <Eye className="w-[15px] h-[15px]" />
                          미리보기
                        </button>
                      </Link>
                      <Link href={`/games-management/${game._id}/manage`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1 py-1 text-white bg-violet-500/70 hover:bg-violet-500/90 border border-violet-400/60 rounded-md transition-colors text-[11px] font-semibold shadow-sm shadow-violet-500/20">
                          <Settings className="w-[15px] h-[15px]" />
                          관리
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteGameModal
          gameId={deleteTarget._id}
          gameTitle={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setGames(prev => prev.filter(g => g._id !== deleteTarget._id))
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
