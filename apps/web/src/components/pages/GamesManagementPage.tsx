'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Plus, Search, Star, RefreshCw, Settings, ChevronDown, ChevronUp } from 'lucide-react'
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
  statusBeforeSuspend?: string
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
  if (game.serviceType === 'beta') {
    return { label: '베타', className: 'bg-blue-500 text-white border-blue-400 shadow-sm shadow-blue-500/40' }
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

function GameCard({ game }: { game: Game }) {
  const service = getServiceDisplay(game)
  const isSuspended = !!game.suspendedAt
  const thumbSrc = game.thumbnail
    ? (game.thumbnail.startsWith('http') || game.thumbnail.startsWith('/uploads/')
        ? game.thumbnail
        : `/uploads/thumbnails/${game.thumbnail.split('/').pop()}`)
    : null

  return (
    <div className="group flex flex-col rounded-xl bg-bg-secondary border border-line/40 hover:border-line/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* 썸네일 */}
      <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
        {thumbSrc ? (
          <img src={thumbSrc} alt={game.title} className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
        )}
        {isSuspended && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded">중지 중</span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className={`flex flex-col gap-2 p-3 flex-1 ${isSuspended ? 'opacity-50' : ''}`}>
        <div>
          <div className="flex items-center justify-between gap-1">
            <p className="font-semibold text-text-primary text-sm leading-tight truncate">{game.title}</p>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {game.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-yellow-400 font-medium">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {game.rating.toFixed(1)}
                </span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${service.className}`}>
                {service.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-text-muted">{game.genre}</span>
            {!isSuspended && game.approvalStatus === 'not_submitted' && game.status !== 'published' && (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <span className="w-1 h-1 rounded-full bg-text-muted" />초안
              </span>
            )}
            {!isSuspended && (game.approvalStatus === 'pending' || game.approvalStatus === 'review') && game.status !== 'published' && (
              <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />심사중
              </span>
            )}
            {!isSuspended && game.approvalStatus === 'approved' && game.status !== 'published' && (
              <span className="inline-flex items-center gap-1 text-xs text-accent">
                <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />출시 대기
              </span>
            )}
            {!isSuspended && game.approvalStatus === 'rejected' && (
              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                <span className="w-1 h-1 rounded-full bg-red-400" />심사 거부
              </span>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-1 mt-auto">
          <Link href={`/games/${game._id}`} className="flex-1" target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center justify-center gap-1 py-1.5 text-text-secondary hover:text-text-primary bg-bg-tertiary border border-line/50 hover:border-line rounded-lg transition-colors text-[11px] font-medium">
              <Eye className="w-3.5 h-3.5" />미리보기
            </button>
          </Link>
          <Link href={`/games-management/${game._id}/manage`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1 py-1.5 text-white bg-violet-500/70 hover:bg-violet-500 border border-violet-400/40 rounded-lg transition-colors text-[11px] font-medium">
              <Settings className="w-3.5 h-3.5" />관리
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function GameSection({
  title, games, expanded, onToggleExpand, cardLimit, accent = 'green',
}: {
  title: string
  games: Game[]
  expanded: boolean
  onToggleExpand: () => void
  cardLimit: number
  accent?: 'green' | 'blue'
}) {
  const visible = expanded ? games : games.slice(0, cardLimit)
  const hasMore = games.length > cardLimit
  const borderClass = accent === 'green' ? 'border-accent/20' : 'border-blue-400/20'

  return (
    <div className={`rounded-xl border ${borderClass} bg-bg-secondary overflow-hidden`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-line/40">
        <span className="text-sm font-bold text-text-primary">{title}</span>
        <span className="text-sm text-text-muted">{games.length}개</span>
      </div>
      {/* 카드 그리드 */}
      <div className="p-5">
        {games.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {visible.map(game => <GameCard key={game._id} game={game} />)}
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={onToggleExpand}
              className="flex items-center px-4 py-1.5 text-text-secondary border border-line rounded-full hover:border-accent hover:text-accent transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GamesManagementPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandOperating, setExpandOperating] = useState(false)
  const [expandPre, setExpandPre] = useState(false)

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

  const searchedGames = games.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const wasPublished = (g: Game) => g.status === 'published' || (!!g.suspendedAt && g.statusBeforeSuspend === 'published')
  const operatingGames = searchedGames.filter(wasPublished)
  const preGames = searchedGames.filter(g => !wasPublished(g))

  const CARD_LIMIT = 15

  const isPending = (g: Game) => g.approvalStatus === 'pending' || g.approvalStatus === 'review'
  const liveGames = games.filter(g => g.serviceType === 'live' || g.status === 'published')
  const betaGames = games.filter(g => !liveGames.includes(g) && g.status !== 'archived' && g.serviceType !== 'ended')

  const stats = [
    { label: '전체 게임', value: games.length,                                              color: 'text-text-primary',  sub: null },
    { label: '초안 작성 중',    value: games.filter(g => g.approvalStatus === 'not_submitted' && g.status !== 'published').length, color: 'text-text-muted', sub: null },
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


      {/* 에러 */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadGames} className="text-base underline">다시 시도</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
        </div>
      ) : operatingGames.length === 0 && preGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-5">
          <div className="text-6xl">🎮</div>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary mb-1">등록된 게임이 없습니다</p>
            <p className="text-sm text-text-muted">첫 번째 게임을 등록하고 서비스를 시작해보세요</p>
          </div>
          <Link href="/upload">
            <button className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-accent/30">
              <Plus className="w-5 h-5" />
              게임 등록하기
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 운영 중 섹션 */}
          <GameSection
            title="운영 중"
            games={operatingGames}
            expanded={expandOperating}
            onToggleExpand={() => setExpandOperating(p => !p)}
            cardLimit={CARD_LIMIT}
            accent="green"
          />

          {/* 출시 전 섹션 */}
          <GameSection
            title="출시 전"
            games={preGames}
            expanded={expandPre}
            onToggleExpand={() => setExpandPre(p => !p)}
            cardLimit={CARD_LIMIT}
            accent="blue"
          />

        </div>
      )}

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
