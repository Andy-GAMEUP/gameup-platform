'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import partnerService, { PartnerApplication } from '@/services/partnerService'
import { ChevronLeft, ChevronRight, Loader2, X, Check, XCircle } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: '심사 중',  cls: 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/40' },
  approved: { label: '선정됨',  cls: 'bg-accent-light text-accent border border-green-500/40' },
  rejected: { label: '거절됨',  cls: 'bg-accent-light text-accent-text border border-red-500/40' },
  suspended:{ label: '정지됨',  cls: 'bg-bg-muted/40 text-text-secondary border border-line' },
}

const TABS = [
  { value: 'all',      label: '전체' },
  { value: 'pending',  label: '심사 중' },
  { value: 'approved', label: '선정됨' },
  { value: 'rejected', label: '거절됨' },
]

function DetailModal({
  partner,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  partner: PartnerApplication
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
  loading: boolean
}) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h3 className="text-text-primary font-bold text-lg">{partner.userId.username}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[partner.status]?.cls}`}>
              {STATUS_MAP[partner.status]?.label}
            </span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">이메일</p>
            <p className="text-text-primary text-sm">{partner.userId.email}</p>
          </div>

          {partner.userId.level !== undefined && (
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">레벨</p>
              <p className="text-text-primary text-sm">Lv.{partner.userId.level}</p>
            </div>
          )}

          {partner.slogan && (
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">슬로건</p>
              <p className="text-text-primary text-sm">{partner.slogan}</p>
            </div>
          )}

          <div>
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">자기소개</p>
            <p className="text-text-primary text-sm whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3">{partner.introduction}</p>
          </div>

          <div>
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">활동 계획</p>
            <p className="text-text-primary text-sm whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3">{partner.activityPlan}</p>
          </div>

          {partner.selectedTopics?.length > 0 && (
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">선택 주제</p>
              <div className="flex flex-wrap gap-2">
                {partner.selectedTopics.map((t) => (
                  <span key={t} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          {partner.externalUrl && (
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">외부 링크</p>
              <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer"
                className="text-cyan-400 hover:underline text-sm break-all">{partner.externalUrl}</a>
            </div>
          )}

          <div>
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">신청일</p>
            <p className="text-text-primary text-sm">{new Date(partner.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>

          {partner.status === 'rejected' && partner.rejectedReason && (
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">거절 사유</p>
              <p className="text-accent-text text-sm bg-accent-light rounded-lg p-3">{partner.rejectedReason}</p>
            </div>
          )}
        </div>

        {partner.status === 'pending' && (
          <div className="p-6 border-t border-line space-y-3">
            {showRejectInput ? (
              <div className="space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="거절 사유를 입력하세요"
                  rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-line resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRejectInput(false)}
                    className="flex-1 py-2 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">
                    취소
                  </button>
                  <button onClick={() => onReject(rejectReason)} disabled={loading}
                    className="flex-1 py-2 text-sm text-text-primary bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    거절 확인
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowRejectInput(true)} disabled={loading}
                  className="flex-1 py-2 text-sm text-accent-text border border-red-500/40 rounded-lg hover:bg-accent-light transition-colors flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> 거절
                </button>
                <button onClick={onApprove} disabled={loading}
                  className="flex-1 py-2 text-sm text-text-primary bg-green-700 hover:bg-green-800 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  승인
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPartnerRequestsPage() {
  const [requests, setRequests] = useState<PartnerApplication[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
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
      const params: Record<string, unknown> = { page, limit: 20 }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await partnerService.admin.getRequests(params as Parameters<typeof partnerService.admin.getRequests>[0])
      setRequests(data.requests || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  const handleApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await partnerService.admin.updateRequest(selected._id, { status: 'approved' })
      showToast('승인되었습니다')
      setSelected(null)
      load()
    } catch {
      showToast('처리 실패', false)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (reason: string) => {
    if (!selected) return
    setActionLoading(true)
    try {
      await partnerService.admin.updateRequest(selected._id, { status: 'rejected', rejectedReason: reason })
      showToast('거절되었습니다')
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-primary font-bold text-xl">파트너 신청 관리</h1>
            <p className="text-text-secondary text-sm mt-1">총 {total}건</p>
          </div>
        </div>

        <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                statusFilter === tab.value
                  ? 'bg-accent-light text-accent-text border border-accent-muted'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">#</th>
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">사용자명</th>
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">이메일</th>
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">신청일</th>
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">상태</th>
                <th className="px-4 py-3 text-left text-text-secondary text-xs font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-text-secondary text-sm">신청 내역이 없습니다</td></tr>
              ) : (
                requests.map((r, idx) => (
                  <tr key={r._id} className="border-b border-line/50 hover:bg-bg-tertiary/30 transition-colors">
                    <td className="px-4 py-3 text-text-secondary text-sm">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-4 py-3 text-text-primary text-sm font-medium">{r.userId?.username ?? '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{r.userId?.email ?? '-'}</td>
                    <td className="px-4 py-3 text-text-secondary text-sm">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[r.status]?.cls}`}>
                        {STATUS_MAP[r.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(r)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/30 px-2 py-1 rounded">
                        상세
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
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          partner={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-text-primary shadow-lg z-50 ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
