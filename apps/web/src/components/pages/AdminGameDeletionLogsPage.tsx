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
  hiddenFromCommunity?: boolean
}

export default function AdminGameDeletionLogsPage() {
  const [logs, setLogs] = useState<DeletionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [developerFilter, setDeveloperFilter] = useState('')
  const [developerOptions, setDeveloperOptions] = useState<{ id: string; name: string }[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [detail, setDetail] = useState<DeletionLog | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<DeletionLog | null>(null)
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await gameService.getGameDeletionLogs({
        page, limit,
        search: debouncedSearch || undefined,
        developerId: developerFilter || undefined,
        deletedByRole: roleFilter || undefined,
      })
      setLogs(data.logs || [])
      setPages(data.pagination?.pages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || '감사 로그를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, developerFilter, roleFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    adminService.getAllGames({ limit: 1000 }).then((data) => {
      const map = new Map<string, string>()
      for (const g of data.games || []) {
        const dev = g.developerId
        if (!dev) continue
        const id = dev._id || dev
        const name = dev?.companyInfo?.companyName || dev?.username || ''
        if (id && name) map.set(id, name)
      }
      setDeveloperOptions(Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)))
    }).catch(() => {})
  }, [])

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

  const handleToggleCommunityVisibility = async (log: DeletionLog) => {
    const nextHidden = !log.hiddenFromCommunity
    setTogglingVisibility(log._id)
    setLogs(prev => prev.map(l => l._id === log._id ? { ...l, hiddenFromCommunity: nextHidden } : l))
    try {
      await adminService.updateGameCommunityVisibility(log._id, nextHidden)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg || '변경에 실패했습니다.')
      setLogs(prev => prev.map(l => l._id === log._id ? { ...l, hiddenFromCommunity: log.hiddenFromCommunity } : l))
    } finally {
      setTogglingVisibility(null)
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
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={developerFilter}
            onChange={(e) => { setDeveloperFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">개발사</option>
            {developerOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">삭제 그룹</option>
            <option value="admin">관리자</option>
            <option value="developer">개발사</option>
          </select>
          <div className="relative flex-1 min-w-[240px]">
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
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-line bg-bg-tertiary/50 divide-x divide-line/30">
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">게임명</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">개발사</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">삭제 유저</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">삭제 그룹</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">삭제일시</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">커뮤니티 탭</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">게임 복구</th>
                  <th className="px-4 py-3 text-left text-sm text-text-secondary font-medium whitespace-nowrap">상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log._id} className={`border-b border-line divide-x divide-line/30 hover:bg-bg-tertiary/30 transition-colors ${idx % 2 !== 0 ? 'bg-bg-tertiary/10' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text-primary">{log.gameTitle}</p>
                      {log.gameGenre && <p className="text-xs text-text-muted">{normalizeGenre(log.gameGenre)}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{log.developerCompanyName || log.developerUsername || '-'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <p className="text-text-primary">{log.deletedByUsername || '-'}</p>
                      <p className="text-xs text-text-muted">{log.deletedByEmail || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap ${log.deletedByRole === 'admin' ? 'text-red-400' : 'text-blue-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.deletedByRole === 'admin' ? 'bg-red-400' : 'bg-blue-400'}`} />
                        {log.deletedByRole === 'admin' ? '관리자' : '개발사'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {new Date(log.deletedAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleCommunityVisibility(log)}
                        disabled={togglingVisibility === log._id}
                        className="flex items-center gap-2 disabled:opacity-40"
                        title="커뮤니티 사이드바 탭 노출 여부"
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors ${!log.hiddenFromCommunity ? 'bg-green-500' : 'bg-bg-muted'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${!log.hiddenFromCommunity ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className={`text-xs whitespace-nowrap ${!log.hiddenFromCommunity ? 'text-green-400' : 'text-text-muted'}`}>
                          {log.hiddenFromCommunity ? '숨김' : '노출'}
                        </span>
                      </button>
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
