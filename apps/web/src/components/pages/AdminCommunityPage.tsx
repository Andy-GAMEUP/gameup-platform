'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import {
  Search, ShieldOff, ShieldCheck, Trash2, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, CheckCircle, MessageSquare
} from 'lucide-react'

const FEEDBACK_LABELS: Record<string, { label: string; cls: string }> = {
  general:    { label: '일반',  cls: 'bg-slate-600/40 text-slate-300' },
  bug:        { label: '버그',  cls: 'bg-red-600/20 text-red-300 border border-red-500/30' },
  suggestion: { label: '건의',  cls: 'bg-blue-600/20 text-blue-300 border border-blue-500/30' },
  praise:     { label: '칭찬',  cls: 'bg-green-600/20 text-green-300 border border-green-500/30' },
}

function ConfirmModal({ msg, onConfirm, onCancel, danger = true, requireReason = false }: {
  msg: string; onConfirm: (r?: string) => void; onCancel: () => void
  danger?: boolean; requireReason?: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm p-5 shadow-2xl">
        <p className="text-white text-sm mb-4">{msg}</p>
        {requireReason && (
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="차단 사유 (선택)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none mb-3 resize-none" />
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">취소</button>
          <button onClick={() => onConfirm(reason)}
            className={`px-3 py-1.5 text-sm text-white rounded-lg transition-colors ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCommunityPage() {
  const searchParams = useSearchParams()
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBlocked, setFilterBlocked] = useState(searchParams.get('filter') === 'blocked' ? 'true' : '')
  const [gameIdFilter] = useState(searchParams.get('gameId') || '')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<any>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllReviews({
        page, search, isBlocked: filterBlocked || undefined, gameId: gameIdFilter || undefined
      })
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, filterBlocked, gameIdFilter])

  useEffect(() => { load() }, [load])

  const handleBlock = (r: any) => {
    const blocking = !r.isBlocked
    setConfirm({
      msg: blocking ? `"${r.title}" 리뷰를 차단하시겠습니까?` : `"${r.title}" 차단을 해제하시겠습니까?`,
      danger: blocking,
      requireReason: blocking,
      onConfirm: async (reason: string) => {
        setConfirm(null)
        setActionId(r._id)
        try {
          await adminService.blockReview(r._id, { isBlocked: blocking, blockReason: reason })
          showToast(blocking ? '차단되었습니다' : '차단이 해제되었습니다')
          load()
        } catch { showToast('처리 실패', false) }
        finally { setActionId(null) }
      }
    })
  }

  const handleDelete = (r: any) => {
    setConfirm({
      msg: `"${r.title}" 리뷰를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        setActionId(r._id)
        try {
          await adminService.deleteReview(r._id)
          showToast('리뷰가 삭제되었습니다')
          load()
        } catch { showToast('삭제 실패', false) }
        finally { setActionId(null) }
      }
    })
  }

  const blockedCount = reviews.filter((r) => r.isBlocked).length

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
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" /> 커뮤니티 모니터링
          </h2>
          <div className="flex gap-3 text-sm">
            <span className="text-slate-400">{loading ? '로딩 중...' : <>총 <span className="text-white font-semibold">{total}</span>개</>}</span>
            {blockedCount > 0 && <span className="text-red-400">이 페이지 차단: {blockedCount}개</span>}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="리뷰 제목·내용 검색..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
          </div>
          <select value={filterBlocked} onChange={(e) => { setFilterBlocked(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">전체</option>
            <option value="false">정상</option>
            <option value="true">차단됨</option>
          </select>
        </div>

        {/* 리뷰 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-slate-500">리뷰가 없습니다</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const fb = FEEDBACK_LABELS[r.feedbackType] || FEEDBACK_LABELS.general
              const isActioning = actionId === r._id
              return (
                <div key={r._id} className={`bg-slate-900 border rounded-xl p-4 transition-all ${r.isBlocked ? 'border-red-800/50 bg-red-950/10' : 'border-slate-800'} ${isActioning ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-start gap-3">
                    {/* 유저 아이콘 */}
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {(r.userId?.username || '?')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 메타 정보 */}
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-slate-300 text-sm font-medium">{r.userId?.username}</span>
                        <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${fb.cls}`}>{fb.label}</span>
                        {r.isVerifiedTester && <span className="bg-green-600/20 text-green-300 text-xs px-1.5 rounded border border-green-500/30">인증테스터</span>}
                        {r.isBlocked && <span className="bg-red-600/20 text-red-300 text-xs px-1.5 rounded border border-red-500/30">차단됨</span>}
                        {r.gameId && (
                          <Link href={`/admin/metrics/${r.gameId._id}`} className="text-slate-500 hover:text-cyan-300 text-xs transition-colors">
                            🎮 {r.gameId.title}
                          </Link>
                        )}
                      </div>

                      {/* 리뷰 내용 */}
                      <p className={`text-sm font-semibold mb-0.5 ${r.isBlocked ? 'line-through text-slate-500' : 'text-white'}`}>{r.title}</p>
                      <p className={`text-xs line-clamp-2 ${r.isBlocked ? 'text-slate-600' : 'text-slate-400'}`}>{r.content}</p>

                      {r.isBlocked && r.blockReason && (
                        <p className="text-red-400 text-xs mt-1">차단 사유: {r.blockReason}</p>
                      )}

                      {/* 날짜 + 도움됨 */}
                      <p className="text-slate-600 text-xs mt-1">
                        {new Date(r.createdAt).toLocaleDateString('ko-KR')} · 도움됨 {r.helpfulCount || 0}
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleBlock(r)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          r.isBlocked
                            ? 'bg-green-700/20 text-green-300 border-green-600/40 hover:bg-green-700/40'
                            : 'bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40'
                        }`}>
                        {r.isBlocked ? <><ShieldCheck className="w-3 h-3" /> 해제</> : <><ShieldOff className="w-3 h-3" /> 차단</>}
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border bg-red-700/20 text-red-300 border-red-600/40 hover:bg-red-700/40 transition-colors">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
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
