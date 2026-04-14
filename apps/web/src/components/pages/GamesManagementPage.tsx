'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Plus, Search, Users, Star, RefreshCw, Settings } from 'lucide-react'
import { gameService } from '@/services/gameService'
import DeleteGameModal from '@/components/DeleteGameModal'

interface Game {
  _id: string
  title: string
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
}

const approvalBadge: Record<string, string> = {
  approved: 'bg-accent-light text-accent border border-accent-muted',
  pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  review:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/50',
}
// 요구사항: 승인상태 = 심사중 / 반려 / 완료
const approvalLabel: Record<string, string> = {
  approved: '완료',
  pending:  '심사중',
  review:   '심사중',
  rejected: '반려',
}

// 요구사항: 서비스 = 베타 / 라이브 / 심사중 / 종료
// serviceType 기반 + approvalStatus에서 파생
const getServiceDisplay = (game: Game): { label: string; className: string } => {
  if (game.approvalStatus === 'pending' || game.approvalStatus === 'review') {
    return { label: '심사중', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' }
  }
  if (game.status === 'archived' || game.serviceType === 'ended') {
    return { label: '종료', className: 'bg-orange-500/20 text-orange-400 border-orange-500/50' }
  }
  if (game.serviceType === 'live' || game.status === 'published') {
    return { label: '라이브', className: 'bg-accent-light text-accent border-accent-muted' }
  }
  return { label: '베타', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' }
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

  const stats = [
    { label: '전체 게임', value: games.length,                                              color: 'text-text-primary' },
    { label: '심사중',    value: games.filter(g => g.approvalStatus === 'pending' || g.approvalStatus === 'review').length, color: 'text-yellow-400' },
    { label: '완료',      value: games.filter(g => g.approvalStatus === 'approved').length, color: 'text-accent' },
    { label: '반려',      value: games.filter(g => g.approvalStatus === 'rejected').length, color: 'text-red-400' },
  ]

  const formatEndDate = (game: Game): string => {
    // 베타: betaEndDate 표시, 그 외: '유지'
    if ((game.serviceType === 'beta' || game.status === 'beta') && game.betaEndDate) {
      return new Date(game.betaEndDate).toLocaleDateString('ko-KR')
    }
    return '유지'
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">게임 관리</h1>
          <p className="text-text-secondary">등록된 게임을 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadGames}
            className="flex items-center gap-2 px-3 py-2 border border-line hover:bg-bg-tertiary rounded-md text-sm transition-colors text-text-secondary"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/upload">
            <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> 새 게임 등록
            </button>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-bg-secondary border border-line rounded-lg p-4">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-text-secondary">{s.label}</div>
          </div>
        ))}
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-bg-tertiary/50">
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">게임명</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">서비스</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">수익모델</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">승인상태</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">플레이어</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">평점</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">등록일</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">종료예정일</th>
                  <th className="px-4 py-3 text-right text-sm text-text-secondary font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game, idx) => {
                  const service = getServiceDisplay(game)
                  return (
                    <tr
                      key={game._id}
                      className={`border-b border-line hover:bg-bg-tertiary/30 transition-colors ${idx % 2 !== 0 ? 'bg-bg-tertiary/10' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-text-primary">{game.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{game.genre}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${service.className}`}>
                          {service.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs px-2 py-1 rounded-full border border-line text-text-secondary">
                          {monetizationLabel[game.monetization] || game.monetization || '무료'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${approvalBadge[game.approvalStatus] || 'bg-bg-muted/20 text-text-secondary border border-line/50'}`}>
                          {approvalLabel[game.approvalStatus] || game.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-1.5 text-text-secondary text-sm">
                          <Users className="w-4 h-4 text-text-muted" />
                          {((game.testers ?? game.playCount) || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {game.rating > 0 ? (
                          <span className="flex items-center gap-1 text-text-primary text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {game.rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-text-secondary text-sm">
                          {new Date(game.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-text-secondary text-sm">{formatEndDate(game)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 게임정보 */}
                          <Link href={`/games/${game._id}`}>
                            <button className="flex items-center gap-1 px-2 py-1.5 text-text-secondary hover:text-text-primary hover:bg-line-light rounded-md transition-colors text-xs font-medium">
                              <Eye className="w-3.5 h-3.5" />
                              게임정보
                            </button>
                          </Link>
                          {/* 게임관리 (기존 공지알림 → 게임관리로 명칭 변경, 편집·삭제 포함) */}
                          <Link href={`/games-management/${game._id}/manage`}>
                            <button className="flex items-center gap-1 px-2 py-1.5 text-text-secondary hover:text-accent hover:bg-line-light rounded-md transition-colors text-xs font-medium">
                              <Settings className="w-3.5 h-3.5" />
                              게임관리
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredGames.length === 0 && (
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
            )}
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
