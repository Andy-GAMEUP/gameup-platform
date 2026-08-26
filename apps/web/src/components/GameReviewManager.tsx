'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, ShieldOff, ShieldCheck, Trash2, ChevronLeft, ChevronRight, Loader2, MessageSquare } from 'lucide-react'
import { gameService } from '@/services/gameService'
import ConfirmModal from './ConfirmModal'
import { formatDate } from '@/lib/formatDate'

interface Review {
  _id: string
  userId?: { username?: string }
  rating: number
  title: string
  content: string
  feedbackType: 'general' | 'bug' | 'suggestion' | 'praise'
  isBlocked: boolean
  helpfulCount?: number
  createdAt: string
}

const FEEDBACK_LABELS: Record<string, { label: string; cls: string }> = {
  general:    { label: '일반',  cls: 'bg-bg-muted/40 text-text-secondary' },
  bug:        { label: '버그',  cls: 'bg-accent-light text-accent-text border border-accent-muted' },
  suggestion: { label: '건의',  cls: 'bg-blue-600/20 text-blue-300 border border-blue-500/30' },
  praise:     { label: '칭찬',  cls: 'bg-accent-light text-accent border border-green-500/30' },
}

interface Props {
  gameId: string
}

export default function GameReviewManager({ gameId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBlocked, setFilterBlocked] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; onConfirm: () => void } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gameService.getManagedGameReviews(gameId, { page, search, isBlocked: filterBlocked || undefined })
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      /* no-op */
    } finally {
      setLoading(false)
    }
  }, [gameId, page, search, filterBlocked])

  useEffect(() => { load() }, [load])

  const handleBlock = (r: Review) => {
    const blocking = !r.isBlocked
    setConfirm({
      title: blocking ? '리뷰 차단' : '차단 해제',
      message: blocking ? `"${r.title}" 리뷰를 차단하시겠습니까?` : `"${r.title}" 차단을 해제하시겠습니까?`,
      danger: blocking,
      onConfirm: async () => {
        setConfirm(null); setActionId(r._id)
        try { await gameService.setGameReviewBlocked(gameId, r._id, { isBlocked: blocking }); load() }
        finally { setActionId(null) }
      },
    })
  }

  const handleDelete = (r: Review) => {
    setConfirm({
      title: '리뷰 삭제',
      message: `"${r.title}" 리뷰를 삭제하시겠습니까?`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null); setActionId(r._id)
        try { await gameService.removeGameReview(gameId, r._id); load() }
        finally { setActionId(null) }
      },
    })
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
      {confirm && (
        <ConfirmModal
          isOpen
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div>
        <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-accent" />리뷰 관리</h3>
        <p className="text-sm text-text-secondary mt-1">플레이어가 작성한 리뷰를 검토하고 관리하세요.</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-text-muted text-sm">총 <span className="text-text-primary font-semibold">{total}</span>개</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="리뷰 제목·내용 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <select value={filterBlocked} onChange={e => { setFilterBlocked(e.target.value); setPage(1) }}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
          <option value="">전체</option>
          <option value="false">정상</option>
          <option value="true">차단됨</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-text-muted">리뷰가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const fb = FEEDBACK_LABELS[r.feedbackType] || FEEDBACK_LABELS.general
            return (
              <div key={r._id} className={`bg-bg-tertiary/30 border rounded-xl p-4 ${r.isBlocked ? 'border-red-500/40' : 'border-line'} ${actionId === r._id ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-bg-tertiary rounded-full flex items-center justify-center text-sm font-bold text-text-primary flex-shrink-0">
                    {(r.userId?.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-text-secondary text-sm font-medium">{r.userId?.username}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${fb.cls}`}>{fb.label}</span>
                      {r.isBlocked && <span className="bg-red-500/10 text-red-400 text-xs px-1.5 rounded border border-red-500/30">차단됨</span>}
                    </div>
                    <p className={`text-sm font-semibold mb-0.5 ${r.isBlocked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{r.title}</p>
                    <p className={`text-xs line-clamp-2 ${r.isBlocked ? 'text-text-muted' : 'text-text-secondary'}`}>{r.content}</p>
                    <p className="text-text-muted text-xs mt-1">{formatDate(r.createdAt)} · 도움됨 {r.helpfulCount || 0}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleBlock(r)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-base border transition-colors ${r.isBlocked ? 'bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40' : 'bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40'}`}>
                      {r.isBlocked ? <><ShieldCheck className="w-3 h-3" /> 해제</> : <><ShieldOff className="w-3 h-3" /> 차단</>}
                    </button>
                    <button onClick={() => handleDelete(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-base border bg-red-700/20 text-red-400 border-red-600/40 hover:bg-red-700/40 transition-colors">
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronLeft className="w-4 h-4 text-text-primary" />
          </button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}
