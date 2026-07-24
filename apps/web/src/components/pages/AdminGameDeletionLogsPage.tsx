'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, Eye, X, RotateCcw } from 'lucide-react'
import { gameService } from '@/services/gameService'
import adminService from '@/services/adminService'
import AdminLayout from '@/components/AdminLayout'
import ConfirmModal from '@/components/ConfirmModal'
import { GENRES } from '@/constants/game'

const GENRE_NORMALIZE: Record<string, string> = Object.fromEntries(GENRES.map(g => [g, g]))
const normalizeGenre = (v?: string) => (v ? (GENRE_NORMALIZE[v] ?? v) : '-')



interface DeletionLog {
  _id: string
  gameId: string
  gameTitle: string
  gameGenre?: string
  developerId: string
  developerUsername?: string
  developerCompanyName?: string
  deletedBy: string
  deletedByUsername?: string
  deletedByEmail?: string
  deletedByRole?: string
  reason: string
  ipAddress?: string
  userAgent?: string
  gameSnapshot?: Record<string, unknown>
  deletedAt: string
  totalRevenue?: number
}

export default function AdminGameDeletionLogsPage() {
  const [logs, setLogs] = useState<DeletionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [detail, setDetail] = useState<DeletionLog | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<DeletionLog | null>(null)
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await gameService.getGameDeletionLogs({ page, limit, search: debouncedSearch || undefined })
      setLogs(data.logs || [])
      setPages(data.pagination?.pages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '감사 로그를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  const handleRestore = async (log: DeletionLog) => {
    setRestoring(log._id)
    try {
      await adminService.restoreGame(log._id)
      alert('게임이 복구되었습니다.')
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '복구에 실패했습니다.')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <AdminLayout>
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-400" />
            삭제 게임 관리
          </h1>
          <p className="text-text-muted text-sm mt-1">개발자 포털에서 삭제된 게임을 검토하고 처리합니다</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 border border-line hover:bg-bg-tertiary rounded-md text-base text-text-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      <div className="bg-bg-secondary border border-line rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="게임명, 개발사, 삭제 유저로 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-line rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-secondary">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 불러오는 중...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-bg-tertiary/50 divide-x divide-line/30">
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">게임명</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">개발사</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">삭제 유저</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">삭제 당시 상태</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">삭제일시</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">게임 복구</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium">상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log._id} className={`border-b border-line divide-x divide-line/30 hover:bg-bg-tertiary/30 transition-colors ${idx % 2 !== 0 ? 'bg-bg-tertiary/10' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text-primary">{log.gameTitle}</p>
                      {log.gameGenre && <p className="text-xs text-text-muted">{normalizeGenre(log.gameGenre)}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{log.developerCompanyName || log.developerUsername || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-text-primary">{log.deletedByUsername || '-'}</p>
                      <p className="text-xs text-text-muted">{log.deletedByEmail || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const snap = log.gameSnapshot as Record<string, string> | undefined
                        if (!snap) return <span className="text-xs text-text-muted">-</span>
                        const isSuspended = !!snap.suspendedAt
                        const s =
                          isSuspended ? { label: '강제 중지 중', color: 'text-red-400', dot: 'bg-red-400', pulse: false }
                          : snap.approvalStatus === 'not_submitted' ? { label: '초안 작성 중', color: 'text-text-muted', dot: 'bg-text-muted', pulse: false }
                          : snap.approvalStatus === 'pending' || snap.approvalStatus === 'review' ? { label: '심사 중', color: 'text-yellow-400', dot: 'bg-yellow-400', pulse: true }
                          : snap.approvalStatus === 'rejected' ? { label: '심사 거부', color: 'text-red-400', dot: 'bg-red-400', pulse: false }
                          : snap.approvalStatus === 'approved' && snap.status !== 'published' ? { label: '출시 대기', color: 'text-emerald-400', dot: 'bg-emerald-400', pulse: true }
                          : snap.approvalStatus === 'approved' ? { label: '운영 중', color: 'text-blue-500', dot: 'bg-blue-500', pulse: true }
                          : { label: '-', color: 'text-text-muted', dot: 'bg-text-muted', pulse: false }
                        return (
                          <span className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap ${s.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
                            {s.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {new Date(log.deletedAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => setRestoreTarget(log)}
                        disabled={restoring === log._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-base font-semibold bg-blue-500 hover:bg-blue-400 text-black rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="게임 복구"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${restoring === log._id ? 'animate-spin' : ''}`} />
                        복구하기
                      </button>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => setDetail(log)}
                        className="p-1.5 text-text-secondary hover:text-accent rounded-md"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-16 text-text-secondary">
                {debouncedSearch ? '검색 결과가 없습니다.' : '삭제 기록이 없습니다.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 border border-line rounded-md disabled:opacity-30 hover:bg-bg-tertiary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="p-2 border border-line rounded-md disabled:opacity-30 hover:bg-bg-tertiary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetail(null)}>
          <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-bg-secondary">
              <h2 className="text-lg font-bold">삭제 로그 상세</h2>
              <button onClick={() => setDetail(null)} className="text-text-secondary hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Row label="게임명" value={detail.gameTitle} />
              <Row label="게임 ID" value={detail.gameId} mono />
              <Row label="장르" value={detail.gameGenre || '-'} />
              <Row label="개발사" value={detail.developerCompanyName || detail.developerUsername || detail.developerId} />
              <Row label="총 발생 매출" value={`${(detail.totalRevenue ?? 0).toLocaleString('ko-KR')}원`} />
              <Row label="요청자" value={`${detail.deletedByUsername || '-'} (${detail.deletedByEmail || '-'})`} />
              <Row label="권한" value={detail.deletedByRole || '-'} />
              <Row label="등록 일시" value={detail.gameSnapshot?.createdAt ? new Date(detail.gameSnapshot.createdAt as string).toLocaleString('ko-KR') : '-'} />
              <Row label="삭제일시" value={new Date(detail.deletedAt).toLocaleString('ko-KR')} />
              <Row label="IP 주소" value={detail.ipAddress || '-'} mono />
              <Row label="User Agent" value={detail.userAgent || '-'} mono />
              {detail.gameSnapshot && (
                <div>
                  <p className="text-text-secondary mb-1">게임 스냅샷</p>
                  <pre className="p-3 bg-bg-tertiary rounded-md border border-line text-xs overflow-x-auto text-text-secondary">
                    {JSON.stringify(detail.gameSnapshot, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!restoreTarget}
        title="복구"
        message={`"${restoreTarget?.gameTitle}" 게임을 복구하시겠습니까?`}
        confirmLabel="복구"
        onConfirm={() => {
          if (!restoreTarget) return
          handleRestore(restoreTarget)
          setRestoreTarget(null)
        }}
        onCancel={() => setRestoreTarget(null)}
      />
    </div>
    </AdminLayout>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 text-text-secondary flex-shrink-0">{label}</span>
      <span className={`text-text-primary flex-1 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
