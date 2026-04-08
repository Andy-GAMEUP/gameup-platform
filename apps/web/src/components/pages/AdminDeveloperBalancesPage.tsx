'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wallet, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import adminService from '../../services/adminService'

interface DeveloperBalance {
  _id: string
  developerId: { _id: string; username: string; email: string }
  balance: number
  totalPurchased: number
  totalUsed: number
  lastPurchasedAt?: string
}

export default function AdminDeveloperBalancesPage() {
  const [balances, setBalances] = useState<DeveloperBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [adjustModal, setAdjustModal] = useState<DeveloperBalance | null>(null)
  const [adjustForm, setAdjustForm] = useState({ amount: '', type: 'admin_grant' as 'admin_grant' | 'admin_deduct', description: '' })

  const loadBalances = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getDeveloperBalances({ page, limit: 20 })
      setBalances(data.balances || [])
      setTotalPages(data.pagination?.pages || 1)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page])

  useEffect(() => { loadBalances() }, [loadBalances])

  const handleAdjust = async () => {
    if (!adjustModal || !adjustForm.amount || !adjustForm.description) return
    try {
      await adminService.adjustDeveloperBalance(adjustModal.developerId._id, {
        amount: Number(adjustForm.amount),
        type: adjustForm.type,
        description: adjustForm.description,
      })
      setAdjustModal(null)
      setAdjustForm({ amount: '', type: 'admin_grant', description: '' })
      loadBalances()
    } catch { alert('잔액 조정에 실패했습니다') }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wallet className="w-8 h-8 text-accent" /> 개발사 포인트 잔액 관리
        </h1>
        <p className="text-sm text-text-secondary mt-1">개발사별 포인트 잔액을 조회하고 수동 조정할 수 있습니다</p>
      </div>

      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">로딩 중...</div>
        ) : balances.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">개발사 잔액 데이터가 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary/50">
              <tr>
                <th className="text-left p-3 text-text-secondary font-medium">개발사</th>
                <th className="text-right p-3 text-text-secondary font-medium">잔액</th>
                <th className="text-right p-3 text-text-secondary font-medium">총 충전</th>
                <th className="text-right p-3 text-text-secondary font-medium">총 사용</th>
                <th className="text-right p-3 text-text-secondary font-medium">마지막 충전</th>
                <th className="text-center p-3 text-text-secondary font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {balances.map(b => (
                <tr key={b._id} className="hover:bg-bg-tertiary/20">
                  <td className="p-3">
                    <div className="font-medium">{b.developerId?.username || '-'}</div>
                    <div className="text-xs text-text-muted">{b.developerId?.email || '-'}</div>
                  </td>
                  <td className="p-3 text-right font-bold text-accent">{b.balance.toLocaleString()}P</td>
                  <td className="p-3 text-right text-green-400">{b.totalPurchased.toLocaleString()}P</td>
                  <td className="p-3 text-right text-red-400">{b.totalUsed.toLocaleString()}P</td>
                  <td className="p-3 text-right text-text-muted">{b.lastPurchasedAt ? new Date(b.lastPurchasedAt).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => { setAdjustModal(b); setAdjustForm({ amount: '', type: 'admin_grant', description: '' }) }}
                      className="px-3 py-1 bg-accent hover:bg-accent-hover rounded text-xs transition-colors"
                    >
                      조정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      {/* 잔액 조정 모달 */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setAdjustModal(null)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">잔액 조정 - {adjustModal.developerId?.username}</h2>
            <p className="text-sm text-text-secondary mb-4">현재 잔액: <strong className="text-accent">{adjustModal.balance.toLocaleString()}P</strong></p>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustForm(f => ({ ...f, type: 'admin_grant' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                    adjustForm.type === 'admin_grant' ? 'bg-green-600 border-green-600' : 'border-line hover:bg-bg-tertiary'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 지급
                </button>
                <button
                  onClick={() => setAdjustForm(f => ({ ...f, type: 'admin_deduct' }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                    adjustForm.type === 'admin_deduct' ? 'bg-red-600 border-red-600' : 'border-line hover:bg-bg-tertiary'
                  }`}
                >
                  <Minus className="w-4 h-4" /> 차감
                </button>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">금액 (P) *</label>
                <input
                  type="number"
                  value={adjustForm.amount}
                  onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="조정할 포인트 금액"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">사유 *</label>
                <textarea
                  value={adjustForm.description}
                  onChange={e => setAdjustForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="조정 사유를 입력하세요"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent min-h-20 resize-y"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAdjustModal(null)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button
                  onClick={handleAdjust}
                  disabled={!adjustForm.amount || !adjustForm.description}
                  className={`px-4 py-2 rounded-md text-sm disabled:opacity-50 ${adjustForm.type === 'admin_grant' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {adjustForm.type === 'admin_grant' ? '지급' : '차감'} 확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
