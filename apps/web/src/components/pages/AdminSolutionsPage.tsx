'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import solutionService, { Solution, SolutionSubscription } from '@/services/solutionService'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'

type TabType = 'solutions' | 'subscriptions'

const CATEGORIES = ['QA', '보안', '음성', '분석', '결제', '기타']
const STATUSES = ['pending', 'reviewing', 'approved', 'rejected'] as const
const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  reviewing: '검토중',
  approved: '승인',
  rejected: '거절',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  approved: 'bg-accent-light text-accent border-green-500/30',
  rejected: 'bg-accent-light text-accent-text border-accent-muted',
}

interface SortableRowProps {
  solution: Solution
  onEdit: (s: Solution) => void
  onDelete: (id: string) => void
  onToggle: (id: string, field: 'isActive' | 'isRecommended', val: boolean) => void
}

function SortableRow({ solution, onEdit, onDelete, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: solution._id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-line hover:bg-bg-tertiary/30">
      <td className="px-4 py-3">
        <button {...attributes} {...listeners} className="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-4 py-3 text-text-primary font-medium">{solution.name}</td>
      <td className="px-4 py-3">
        <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded">{solution.category}</span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(solution._id, 'isActive', !solution.isActive)}
          className={`w-10 h-5 rounded-full transition-colors ${solution.isActive ? 'bg-accent' : 'bg-bg-muted'}`}
        >
          <span className={`block w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${solution.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(solution._id, 'isRecommended', !solution.isRecommended)}
          className={`w-10 h-5 rounded-full transition-colors ${solution.isRecommended ? 'bg-orange-500' : 'bg-bg-muted'}`}
        >
          <span className={`block w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${solution.isRecommended ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </td>
      <td className="px-4 py-3 text-text-secondary text-sm">{solution.sortOrder}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(solution)} className="text-text-secondary hover:text-text-primary">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(solution._id)} className="text-text-secondary hover:text-accent-text">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

const defaultForm: Partial<Solution> = {
  name: '',
  category: 'QA',
  description: '',
  detailedDescription: '',
  imageUrl: '',
  features: [],
  pricing: '',
  contactUrl: '',
  isActive: true,
  isRecommended: false,
}

function SolutionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Solution>
  onSave: (data: Partial<Solution>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Solution>>(initial)
  const [featuresText, setFeaturesText] = useState((initial.features ?? []).join('\n'))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, features: featuresText.split('\n').map(s => s.trim()).filter(Boolean) })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-tertiary border border-line rounded-xl p-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-text-secondary text-xs mb-1 block">솔루션명 *</label>
          <input required value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-text-secondary text-xs mb-1 block">카테고리</label>
          <select value={form.category ?? 'QA'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-text-secondary text-xs mb-1 block">간략 설명 *</label>
          <input required value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <div className="col-span-2">
          <label className="text-text-secondary text-xs mb-1 block">상세 설명 (HTML)</label>
          <textarea value={form.detailedDescription ?? ''} onChange={e => setForm(p => ({ ...p, detailedDescription: e.target.value }))}
            rows={4} className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" />
        </div>
        <div>
          <label className="text-text-secondary text-xs mb-1 block">이미지 URL</label>
          <input value={form.imageUrl ?? ''} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-text-secondary text-xs mb-1 block">문의 URL</label>
          <input value={form.contactUrl ?? ''} onChange={e => setForm(p => ({ ...p, contactUrl: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <div className="col-span-2">
          <label className="text-text-secondary text-xs mb-1 block">주요 기능 (줄바꿈으로 구분)</label>
          <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)}
            rows={3} className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" />
        </div>
        <div className="col-span-2">
          <label className="text-text-secondary text-xs mb-1 block">요금 안내</label>
          <input value={form.pricing ?? ''} onChange={e => setForm(p => ({ ...p, pricing: e.target.value }))}
            className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-green-500" />
            활성
          </label>
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input type="checkbox" checked={form.isRecommended ?? false} onChange={e => setForm(p => ({ ...p, isRecommended: e.target.checked }))} className="accent-orange-500" />
            추천
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 bg-bg-tertiary hover:bg-bg-hover text-text-primary py-2 rounded-lg text-sm transition-colors">취소</button>
        <button type="submit" disabled={saving} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-text-primary py-2 rounded-lg text-sm transition-colors">
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}

function SolutionsTab() {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Solution | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = () => {
    setLoading(true)
    solutionService.admin.getSolutions()
      .then(({ solutions: s }) => setSolutions(s))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = solutions.findIndex(s => s._id === active.id)
    const newIndex = solutions.findIndex(s => s._id === over.id)
    const reordered = arrayMove(solutions, oldIndex, newIndex).map((s, i) => ({ ...s, sortOrder: i }))
    setSolutions(reordered)
    await solutionService.admin.reorderSolutions(reordered.map(s => ({ id: s._id, sortOrder: s.sortOrder })))
  }

  const handleSave = async (data: Partial<Solution>) => {
    if (editTarget) {
      await solutionService.admin.updateSolution(editTarget._id, data)
    } else {
      await solutionService.admin.createSolution(data)
    }
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await solutionService.admin.deleteSolution(id)
    load()
  }

  const handleToggle = async (id: string, field: 'isActive' | 'isRecommended', val: boolean) => {
    setSolutions(prev => prev.map(s => s._id === id ? { ...s, [field]: val } : s))
    await solutionService.admin.updateSolution(id, { [field]: val })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary font-bold text-lg">솔루션 관리</h2>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-text-primary px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> 솔루션 추가
        </button>
      </div>

      {(showForm && !editTarget) && (
        <div className="mb-6">
          <SolutionForm initial={defaultForm} onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-text-secondary text-center py-10">불러오는 중...</div>
      ) : (
        <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={solutions.map(s => s._id)} strategy={verticalListSortingStrategy}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line text-text-secondary text-xs">
                    <th className="px-4 py-3 text-left w-8" />
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">카테고리</th>
                    <th className="px-4 py-3 text-left">활성</th>
                    <th className="px-4 py-3 text-left">추천</th>
                    <th className="px-4 py-3 text-left">순서</th>
                    <th className="px-4 py-3 text-left">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {solutions.map(s => (
                    editTarget?._id === s._id ? (
                      <tr key={s._id}>
                        <td colSpan={7} className="p-4">
                          <SolutionForm
                            initial={s}
                            onSave={handleSave}
                            onCancel={() => setEditTarget(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <SortableRow
                        key={s._id}
                        solution={s}
                        onEdit={sol => { setEditTarget(sol); setShowForm(false) }}
                        onDelete={handleDelete}
                        onToggle={handleToggle}
                      />
                    )
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
          {solutions.length === 0 && (
            <div className="text-text-muted text-center py-10">솔루션이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  )
}

function SubscriptionRow({ sub, onStatusUpdate, onConfirm, onDelete }: {
  sub: SolutionSubscription
  onStatusUpdate: (id: string, status: string, adminNote: string) => Promise<void>
  onConfirm: (id: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(sub.status)
  const [adminNote, setAdminNote] = useState(sub.adminNote)
  const [saving, setSaving] = useState(false)

  const solutionObj = typeof sub.solutionId === 'object' ? sub.solutionId : null
  const userObj = typeof sub.userId === 'object' ? sub.userId : null

  return (
    <>
      <tr className="border-b border-line hover:bg-bg-tertiary/20">
        <td className="px-4 py-3 text-text-secondary text-sm">{solutionObj?.name ?? '-'}</td>
        <td className="px-4 py-3 text-text-secondary text-sm">{userObj?.username ?? '-'}</td>
        <td className="px-4 py-3 text-text-secondary text-sm">{sub.companyName}</td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[sub.status] ?? ''}`}>
            {STATUS_LABELS[sub.status] ?? sub.status}
          </span>
        </td>
        <td className="px-4 py-3 text-text-secondary text-xs">{new Date(sub.createdAt).toLocaleDateString('ko-KR')}</td>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(p => !p)} className="text-text-secondary hover:text-text-primary">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-bg-tertiary/30">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-text-muted">담당자</span>
                <p className="text-text-primary">{sub.managerName}</p>
              </div>
              <div>
                <span className="text-text-muted">연락처</span>
                <p className="text-text-primary">{sub.phone}</p>
              </div>
              <div>
                <span className="text-text-muted">이메일</span>
                <p className="text-text-primary">{sub.email}</p>
              </div>
              <div>
                <span className="text-text-muted">확정 여부</span>
                <p className="text-text-primary">{sub.isConfirmed ? '확정됨' : '미확정'}</p>
              </div>
              {sub.message && (
                <div className="col-span-2">
                  <span className="text-text-muted">문의 내용</span>
                  <p className="text-text-primary mt-1">{sub.message}</p>
                </div>
              )}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-text-secondary text-xs mb-1 block">상태 변경</label>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
                  className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-text-secondary text-xs mb-1 block">관리자 메모</label>
                <input value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent" />
              </div>
              <button
                disabled={saving}
                onClick={async () => { setSaving(true); await onStatusUpdate(sub._id, status, adminNote); setSaving(false) }}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-text-primary px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? '저장...' : '저장'}
              </button>
              {!sub.isConfirmed && (
                <button
                  onClick={() => onConfirm(sub._id)}
                  className="bg-accent hover:bg-accent text-text-primary px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  확정
                </button>
              )}
              <button
                onClick={() => onDelete(sub._id)}
                className="bg-red-900/40 hover:bg-red-900/60 text-accent-text px-4 py-2 rounded-lg text-sm transition-colors"
              >
                삭제
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<SolutionSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = (p = 1) => {
    setLoading(true)
    solutionService.admin.getSubscriptions({ status: filterStatus || undefined, page: p, limit: 20 })
      .then(({ subscriptions: s, totalPages: tp }) => {
        setSubscriptions(s)
        setTotalPages(tp)
        setPage(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [filterStatus])

  const handleStatusUpdate = async (id: string, status: string, adminNote: string) => {
    await solutionService.admin.updateSubscriptionStatus(id, { status, adminNote })
    load(page)
  }

  const handleConfirm = async (id: string) => {
    await solutionService.admin.confirmSubscription(id)
    load(page)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await solutionService.admin.deleteSubscription(id)
    load(page)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-text-primary font-bold text-lg">구독 신청</h2>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent ml-auto">
          <option value="">전체 상태</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-text-secondary text-xs">
              <th className="px-4 py-3 text-left">솔루션</th>
              <th className="px-4 py-3 text-left">신청자</th>
              <th className="px-4 py-3 text-left">회사명</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">신청일</th>
              <th className="px-4 py-3 text-left w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-secondary">불러오는 중...</td></tr>
            ) : subscriptions.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-text-muted">신청 내역이 없습니다.</td></tr>
            ) : (
              subscriptions.map(sub => (
                <SubscriptionRow
                  key={sub._id}
                  sub={sub}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirm}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-sm disabled:opacity-40 hover:bg-line-light transition-colors">이전</button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-sm disabled:opacity-40 hover:bg-line-light transition-colors">다음</button>
        </div>
      )}
    </div>
  )
}

export default function AdminSolutionsPage() {
  const [tab, setTab] = useState<TabType>('solutions')

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-1 mb-6 bg-bg-secondary border border-line rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab('solutions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'solutions' ? 'bg-red-600 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            솔루션 관리
          </button>
          <button
            onClick={() => setTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'subscriptions' ? 'bg-red-600 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            구독 신청
          </button>
        </div>

        {tab === 'solutions' ? <SolutionsTab /> : <SubscriptionsTab />}
      </div>
    </AdminLayout>
  )
}
