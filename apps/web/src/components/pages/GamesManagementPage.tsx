'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Plus, Search, RefreshCw, Settings, Pin } from 'lucide-react'
import { gameService } from '@/services/gameService'
import DeleteGameModal from '@/components/DeleteGameModal'
import GameApprovalStatusBadge from '@/components/GameApprovalStatusBadge'
import { formatDate } from '@/lib/formatDate'
import { useAuth } from '@/lib/useAuth'

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
  startDate?: string | null
  betaEndDate?: string
  description?: string
  bannerImage?: string
  hasScreenshots?: boolean
  ratingCertificate?: { ratingClass?: string }
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

// 요구사항: 수익모델 4종 - 무료, 광고, 유료, 프리미엄
const monetizationLabel: Record<string, string> = {
  free:     '무료',
  ad:       '광고',
  paid:     '유료',
  freemium: '프리미엄',
}

function GameCard({ game, pinned, onTogglePin }: { game: Game; pinned: boolean; onTogglePin: (id: string) => void }) {
  const thumbSrc = game.thumbnail
    ? (game.thumbnail.startsWith('http') || game.thumbnail.startsWith('/uploads/')
        ? game.thumbnail
        : `/uploads/thumbnails/${game.thumbnail.split('/').pop()}`)
    : null
  const zoneTab = game.serviceType === 'beta' ? 'beta' : 'live'

  return (
    <div className="group flex flex-col rounded-xl bg-bg-secondary border-2 border-line/40 hover:border-accent hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* 썸네일 */}
      <Link href={`/games-management/${game._id}/manage?tab=${zoneTab}`} className="relative aspect-video bg-bg-tertiary overflow-hidden block cursor-pointer">
        {thumbSrc ? (
          <img src={thumbSrc} alt={game.title} className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
        )}
      </Link>

      {/* 정보 */}
      <div className="flex flex-col gap-[12.61px] p-3 flex-1">
        <div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-[15px] min-w-0">
              <p className="font-semibold text-text-primary text-[19.66px] leading-tight truncate">{game.title}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {game.serviceType !== 'beta' && <GameApprovalStatusBadge approvalStatus={game.approvalStatus} status={game.status} />}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(game._id) }}
                title={pinned ? '고정 해제' : '카드 고정'}
                className={pinned ? 'text-text-primary' : 'text-text-muted hover:text-text-primary transition-colors'}
              >
                <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 출시 정보 (베타존 전용) */}
        {game.serviceType === 'beta' && (
          <div className={`w-full text-center py-[3.21px] text-[12.64px] font-medium rounded-lg border border-black bg-white text-black ${
            game.status !== 'published' && !(game.approvalStatus === 'approved' && game.startDate) ? 'opacity-50' : ''
          }`}>
            {game.status === 'published'
              ? '플레이 중'
              : game.approvalStatus === 'approved' && game.startDate
              ? `${formatDate(game.startDate)} 자동 출시`
              : '초안 작성 중'}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-1 mt-auto">
          <Link href={`/games/${game._id}`} className="flex-1" target="_blank" rel="noopener noreferrer">
            <button className="w-full flex items-center justify-center gap-1 py-[3.21px] text-text-secondary hover:text-text-primary bg-bg-tertiary border border-line hover:border-text-secondary rounded-lg transition-colors text-[12.64px] font-medium">
              <Eye className="w-3 h-3" />미리보기
            </button>
          </Link>
          <Link href={`/games-management/${game._id}/manage?tab=${zoneTab}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1 py-[3.21px] text-white bg-violet-500/70 hover:bg-violet-500 border border-violet-300 rounded-lg transition-colors text-[12.64px] font-medium">
              <Settings className="w-3 h-3" />관리
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function GameSection({ games, pinnedIds, onTogglePin }: { games: Game[]; pinnedIds: string[]; onTogglePin: (id: string) => void }) {
  if (games.length === 0) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {games.map(game => (
        <GameCard key={game._id} game={game} pinned={pinnedIds.includes(game._id)} onTogglePin={onTogglePin} />
      ))}
    </div>
  )
}

export default function GamesManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') === 'beta' ? 'beta' : 'live'
  const { user } = useAuth()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null)

  const pinnedStorageKey = `gm-pinned-games:${user?.id || 'guest'}`

  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(pinnedStorageKey)
      setPinnedIds(raw ? JSON.parse(raw) : [])
    } catch {
      setPinnedIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem(pinnedStorageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    if (!searchParams.get('tab')) router.replace('/games-management?tab=live')
  }, [searchParams, router])

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

  const isPending = (g: Game) => g.approvalStatus === 'pending' || g.approvalStatus === 'review'
  const liveGames = games.filter(g => g.serviceType === 'live')
  const betaGames = games.filter(g => g.serviceType === 'beta')
  const tabGames = activeTab === 'beta' ? betaGames : liveGames

  const searchedGames = tabGames
    .filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice()
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a._id) ? 1 : 0
      const bPinned = pinnedIds.includes(b._id) ? 1 : 0
      return bPinned - aPinned
    })

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
      return formatDate(game.betaEndDate)
    }
    return '유지'
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{activeTab === 'beta' ? '베타존 게임' : '라이브존 게임'}</h1>
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
      ) : searchedGames.length === 0 ? (
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
        <GameSection games={searchedGames} pinnedIds={pinnedIds} onTogglePin={togglePin} />
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
