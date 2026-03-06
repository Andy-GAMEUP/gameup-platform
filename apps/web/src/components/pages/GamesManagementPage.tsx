'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Edit, Trash2, Plus, Search, Users, Star, RefreshCw } from 'lucide-react'
import { gameService } from '@/services/gameService'

interface Game {
  _id: string
  title: string
  genre: string
  status: string
  approvalStatus: string
  serviceType?: string
  monetization: string
  playCount: number
  rating: number
  createdAt: string
}

const approvalBadge: Record<string, string> = {
  approved: 'bg-green-500/20 text-green-400 border border-green-500/50',
  pending:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  review:   'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/50',
}
const approvalLabel: Record<string, string> = {
  approved: '승인완료', pending: '승인대기', review: '검토중', rejected: '반려',
}
const statusBadge: Record<string, string> = {
  beta:      'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  published: 'bg-green-500/20 text-green-400 border border-green-500/50',
  draft:     'bg-slate-500/20 text-slate-400 border border-slate-500/50',
  archived:  'bg-orange-500/20 text-orange-400 border border-orange-500/50',
}
const statusLabel: Record<string, string> = {
  beta: '베타', published: '라이브', draft: '초안', archived: '종료',
}
const monetizationLabel: Record<string, string> = {
  free: '무료', ad: '광고', paid: '유료', freemium: '부분유료',
}

export default function GamesManagementPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadGames = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await gameService.getMyGames()
      setGames((data.games || []) as unknown as Game[])
    } catch (err: any) {
      setError(err.response?.data?.message || '게임 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGames() }, [])

  const filteredGames = games.filter((game) =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (gameId: string, title: string) => {
    if (!confirm(`"${title}" 게임을 삭제하시겠습니까?`)) return
    setDeleting(gameId)
    try {
      await gameService.deleteGame(gameId)
      setGames(prev => prev.filter(g => g._id !== gameId))
    } catch (err: any) {
      alert(err.response?.data?.message || '삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  const stats = [
    { label: '전체 게임', value: games.length,                                              color: 'text-white' },
    { label: '승인대기',  value: games.filter(g => g.approvalStatus === 'pending').length,  color: 'text-yellow-400' },
    { label: '승인완료',  value: games.filter(g => g.approvalStatus === 'approved').length, color: 'text-green-400' },
    { label: '반려',      value: games.filter(g => g.approvalStatus === 'rejected').length, color: 'text-red-400' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">게임 관리</h1>
          <p className="text-slate-400">등록된 베타 게임을 관리하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadGames}
            className="flex items-center gap-2 px-3 py-2 border border-slate-700 hover:bg-slate-800 rounded-md text-sm transition-colors text-slate-400"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/upload">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> 새 게임 등록
            </button>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 검색 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="게임 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors"
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
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">게임명</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">서비스</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">수익모델</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">승인상태</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">플레이</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">평점</th>
                  <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">등록일</th>
                  <th className="px-4 py-3 text-right text-sm text-slate-400 font-medium">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((game, idx) => (
                  <tr
                    key={game._id}
                    className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${idx % 2 !== 0 ? 'bg-slate-800/10' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{game.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{game.genre}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                        game.serviceType === 'live'
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      }`}>
                        {game.serviceType === 'live' ? '라이브' : '베타'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs px-2 py-1 rounded-full border border-slate-600 text-slate-400">
                        {monetizationLabel[game.monetization] || game.monetization || '무료'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${approvalBadge[game.approvalStatus] || 'bg-slate-500/20 text-slate-400 border border-slate-500/50'}`}>
                        {approvalLabel[game.approvalStatus] || game.approvalStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[game.status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/50'}`}>
                        {statusLabel[game.status] || game.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                        <Users className="w-4 h-4 text-slate-500" />
                        {(game.playCount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {game.rating > 0 ? (
                        <span className="flex items-center gap-1 text-white text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {game.rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-400 text-sm">
                        {new Date(game.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 게임정보 */}
                        <Link href={`/games/${game._id}`}>
                          <button className="flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors text-xs font-medium">
                            <Eye className="w-3.5 h-3.5" />
                            게임정보
                          </button>
                        </Link>
                        {/* 공지알림 */}
                        <Link href={`/games-management/${game._id}/manage`}>
                          <button className="flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-md transition-colors text-xs font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            공지알림
                          </button>
                        </Link>
                        {/* 게임정보편집 */}
                        <Link href={`/games-management/${game._id}/edit`}>
                          <button className="flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-md transition-colors text-xs font-medium">
                            <Edit className="w-3.5 h-3.5" />
                            게임정보편집
                          </button>
                        </Link>
                        {/* 삭제 */}
                        <button
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-30"
                          onClick={() => handleDelete(game._id, game.title)}
                          disabled={deleting === game._id}
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredGames.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 게임이 없습니다.'}
                {!searchQuery && (
                  <div className="mt-4 flex justify-center">
                    <Link href="/upload">
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold transition-colors">
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
    </div>
  )
}
