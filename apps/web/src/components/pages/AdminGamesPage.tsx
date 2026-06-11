'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  Search, CheckCircle, XCircle, Clock, Archive, Play, Pause,
  RotateCcw, BarChart2, ChevronLeft, ChevronRight, Loader2, AlertCircle, Settings, Gamepad2
} from 'lucide-react'

const APPROVAL_STATUS: Record<string, { label: string; cls: string }> = {
  not_submitted: { label: '미제출',   cls: 'bg-bg-tertiary/40 text-text-muted border-line/50' },
  pending:  { label: '심사대기', cls: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' },
  review:   { label: '검토중',   cls: 'bg-blue-600/20 text-blue-300 border-blue-500/40' },
  approved: { label: '승인됨',   cls: 'bg-accent-light text-accent border-green-500/40' },
  rejected: { label: '거부됨',   cls: 'bg-red-600/20 text-red-300 border-red-500/40' },
}
const GAME_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: '드래프트', cls: 'bg-bg-muted/40 text-text-secondary' },
  beta:      { label: '베타',     cls: 'bg-cyan-600/20 text-cyan-300' },
  published: { label: '출시',     cls: 'bg-purple-600/20 text-purple-300' },
  archived:  { label: '종료',     cls: 'bg-bg-tertiary/60 text-text-muted' },
}

