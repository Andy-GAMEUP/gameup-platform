'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import partnerService, { PartnerApplication } from '@/services/partnerService'
import { ChevronLeft, ChevronRight, Loader2, X, ExternalLink } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  approved:  { label: '정상',   cls: 'bg-green-600/20 text-green-300 border border-green-500/40' },
  suspended: { label: '정지됨', cls: 'bg-red-600/20 text-red-300 border border-red-500/40' },
}

function PartnerDetailModal({
  partner,
  onClose,
  onStatusChange,
  loading,
}: {
  partner: PartnerApplication
  onClose: () => void
  onStatusChange: (status: 'approved' | 'suspended') => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-white font-bold text-lg">{partner.userId?.username}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[partner.status]?.cls}`}>
              {STATUS_MAP[partner.status]?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">이메일</p>
              <p className="text-white text-sm">{partner.userId?.email}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">포스트 수</p>
              <p className="text-white text-sm">{partner.postCount}</p>
            </div>
            {partner.approvedAt && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">승인일</p>
                <p className="text-white text-sm">{new Date(partner.approvedAt).toLocaleDateString('ko-KR')}</p>
              </div>
            )}
          </div>

          {partner.slogan && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">슬로건</p>
              <p className="text-white text-sm italic">"{partner.slogan}"</p>
            </div>
          )}

          {partner.selectedTopics?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">주제</p>
              <div className="flex flex-wrap gap-2">
                {partner.selectedTopics.map((t) => (
                  <span key={t} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">자기소개</p>
            <p className="text-slate-200 text-sm whitespace-pre-wrap bg-slate-800 rounded-lg p-3">{partner.introduction}</p>
          </div>

          {partner.externalUrl && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">외부 링크</p>
              <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer"
                className="text-cyan-400 hover:underline text-sm flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {partner.externalUrl}
              </a>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 flex gap-3">
          {partner.status === 'approved' ? (
            <button onClick={() => onStatusChange('suspended')} disabled={loading}
              className="flex-1 py-2 text-sm text-red-300 border border-red-500/40 rounded-lg hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              파트너 정지
            </button>
          ) : (
            <button onClick={() => onStatusChange('approved')} disabled={loading}
              className="flex-1 py-2 text-sm text-green-300 border border-green-500/40 rounded-lg hover:bg-green-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              정지 해제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPartnerManagementPage() {
  const [partners, setPartners] = useState<PartnerApplication[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selected, setSelected] = useState<PartnerApplication | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await partnerService.admin.getPartners({ page, limit: 20 })
      setPartners(data.partners || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (status: 'approved' | 'suspended') => {
    if (!selected) return
    setActionLoading(true)
    try {
      await partnerService.admin.updatePartnerStatus(selected._id, status)
      showToast(status === 'suspended' ? '파트너가 정지되었습니다' : '정지가 해제되었습니다')
      setSelected(null)
      load()
    } catch {
      showToast('처리 실패', false)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white font-bold text-xl">파트너 관리</h1>
          <p className="text-slate-400 text-sm mt-1">총 {total}명</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">#</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">사용자명</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">슬로건</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">포스트</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">상태</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">승인일</th>
                <th className="px-4 py-3 text-left text-slate-400 text-xs font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : partners.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-sm">파트너가 없습니다</td></tr>
              ) : (
                partners.map((p, idx) => (
                  <tr key={p._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-sm">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{p.userId?.username ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm max-w-[200px] truncate">{p.slogan || '-'}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{p.postCount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[p.status]?.cls}`}>
                        {STATUS_MAP[p.status]?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(p)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/30 px-2 py-1 rounded">
                        관리
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <PartnerDetailModal
          partner={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          loading={actionLoading}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
