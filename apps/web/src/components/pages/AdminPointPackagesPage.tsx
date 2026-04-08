'use client'
import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import adminService from '../../services/adminService'

interface PointPackage {
  _id: string
  name: string
  points: number
  price: number
  unitPrice: number
  description: string
  isActive: boolean
  sortOrder: number
}

export default function AdminPointPackagesPage() {
  const [packages, setPackages] = useState<PointPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<PointPackage | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [form, setForm] = useState({ name: '', points: '', price: '', description: '', sortOrder: '0' })

  const loadPackages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getPointPackages()
      setPackages(data.packages || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadPackages() }, [loadPackages])

  const handleCreate = async () => {
    if (!form.name || !form.points || !form.price) return
    try {
      await adminService.createPointPackage({
        name: form.name,
        points: Number(form.points),
        price: Number(form.price),
        description: form.description,
        sortOrder: Number(form.sortOrder),
      })
      setCreateModal(false)
      setForm({ name: '', points: '', price: '', description: '', sortOrder: '0' })
      loadPackages()
    } catch { alert('상품 생성에 실패했습니다') }
  }

  const handleUpdate = async () => {
    if (!editModal) return
    try {
      await adminService.updatePointPackage(editModal._id, editModal)
      setEditModal(null)
      loadPackages()
    } catch { alert('상품 수정에 실패했습니다') }
  }

  const handleToggle = async (pkg: PointPackage) => {
    try {
      await adminService.updatePointPackage(pkg._id, { isActive: !pkg.isActive })
      loadPackages()
    } catch { alert('상태 변경에 실패했습니다') }
  }

  const inputCls = 'w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="w-8 h-8 text-accent" /> 포인트 상품 관리
          </h1>
          <p className="text-sm text-text-secondary mt-1">개발사가 구매할 수 있는 포인트 패키지를 관리합니다</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm transition-colors">
          <Plus className="w-4 h-4" /> 새 상품
        </button>
      </div>

      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">로딩 중...</div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">등록된 포인트 상품이 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary/50">
              <tr>
                <th className="text-left p-3 text-text-secondary font-medium">순서</th>
                <th className="text-left p-3 text-text-secondary font-medium">상품명</th>
                <th className="text-right p-3 text-text-secondary font-medium">포인트</th>
                <th className="text-right p-3 text-text-secondary font-medium">가격</th>
                <th className="text-right p-3 text-text-secondary font-medium">단가</th>
                <th className="text-center p-3 text-text-secondary font-medium">상태</th>
                <th className="text-center p-3 text-text-secondary font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {packages.map(pkg => (
                <tr key={pkg._id} className="hover:bg-bg-tertiary/20">
                  <td className="p-3 text-text-muted">{pkg.sortOrder}</td>
                  <td className="p-3">
                    <div className="font-medium">{pkg.name}</div>
                    {pkg.description && <div className="text-xs text-text-muted">{pkg.description}</div>}
                  </td>
                  <td className="p-3 text-right font-bold text-accent">{pkg.points.toLocaleString()}P</td>
                  <td className="p-3 text-right">{pkg.price.toLocaleString()}원</td>
                  <td className="p-3 text-right text-text-muted">{pkg.unitPrice}원/P</td>
                  <td className="p-3 text-center">
                    <button onClick={() => handleToggle(pkg)}>
                      {pkg.isActive ? <ToggleRight className="w-5 h-5 text-green-400 inline" /> : <ToggleLeft className="w-5 h-5 text-text-muted inline" />}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setEditModal({ ...pkg })}
                      className="p-1.5 border border-line rounded-md hover:bg-bg-tertiary"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 생성 모달 */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setCreateModal(false)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">새 포인트 상품</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-text-secondary mb-1">상품명 *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="예: 베이직 패키지" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-text-secondary mb-1">포인트 *</label><input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} className={inputCls} placeholder="1000" /></div>
                <div><label className="block text-sm text-text-secondary mb-1">가격 (원) *</label><input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inputCls} placeholder="10000" /></div>
              </div>
              <div><label className="block text-sm text-text-secondary mb-1">설명</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="상품 설명" /></div>
              <div><label className="block text-sm text-text-secondary mb-1">정렬 순서</label><input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setCreateModal(false)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">생성</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay" onClick={() => setEditModal(null)}>
          <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">상품 수정</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-text-secondary mb-1">상품명</label><input value={editModal.name} onChange={e => setEditModal(p => p ? { ...p, name: e.target.value } : null)} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-text-secondary mb-1">포인트</label><input type="number" value={editModal.points} onChange={e => setEditModal(p => p ? { ...p, points: Number(e.target.value) } : null)} className={inputCls} /></div>
                <div><label className="block text-sm text-text-secondary mb-1">가격 (원)</label><input type="number" value={editModal.price} onChange={e => setEditModal(p => p ? { ...p, price: Number(e.target.value) } : null)} className={inputCls} /></div>
              </div>
              <div><label className="block text-sm text-text-secondary mb-1">설명</label><input value={editModal.description} onChange={e => setEditModal(p => p ? { ...p, description: e.target.value } : null)} className={inputCls} /></div>
              <div><label className="block text-sm text-text-secondary mb-1">정렬 순서</label><input type="number" value={editModal.sortOrder} onChange={e => setEditModal(p => p ? { ...p, sortOrder: Number(e.target.value) } : null)} className={inputCls} /></div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 border border-line rounded-md text-sm hover:bg-bg-tertiary">취소</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
