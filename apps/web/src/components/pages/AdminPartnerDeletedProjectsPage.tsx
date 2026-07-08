'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import partnerService from '@/services/partnerService'
import { Trash2, Loader2, Search, RotateCcw } from 'lucide-react'

interface ProjectDeletionLog {
  _id: string
  title: string
  category?: string
  ownerUsername?: string
  applicantCount?: number
  createdAt?: string
  deletedAt: string
  restoredAt?: string
}

export default function AdminPartnerDeletedProjectsPage() {
  const [logs, setLogs] = useState<ProjectDeletionLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const limit = 15

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await partnerService.admin.getDeletedProjects({ page, limit, search: search || undefined })
      setLogs(data.logs)
      setTotal(data.total)
    } catch {
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handlePermanentDelete = async (log: ProjectDeletionLog) => {
    if (!confirm(`"${log.title}" 프로젝트 기록을 완전히 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?`)) return
    setDeleting(log._id)
    try {
      await partnerService.admin.deleteProjectLog(log._id)
      loadLogs()
    } catch {
      alert('완전 삭제 실패')
    } finally {
      setDeleting(null)
    }
  }

  const handleRestore = async (log: ProjectDeletionLog) => {
    if (!confirm(`"${log.title}" 프로젝트를 복구하시겠습니까?`)) return
    setSubmitting(log._id)
    try {
      await partnerService.admin.restoreProject(log._id)
      loadLogs()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || '복구 실패'
      alert(msg)
    } finally {
      setSubmitting(null)
    }
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <h2 className="text-text-primary text-xl font-bold">삭제된 프로젝트</h2>
          </div>
          <p className="text-text-muted text-sm mt-1">관리자가 삭제한 파트너 프로젝트 목록입니다. Super 관리자만 살리기가 가능합니다.</p>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="프로젝트명 검색..."
            className="w-full bg-bg-tertiary border border-line text-text-primary rounded-lg pl-9 pr-3 py-1.5 text-sm placeholder-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="bg-bg-secondary rounded-xl border border-line overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">No.</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">프로젝트명</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">등록사</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">등록일</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">삭제일</th>
                    <th className="text-left px-4 py-3 font-medium border-r border-line/30">복구</th>
                    <th className="text-left px-4 py-3 font-medium">완전 삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-text-muted">삭제된 프로젝트가 없습니다</td>
                    </tr>
                  ) : logs.map((log, idx) => (
                    <tr key={log._id} className="hover:bg-bg-tertiary/30 transition-colors">
                      <td className="px-4 py-3 text-text-secondary border-r border-line/20">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-3 text-text-primary font-medium border-r border-line/20">{log.title}</td>
                      <td className="px-4 py-3 text-text-secondary border-r border-line/20">{log.ownerUsername || '-'}</td>
                      <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary border-r border-line/20">
                        {new Date(log.deletedAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 border-r border-line/20">
                        <button
                          onClick={() => handleRestore(log)}
                          disabled={submitting === log._id || deleting === log._id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {submitting === log._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          살리기
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handlePermanentDelete(log)}
                          disabled={submitting === log._id || deleting === log._id}
                          className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {deleting === log._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          완전 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">이전</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === p ? 'bg-slate-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>{p}</button>
              ) : null
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg bg-bg-tertiary text-text-secondary hover:bg-line-light disabled:opacity-40">다음</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
