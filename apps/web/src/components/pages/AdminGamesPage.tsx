'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  Search, CheckCircle, XCircle, Clock, Archive, Play, Pause,
  RotateCcw, BarChart2, ChevronLeft, ChevronRight, Loader2, AlertCircle
} from 'lucide-react'

const APPROVAL_STATUS: Record<string, { label: string; cls: string }> = {
  pending:  { label: '심사대기', cls: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40' },
  review:   { label: '검토중',   cls: 'bg-blue-600/20 text-blue-300 border-blue-500/40' },
  approved: { label: '승인됨',   cls: 'bg-green-600/20 text-green-300 border-green-500/40' },
  rejected: { label: '거부됨',   cls: 'bg-red-600/20 text-red-300 border-red-500/40' },
}
const GAME_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: '드래프트', cls: 'bg-slate-600/40 text-slate-400' },
  beta:      { label: '베타',     cls: 'bg-cyan-600/20 text-cyan-300' },
  published: { label: '출시',     cls: 'bg-purple-600/20 text-purple-300' },
  archived:  { label: '종료',     cls: 'bg-slate-700/60 text-slate-500' },
}

function ConfirmModal({ title, desc, onConfirm, onCancel, danger = true }: {
  title: string; desc: string; onConfirm: (reason?: string) => void
  onCancel: () => void; danger?: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-4">{desc}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
          placeholder="사유 입력 (선택)"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 mb-4 resize-none" />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">취소</button>
          <button onClick={() => onConfirm(reason)}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}>
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
  const [approvalFilter, setApprovalFilter] = useState(searchParams.get('filter') === 'pending' ? 'pending' : '')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; desc: string; onConfirm: (r?: string) => void; danger?: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllGames({ page, search, approvalStatus: approvalFilter, status: statusFilter })
      setGames(data.games || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, approvalFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleApprove = (id: string, action: 'approve' | 'reject' | 'review') => {
    const labels: Record<string, string> = { approve: '승인', reject: '거부', review: '검토 중으로 변경' }
    setConfirm({
      title: `게임을 ${labels[action]}하시겠습니까?`,
      desc: action === 'reject' ? '거부 시 개발자에게 사유가 전달됩니다.' : '',
      danger: action === 'reject',
      onConfirm: async (reason) => {
        setConfirm(null)
        setActionLoading(id)
        try {
          await adminService.approveGame(id, { action, rejectionReason: reason })
          showToast(`게임이 ${labels[action]}되었습니다`)
          load()
        } catch (e: any) {
          showToast(e?.response?.data?.message || '처리 실패', false)
        } finally { setActionLoading(null) }
      }
    })
  }

  const handleControl = (id: string, action: string, label: string, danger = false) => {
    setConfirm({
      title: `${label} 처리하시겠습니까?`,
      desc: danger ? '이 작업은 서비스에 즉시 반영됩니다.' : '',
      danger,
      onConfirm: async (reason) => {
        setConfirm(null)
        setActionLoading(id)
        try {
          await adminService.controlGameStatus(id, { action, reason })
          showToast(`${label} 완료`)
          load()
        } catch (e: any) {
          showToast(e?.response?.data?.message || '처리 실패', false)
        } finally { setActionLoading(null) }
      }
    })
  }

  const approvalButtons = (g: any) => {
    if (g.approvalStatus === 'pending' || g.approvalStatus === 'review') return (
      <div className="flex gap-1.5">
        <button onClick={() => handleApprove(g._id, 'approve')}
          className="flex items-center gap-1 bg-green-700/30 text-green-300 hover:bg-green-700/50 border border-green-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <CheckCircle className="w-3 h-3" /> 승인
        </button>
        <button onClick={() => handleApprove(g._id, 'review')}
          className="flex items-center gap-1 bg-blue-700/30 text-blue-300 hover:bg-blue-700/50 border border-blue-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <Clock className="w-3 h-3" /> 검토
        </button>
        <button onClick={() => handleApprove(g._id, 'reject')}
          className="flex items-center gap-1 bg-red-700/30 text-red-300 hover:bg-red-700/50 border border-red-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <XCircle className="w-3 h-3" /> 거부
        </button>
      </div>
    )
    return null
  }

  const statusButtons = (g: any) => {
    const btns = []
    if (g.approvalStatus === 'approved' && g.status !== 'archived') {
      if (g.status !== 'draft') btns.push(
        <button key="suspend" onClick={() => handleControl(g._id, 'suspend', '서비스 중지', true)}
          className="flex items-center gap-1 bg-orange-700/30 text-orange-300 hover:bg-orange-700/50 border border-orange-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <Pause className="w-3 h-3" /> 중지
        </button>
      )
      if (g.status === 'draft' || g.status === 'beta') btns.push(
        <button key="publish" onClick={() => handleControl(g._id, 'set_published', '정식 출시')}
          className="flex items-center gap-1 bg-purple-700/30 text-purple-300 hover:bg-purple-700/50 border border-purple-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <Play className="w-3 h-3" /> 출시
        </button>
      )
      if (g.status === 'draft') btns.push(
        <button key="reactivate" onClick={() => handleControl(g._id, 'reactivate', '재활성화')}
          className="flex items-center gap-1 bg-cyan-700/30 text-cyan-300 hover:bg-cyan-700/50 border border-cyan-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <RotateCcw className="w-3 h-3" /> 재활성화
        </button>
      )
      btns.push(
        <button key="archive" onClick={() => handleControl(g._id, 'archive', '서비스 종료', true)}
          className="flex items-center gap-1 bg-slate-700/50 text-slate-400 hover:bg-slate-700 border border-slate-600/40 px-2.5 py-1 rounded text-xs transition-colors">
          <Archive className="w-3 h-3" /> 종료
        </button>
      )
    }
    if (g.status === 'archived') btns.push(
      <span key="done" className="text-slate-500 text-xs px-2 py-1">서비스 종료됨</span>
    )
    return <div className="flex flex-wrap gap-1.5">{btns}</div>
  }

  return (
    <AdminLayout>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">게임 관리</h2>
          <span className="text-slate-500 text-sm">총 {total}개</span>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="게임 이름 검색..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
          </div>
          <select value={approvalFilter} onChange={(e) => { setApprovalFilter(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">전체 심사상태</option>
            <option value="pending">심사대기</option>
            <option value="review">검토중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거부됨</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">전체 서비스상태</option>
            <option value="draft">드래프트</option>
            <option value="beta">베타</option>
            <option value="published">출시</option>
            <option value="archived">종료</option>
          </select>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 text-slate-500">게임이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {games.map((g) => {
              const appr = APPROVAL_STATUS[g.approvalStatus] || APPROVAL_STATUS.pending
              const stat = GAME_STATUS[g.status] || GAME_STATUS.draft
              const isLoading = actionLoading === g._id
              return (
                <div key={g._id} className={`bg-slate-900 border border-slate-800 rounded-xl p-4 transition-opacity ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* 썸네일 */}
                    <div className="w-16 h-12 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                      {g.thumbnail
                        ? <img src={`/uploads/${g.thumbnail.replace('uploads/','')}`} alt={g.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x48/1e293b/334155?text=G' }} />
                        : <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No img</div>}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-white font-semibold text-sm truncate max-w-xs">{g.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${appr.cls}`}>{appr.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${stat.cls}`}>{stat.label}</span>
                        {g.genre && <span className="text-slate-500 text-xs">{g.genre}</span>}
                      </div>
                      <p className="text-slate-500 text-xs mb-2">
                        개발자: {(g.developerId as any)?.username} · 플레이:{(g.playCount||0).toLocaleString()} · ★{(g.rating||0).toFixed(1)} · {new Date(g.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                      {/* 승인 버튼 */}
                      {approvalButtons(g)}
                      {/* 상태 컨트롤 */}
                      <div className="mt-2">{statusButtons(g)}</div>
                    </div>

                    {/* 지표 링크 */}
                    <Link href={`/admin/metrics/${g._id}`}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-600/40 px-2.5 py-1.5 rounded-lg transition-colors">
                      <BarChart2 className="w-3 h-3" /> 지표
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