function ConfirmModal({ title, desc, onConfirm, onCancel, danger = true }: {
  title: string; desc: string; onConfirm: (reason?: string) => void
  onCancel: () => void; danger?: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-text-primary font-bold text-lg mb-2">{title}</h3>
        <p className="text-text-secondary text-sm mb-4">{desc}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
          placeholder="사유 입력 (선택)"
          className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-line mb-4 resize-none" />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">취소</button>
          <button onClick={() => onConfirm(reason)}
            className={`px-4 py-2 text-sm text-text-primary rounded-lg transition-colors ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminGamesPage() {
  const searchParams = useSearchParams()
  const [games, setGames] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [gameStateFilter, setGameStateFilter] = useState(searchParams.get('filter') === 'pending' ? 'reviewing' : '')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; desc: string; onConfirm: (r?: string) => void; danger?: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const stateToParams = (f: string) => {
    if (f === 'draft')     return { approvalStatus: 'not_submitted' }
    if (f === 'reviewing') return { approvalStatus: 'pending' }
    if (f === 'waiting')   return { approvalStatus: 'approved', status: 'beta' }
    if (f === 'live')      return { approvalStatus: 'approved', status: 'published' }
    if (f === 'rejected')  return { approvalStatus: 'rejected' }
    if (f === 'suspended') return { suspended: 'true' }
    return {}
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await adminService.getAllGames({ page, search, ...stateToParams(gameStateFilter), ...(serviceTypeFilter ? { serviceType: serviceTypeFilter } : {}) })
      setGames(data.games || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (e: any) {
      const status = e?.response?.status
      const msg = status === 401 ? '로그인이 필요합니다'
        : status === 403 ? '관리자 권한이 필요합니다'
        : e?.response?.data?.message || '불러오기 실패'
      setLoadError(msg)
      showToast(msg, false)
    }
    finally { setLoading(false) }
  }, [page, search, gameStateFilter, serviceTypeFilter])

  useEffect(() => { load() }, [load])

  const handleAction = (id: string, type: 'approve' | 'reject' | 'suspend' | 'reactivate', title: string) => {
    setConfirm({
      title,
      desc: type !== 'approve' ? '이 작업은 서비스에 즉시 반영됩니다.' : '',
      danger: type !== 'approve' && type !== 'reactivate',
      onConfirm: async (reason) => {
        setConfirm(null)
        setActionLoading(id)
        try {
          if (type === 'approve') await adminService.approveGame(id, { action: 'approve' })
          else if (type === 'reject') await adminService.approveGame(id, { action: 'reject', rejectionReason: reason })
          else if (type === 'reactivate') await adminService.controlGameStatus(id, { action: 'reactivate' })
          else await adminService.controlGameStatus(id, { action: 'suspend', reason })
          showToast(`${title} 완료`)
          load()
        } catch (e: any) {
          showToast(e?.response?.data?.message || '처리 실패', false)
        } finally { setActionLoading(null) }
      }
    })
  }



  return (
    <AdminLayout>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.ok ? 'bg-accent' : 'bg-red-600'} text-text-primary`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-bold">게임 관리</h2>
          <span className="text-text-muted text-sm">{loading ? '로딩 중...' : `총 ${total}개`}</span>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="게임 이름, 개발자명, 장르 검색..."
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-line" />
          </div>
          <select value={serviceTypeFilter} onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
            <option value="">전체 구분</option>
            <option value="beta">베타</option>
            <option value="live">라이브</option>
          </select>
          <select value={gameStateFilter} onChange={(e) => { setGameStateFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none ml-auto">
            <option value="">전체 게임상태</option>
            <option value="draft">초안 작성 중</option>
            <option value="reviewing">심사 중</option>
            <option value="waiting">출시 대기</option>
            <option value="live">운영 중</option>
            <option value="rejected">심사 거부</option>
            <option value="suspended">강제 중지 중</option>
          </select>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-red-400 font-medium">{loadError}</p>
            <button onClick={load} className="mt-2 px-4 py-1.5 text-sm bg-bg-tertiary border border-line rounded-lg text-text-secondary hover:text-text-primary transition-colors">다시 시도</button>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 text-text-muted">게임이 없습니다</div>
        ) : (
          <div className="bg-bg-secondary border border-line rounded-xl overflow-x-auto">
            <table className="w-full min-w-[770px] text-sm text-text-primary">
              <thead>
                <tr className="border-b border-line bg-bg-tertiary/50 text-sm font-semibold text-text-primary">
                  <th className="px-3 py-2.5 text-center w-10 border-r border-line/20">NO.</th>
                  <th className="px-3 py-2.5 text-left w-14 border-r border-line/20">썸네일</th>
                  <th className="px-3 py-2.5 text-left w-52 max-w-[208px] border-r border-line/20">이름</th>
                  <th className="px-3 py-2.5 text-left w-36 border-r border-line/20">개발자</th>
                  <th className="px-3 py-2.5 text-left w-28 border-r border-line/20">구분</th>
                  <th className="px-3 py-2.5 text-center w-24 border-r border-line/20">게임 테스트</th>
                  <th className="px-3 py-2.5 text-center w-24 border-r border-line/20">관리 현황</th>
                  <th className="px-3 py-2.5 text-left w-32 border-r border-line/20">게임 상태</th>
                  <th className="px-3 py-2.5 text-center w-28 border-r border-line/20">심사 통과</th>
                  <th className="px-3 py-2.5 text-center w-28 border-r border-line/20">심사 거부</th>
                  <th className="px-3 py-2.5 text-center w-28 border-r border-line/20">강제 중지</th>
                  <th className="px-3 py-2.5 text-center w-14">지표</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const isLoading = actionLoading === g._id
                  const isSuspended = !!g.suspendedAt
                  const gameStateLabel =
                    isSuspended ? { label: '강제 중지 중', color: 'text-red-400', dot: 'bg-red-400', pulse: false }
                    : g.approvalStatus === 'not_submitted' ? { label: '초안 작성 중', color: 'text-text-muted', dot: 'bg-text-muted', pulse: false }
                    : g.approvalStatus === 'pending' || g.approvalStatus === 'review' ? { label: '심사 중', color: 'text-yellow-400', dot: 'bg-yellow-400', pulse: true }
                    : g.approvalStatus === 'rejected' ? { label: '심사 거부', color: 'text-red-400', dot: 'bg-red-400', pulse: false }
                    : g.approvalStatus === 'approved' && g.status !== 'published' ? { label: '출시 대기', color: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true }
                    : { label: '운영 중', color: 'text-blue-500', dot: 'bg-blue-500', pulse: true }
                  return (
                    <tr key={g._id} className={`border-b border-line/50 last:border-0 transition-colors ${isLoading ? 'opacity-60 pointer-events-none' : ''} ${isSuspended ? 'bg-red-500/10 hover:bg-red-500/15' : 'hover:bg-bg-tertiary/20'}`}>
                      {/* 번호 */}
                      <td className="px-3 py-2.5 text-center text-sm text-text-muted border-r border-line/20">
                        {g.gameNo || '-'}
                      </td>
                      {/* 썸네일 */}
                      <td className="px-3 py-2.5 border-r border-line/20">
                        <div className="w-20 h-16 bg-bg-tertiary rounded overflow-hidden">
                          {g.thumbnail
                            ? <Image src={`/uploads/${g.thumbnail.replace('uploads/','')}`} alt={g.title} width={80} height={64} className="w-full h-full object-cover" unoptimized />
                            : <div className="w-full h-full flex items-center justify-center text-[10px]">-</div>}
                        </div>
                      </td>
                      {/* 이름 */}
                      <td className="px-3 py-2.5 w-52 max-w-[208px] border-r border-line/20">
                        <p className="font-medium truncate">{g.title}</p>
                        <p className="text-xs truncate">{g.genre || '-'}</p>
                      </td>
                      {/* 개발자 */}
                      <td className="px-3 py-2.5 text-base truncate max-w-[128px] border-r border-line/20">{(g.developerId as any)?.username || '-'}</td>
                      {/* 구분 */}
                      <td className="px-3 py-2.5 border-r border-line/20">
                        {g.serviceType === 'beta' && <span className="text-sm font-bold px-3 py-1 rounded-full bg-blue-500 text-white whitespace-nowrap">베타</span>}
                        {g.serviceType === 'live' && <span className="text-sm font-bold px-3 py-1 rounded-full bg-green-500 text-white whitespace-nowrap">라이브</span>}
                      </td>
                      {/* 게임 테스트 */}
                      <td className="px-3 py-2.5 text-center border-r border-line/20">
                        <Link href={`/games/${g._id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-9 hover:text-indigo-400 border border-line hover:border-indigo-500/40 rounded transition-colors">
                          <Gamepad2 className="w-5 h-5" />
                        </Link>
                      </td>
                      {/* 관리 현황 */}
                      <td className="px-3 py-2.5 text-center border-r border-line/20">
                        <Link href={`/games-management/${g._id}/manage?adminView=1`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-9 hover:text-indigo-400 border border-line hover:border-indigo-500/40 rounded transition-colors">
                          <Settings className="w-5 h-5" />
                        </Link>
                      </td>
                      {/* 게임 상태 */}
                      <td className="px-3 py-2.5 border-r border-line/20">
                        <span className={`inline-flex items-center gap-1 text-base font-medium whitespace-nowrap ${gameStateLabel.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gameStateLabel.dot} ${gameStateLabel.pulse ? 'animate-pulse' : ''}`} />
                          {gameStateLabel.label}
                        </span>
                      </td>
                      {/* 심사 통과 */}
                      <td className="px-3 py-2.5 text-center border-r border-line/20">
                        <button onClick={() => handleAction(g._id, 'approve', '심사 통과')}
                          disabled={g.approvalStatus === 'not_submitted' || g.approvalStatus === 'approved'}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap">
                          심사 통과
                        </button>
                      </td>
                      {/* 심사 거부 */}
                      <td className="px-3 py-2.5 text-center border-r border-line/20">
                        <button onClick={() => handleAction(g._id, 'reject', '심사 거부')}
                          disabled={g.approvalStatus === 'not_submitted' || g.approvalStatus === 'rejected' || g.approvalStatus === 'approved'}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap">
                          심사 거부
                        </button>
                      </td>
                      {/* 강제 중지 / 중지 취소 */}
                      <td className="px-3 py-2.5 text-center border-r border-line/20">
                        {isSuspended ? (
                          <button onClick={() => handleAction(g._id, 'reactivate', '중지 취소')}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors whitespace-nowrap">
                            중지 취소
                          </button>
                        ) : (
                          <button onClick={() => handleAction(g._id, 'suspend', '강제 중지')}
                            disabled={!['approved', 'pending', 'review', 'rejected'].includes(g.approvalStatus)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-600 text-white hover:bg-slate-500 transition-colors disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap">
                            강제 중지
                          </button>
                        )}
                      </td>
                      {/* 지표 */}
                      <td className="px-3 py-2.5 text-center">
                        <Link href={`/analytics?tab=analysis&gameId=${g._id}&adminView=1`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-10 h-9 hover:text-indigo-400 border border-line hover:border-indigo-500/40 rounded transition-colors">
                          <BarChart2 className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              className="w-8 h-8 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-text-primary" />
            </button>
            <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="w-8 h-8 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4 text-text-primary" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
