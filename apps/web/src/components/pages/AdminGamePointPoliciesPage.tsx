'use client'
import { useState, useEffect, useCallback } from 'react'
import { Gift, Check, X, Eye, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react'
import adminService from '../../services/adminService'

interface GamePointPolicy {
  _id: string
  gameId: { _id: string; title: string; thumbnail?: string; serviceType: string }
  developerId: { _id: string; username: string; email: string }
  type: string
  label: string
  description: string
  amount: number
  multiplier: number
  dailyLimit: number | null
  startDate?: string | null
  endDate?: string | null
  estimatedDailyUsage?: number
  developerNote?: string
  conditionConfig?: Record<string, unknown> | null
  isActive: boolean
  approvalStatus: string
  adminNote?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<string, string> = {
  game_account_create: '게임 계정 생성',
  game_daily_login: '게임 일일 접속',
  game_play_time: '게임 플레이 시간',
  game_purchase: '게임 결제 보상',
  game_event_participate: '게임 이벤트 참여',
  game_level_achieve: '레벨 도달 보상',
  game_ranking: '게임 랭킹 보상',
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '초안' },
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '승인 대기' },
  approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '승인됨' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: '거절됨' },
}

export default function AdminGamePointPoliciesPage() {
  const [policies, setPolicies] = useState<GamePointPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailModal, setDetailModal] = useState<GamePointPolicy | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchRejectModal, setBatchRejectModal] = useState(false)
  const [batchRejectReason, setBatchRejectReason] = useState('')

  const loadPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getGamePointPolicies({
        status: statusFilter || undefined,
        page,
        limit: 20,
      })
      setPolicies(data.policies || [])
      setTotalPages(data.pagination?.pages || 1)
    } catch { /* ignore */ }
    setLoading(false)
  }, [statusFilter, page])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  const handleApprove = async (id: string) => {
    if (!confirm('이 정책을 승인하시겠습니까?')) return
    try {
      await adminService.approveGamePointPolicy(id)
      loadPolicies()
    } catch { alert('승인에 실패했습니다') }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    try {
      await adminService.rejectGamePointPolicy(rejectModal, rejectReason)
      setRejectModal(null)
      setRejectReason('')
      loadPolicies()
    } catch { alert('거절에 실패했습니다') }
  }

  const handleToggle = async (id: string) => {
    try {
      await adminService.toggleGamePointPolicy(id)
      loadPolicies()
    } catch { alert('상태 변경에 실패했습니다') }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const pendingIds = policies.filter(p => p.approvalStatus === 'pending').map(p => p._id)
    if (pendingIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingIds))
    }
  }

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}건의 정책을 일괄 승인하시겠습니까?`)) return
    try {
      await adminService.batchApproveGamePointPolicies(Array.from(selectedIds))
      setSelectedIds(new Set())
      loadPolicies()
    } catch { alert('일괄 승인에 실패했습니다') }
  }

  const handleBatchReject = async () => {
    if (selectedIds.size === 0 || !batchRejectReason.trim()) return
    try {
      await adminService.batchRejectGamePointPolicies(Array.from(selectedIds), batchRejectReason)
      setSelectedIds(new Set())
      setBatchRejectModal(false)
      setBatchRejectReason('')
      loadPolicies()
    } catch { alert('일괄 거절에 실패했습니다') }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Gift className="w-8 h-8 text-accent" /> 게임 포인트 정책 관리
        </h1>
        <p className="text-sm text-text-secondary mt-1">개발사가 신청한 게임 연동 포인트 정책을 검토하고 승인합니다</p>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: '전체' },
          { value: 'pending', label: '승인 대기' },
          { value: 'approved', label: '승인됨' },
          { value: 'rejected', label: '거절됨' },
          { value: 'draft', label: '초안' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              statusFilter === f.value
                ? 'bg-accent text-text-primary'
                : 'bg-bg-secondary border border-line text-text-secondary hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 일괄 작업 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size}건 선택됨</span>
          <button onClick={handleBatchApprove} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors">
            일괄 승인
          </button>
          <button onClick={() => { setBatchRejectModal(true); setBatchRejectReason('') }} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors">
            일괄 거절
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 border border-line rounded text-sm hover:bg-bg-tertiary">
            선택 해제
          </button>
        </div>
      )}

      {/* 정책 목록 */}
      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">로딩 중...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">해당 조건의 정책이 없습니다</div>
        ) : (
          <>
          {statusFilter === 'pending' && policies.length > 0 && (
            <div className="px-4 py-2 border-b border-line bg-bg-tertiary/30">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" checked={policies.filter(p => p.approvalStatus === 'pending').every(p => selectedIds.has(p._id))} onChange={toggleSelectAll} className="w-4 h-4 accent-accent" />
                전체 선택
              </label>
            </div>
          )}
          <div className="divide-y divide-line">
            {policies.map(policy => {
              const status = STATUS_MAP[policy.approvalStatus] || STATUS_MAP.draft
              return (
                <div key={policy._id} className="p-4 hover:bg-bg-tertiary/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {policy.approvalStatus === 'pending' && (
                      <input type="checkbox" checked={selectedIds.has(policy._id)} onChange={() => toggleSelect(policy._id)} className="w-4 h-4 accent-accent mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{policy.gameId?.title || '(삭제된 게임)'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>{status.label}</span>
                        {policy.isActive && policy.approvalStatus === 'approved' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">활성</span>
                        )}
                        {policy.gameId?.serviceType && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{policy.gameId.serviceType}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-secondary mb-1">
                        <span>{TYPE_LABELS[policy.type] || policy.type}</span>
                        <span>|</span>
                        <span>기본: {policy.amount}P</span>
                        {policy.multiplier !== 1 && <><span>|</span><span>배율: x{policy.multiplier}</span></>}
                        {policy.dailyLimit && <><span>|</span><span>일일 한도: {policy.dailyLimit}P</span></>}
                      </div>
                      <div className="text-xs text-text-muted">
                        개발사: {policy.developerId?.username || '-'} ({policy.developerId?.email || '-'})
                        {policy.description && ` · ${policy.description}`}
                      </div>
                      {(policy.startDate || policy.endDate || policy.estimatedDailyUsage || policy.developerNote) && (
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-1 flex-wrap">
                          {policy.startDate && <span>시작: {new Date(policy.startDate).toLocaleDateString()}</span>}
                          {policy.endDate && <span>종료: {new Date(policy.endDate).toLocaleDateString()}</span>}
                          {policy.estimatedDailyUsage ? <span>예상 일일: {policy.estimatedDailyUsage}P</span> : null}
                          {policy.developerNote && <span className="text-yellow-400">메모: {policy.developerNote}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setDetailModal(policy)} className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary" title="상세보기">
                        <Eye className="w-4 h-4" />
                      </button>
                      {policy.approvalStatus === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(policy._id)} className="p-1.5 border border-green-500/50 text-green-400 rounded-md hover:bg-green-500/10" title="승인">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setRejectModal(policy._id); setRejectReason('') }} className="p-1.5 border border-red-500/50 text-red-400 rounded-md hover:bg-red-500/10" title="거절">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {policy.approvalStatus === 'approved' && (
                        <button onClick={() => handleToggle(policy._id)} className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary" title={policy.isActive ? '비활성화' : '활성화'}>
                          {policy.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-text-muted" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border border-line rounded-md hover:bg-bg-tertiary disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border border-line rounded-md hover:bg-bg-tertiary disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 거절 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setRejectModal(null)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">정책 거절</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">거절 사유 *</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="개발사에게 전달될 거절 사유를 입력하세요"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent min-h-24 resize-y"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button onClick={handleReject} disabled={!rejectReason.trim()} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm disabled:opacity-50">거절</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 거절 모달 */}
      {batchRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setBatchRejectModal(false)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">일괄 거절 ({selectedIds.size}건)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">거절 사유 *</label>
                <textarea
                  value={batchRejectReason}
                  onChange={e => setBatchRejectReason(e.target.value)}
                  placeholder="선택된 모든 정책에 적용될 거절 사유를 입력하세요"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent min-h-24 resize-y"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setBatchRejectModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button onClick={handleBatchReject} disabled={!batchRejectReason.trim()} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm disabled:opacity-50">일괄 거절</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setDetailModal(null)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">정책 상세</h2>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-text-secondary">게임:</span> <span className="font-medium">{detailModal.gameId?.title}</span></div>
                <div><span className="text-text-secondary">서비스 타입:</span> <span className="font-medium">{detailModal.gameId?.serviceType}</span></div>
                <div><span className="text-text-secondary">포인트 타입:</span> <span className="font-medium">{TYPE_LABELS[detailModal.type]}</span></div>
                <div><span className="text-text-secondary">기본 금액:</span> <span className="font-medium">{detailModal.amount}P</span></div>
                <div><span className="text-text-secondary">배율:</span> <span className="font-medium">x{detailModal.multiplier}</span></div>
                <div><span className="text-text-secondary">일일 한도:</span> <span className="font-medium">{detailModal.dailyLimit ?? '무제한'}</span></div>
                <div><span className="text-text-secondary">시작일:</span> <span className="font-medium">{detailModal.startDate ? new Date(detailModal.startDate).toLocaleDateString() : '없음'}</span></div>
                <div><span className="text-text-secondary">종료일:</span> <span className="font-medium">{detailModal.endDate ? new Date(detailModal.endDate).toLocaleDateString() : '없음'}</span></div>
                <div><span className="text-text-secondary">예상 일일 사용:</span> <span className="font-medium">{detailModal.estimatedDailyUsage || 0}P</span></div>
              </div>
              {detailModal.developerNote && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded"><span className="text-text-secondary">개발사 메모:</span> {detailModal.developerNote}</div>
              )}
              {detailModal.description && (
                <div><span className="text-text-secondary">설명:</span> {detailModal.description}</div>
              )}
              <div><span className="text-text-secondary">개발사:</span> {detailModal.developerId?.username} ({detailModal.developerId?.email})</div>
              {detailModal.adminNote && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded"><span className="text-text-secondary">관리자 메모:</span> {detailModal.adminNote}</div>
              )}
              {detailModal.rejectionReason && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded"><span className="text-text-secondary">거절 사유:</span> {detailModal.rejectionReason}</div>
              )}
              <div className="text-xs text-text-muted">
                생성: {new Date(detailModal.createdAt).toLocaleString('ko-KR')} · 수정: {new Date(detailModal.updatedAt).toLocaleString('ko-KR')}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setDetailModal(null)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
