'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import supportService, { SupportBanner, SupportTab } from '@/services/supportService'
import adminService from '@/services/adminService'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Trash2, Save, Loader2, GripVertical, Eye, EyeOff,
  ChevronDown, ChevronUp,
} from 'lucide-react'

const Editor = dynamic(() => import('@/components/Editor'), { ssr: false })

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-text-primary shadow-lg z-50 ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
      {msg}
    </div>
  )
}

function SortableBannerRow({
  banner,
  onUpdate,
  onDelete,
  saving,
}: {
  banner: SupportBanner
  onUpdate: (id: string, data: Partial<SupportBanner>) => void
  onDelete: (id: string) => void
  saving: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: banner._id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [title, setTitle] = useState(banner.title)
  const [imageUrl, setImageUrl] = useState(banner.imageUrl)
  const [linkUrl, setLinkUrl] = useState(banner.linkUrl)

  return (
    <div ref={setNodeRef} style={style} className="bg-bg-secondary border border-line rounded-xl p-4">
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1 text-text-muted hover:text-text-secondary flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>

        {imageUrl && (
          <Image src={imageUrl} alt={title} width={80} height={56} className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-bg-tertiary" unoptimized />
        )}

        <div className="flex-1 grid grid-cols-1 gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="배너 제목"
            className="bg-bg-tertiary border border-line rounded px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-line"
          />
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="이미지 URL"
            className="bg-bg-tertiary border border-line rounded px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-line"
          />
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="링크 URL (선택)"
            className="bg-bg-tertiary border border-line rounded px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-line"
          />
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={() => onUpdate(banner._id, { isActive: !banner.isActive })}
            disabled={saving}
            title={banner.isActive ? '비활성화' : '활성화'}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            {banner.isActive ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onUpdate(banner._id, { title, imageUrl, linkUrl })}
            disabled={saving}
            className="p-1.5 bg-blue-700 hover:bg-blue-800 text-text-primary rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(banner._id)}
            disabled={saving}
            className="p-1.5 text-accent-text hover:text-accent-text transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function SortableTabRow({
  tab,
  onUpdate,
  onDelete,
  saving,
}: {
  tab: SupportTab
  onUpdate: (id: string, data: Partial<SupportTab>) => void
  onDelete: (id: string) => void
  saving: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab._id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [name, setName] = useState(tab.name)
  const [content, setContent] = useState(tab.content)
  const [expanded, setExpanded] = useState(false)

  return (
    <div ref={setNodeRef} style={style} className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-bg-tertiary border border-line rounded px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-line"
          placeholder="탭 이름"
        />

        <button
          onClick={() => onUpdate(tab._id, { isActive: !tab.isActive })}
          disabled={saving}
          title={tab.isActive ? '비활성화' : '활성화'}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {tab.isActive ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onUpdate(tab._id, { name, content })}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-text-primary rounded text-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />저장
        </button>

        <button
          onClick={() => onDelete(tab._id)}
          disabled={saving}
          className="p-1.5 text-accent-text hover:text-accent-text transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button onClick={() => setExpanded(v => !v)} className="text-text-secondary hover:text-text-primary transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-line">
          <div className="mt-3">
            <Editor content={content} onChange={setContent} placeholder="탭 내용을 입력하세요..." />
          </div>
        </div>
      )}
    </div>
  )
}

function BannersSection({ category, label }: { category: SupportBanner['category']; label: string }) {
  const [banners, setBanners] = useState<SupportBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await supportService.admin.getBanners(category)
      setBanners(data.banners)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [category])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    setSaving(true)
    try {
      const data = await supportService.admin.createBanner(category, { title: '새 배너', imageUrl: '' })
      setBanners(prev => [...prev, data.banner])
      showToast('배너가 추가되었습니다')
    } catch { showToast('추가 실패', false) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (id: string, updates: Partial<SupportBanner>) => {
    setSaving(true)
    try {
      await supportService.admin.updateBanner(id, updates)
      setBanners(prev => prev.map(b => b._id === id ? { ...b, ...updates } : b))
      showToast('저장되었습니다')
    } catch { showToast('저장 실패', false) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await supportService.admin.deleteBanner(id)
      setBanners(prev => prev.filter(b => b._id !== id))
      showToast('삭제되었습니다')
    } catch { showToast('삭제 실패', false) }
    finally { setSaving(false) }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (saving) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = banners.findIndex(b => b._id === active.id)
    const newIdx = banners.findIndex(b => b._id === over.id)
    const next = arrayMove(banners, oldIdx, newIdx)
    const prev = banners
    setBanners(next)
    setSaving(true)
    try {
      await supportService.admin.reorderBanners(category, next.map((b, i) => ({ id: b._id, sortOrder: i })))
      showToast('순서가 변경되었습니다')
    } catch { setBanners(prev); showToast('순서 변경 실패', false) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-text-primary rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          배너 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">배너가 없습니다</div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map(b => b._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {banners.map(banner => (
                <SortableBannerRow
                  key={banner._id}
                  banner={banner}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  saving={saving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}

function TabsSection() {
  const [tabs, setTabs] = useState<SupportTab[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await supportService.admin.getTabs()
      setTabs(data.tabs)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    setSaving(true)
    try {
      const data = await supportService.admin.createTab({ name: '새 탭', content: '' })
      setTabs(prev => [...prev, data.tab])
      showToast('탭이 추가되었습니다')
    } catch { showToast('추가 실패', false) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (id: string, updates: Partial<SupportTab>) => {
    setSaving(true)
    try {
      await supportService.admin.updateTab(id, updates)
      setTabs(prev => prev.map(t => t._id === id ? { ...t, ...updates } : t))
      showToast('저장되었습니다')
    } catch { showToast('저장 실패', false) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 탭을 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await supportService.admin.deleteTab(id)
      setTabs(prev => prev.filter(t => t._id !== id))
      showToast('삭제되었습니다')
    } catch { showToast('삭제 실패', false) }
    finally { setSaving(false) }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (saving) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = tabs.findIndex(t => t._id === active.id)
    const newIdx = tabs.findIndex(t => t._id === over.id)
    const next = arrayMove(tabs, oldIdx, newIdx)
    const prev = tabs
    setTabs(next)
    setSaving(true)
    try {
      await supportService.admin.reorderTabs(next.map((t, i) => ({ id: t._id, sortOrder: i })))
      showToast('순서가 변경되었습니다')
    } catch { setTabs(prev); showToast('순서 변경 실패', false) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-text-primary rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          탭 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
      ) : tabs.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">탭이 없습니다</div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tabs.map(tab => (
                <SortableTabRow
                  key={tab._id}
                  tab={tab}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  saving={saving}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}

// ── 이벤트 배너 관리 ───────────────────────────────────────────────
interface EventBanner {
  _id: string
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

function EventBannersSection() {
  const [banners, setBanners] = useState<EventBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', linkUrl: '' })

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getEventBanners()
      setBanners(data.banners)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => { setEditId(null); setForm({ title: '', description: '', imageUrl: '', linkUrl: '' }) }

  const handleSave = async () => {
    if (!form.title || !form.imageUrl) { showToast('제목과 이미지 URL은 필수입니다', false); return }
    setSaving(true)
    try {
      if (editId) {
        const data = await adminService.updateEventBanner(editId, form)
        setBanners(prev => prev.map(b => b._id === editId ? data.banner : b))
        showToast('수정되었습니다')
      } else {
        const data = await adminService.createEventBanner(form)
        setBanners(prev => [...prev, data.banner])
        showToast('배너가 추가되었습니다')
      }
      resetForm()
    } catch { showToast('저장 실패', false) }
    finally { setSaving(false) }
  }

  const handleEdit = (b: EventBanner) => {
    setEditId(b._id)
    setForm({ title: b.title, description: b.description, imageUrl: b.imageUrl, linkUrl: b.linkUrl })
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setSaving(true)
    try {
      await adminService.updateEventBanner(id, { isActive: !isActive })
      setBanners(prev => prev.map(b => b._id === id ? { ...b, isActive: !isActive } : b))
      showToast(isActive ? '비활성화되었습니다' : '활성화되었습니다')
    } catch { showToast('변경 실패', false) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 이벤트 배너를 삭제하시겠습니까? 관련 신청 데이터도 함께 삭제됩니다.')) return
    setSaving(true)
    try {
      await adminService.deleteEventBanner(id)
      setBanners(prev => prev.filter(b => b._id !== id))
      showToast('삭제되었습니다')
    } catch { showToast('삭제 실패', false) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      {/* 생성/수정 폼 */}
      <div className="bg-bg-secondary border border-line rounded-xl p-4 space-y-3">
        <h3 className="text-text-primary text-sm font-semibold">{editId ? '이벤트 배너 수정' : '이벤트 배너 추가'}</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="배너 제목 *" className="bg-bg-tertiary border border-line rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
          <input value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
            placeholder="이미지 URL *" className="bg-bg-tertiary border border-line rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="배너 설명 (선택)" className="bg-bg-tertiary border border-line rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
          <input value={form.linkUrl} onChange={e => setForm(p => ({ ...p, linkUrl: e.target.value }))}
            placeholder="링크 URL (선택)" className="bg-bg-tertiary border border-line rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-text-primary rounded-lg text-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editId ? '수정' : '추가'}
          </button>
          {editId && (
            <button onClick={resetForm} className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm">취소</button>
          )}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">이벤트 배너가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {banners.map(banner => (
            <div key={banner._id} className="bg-bg-secondary border border-line rounded-xl p-4 flex items-center gap-4">
              {banner.imageUrl && (
                <Image src={banner.imageUrl} alt={banner.title} width={96} height={56} className="w-24 h-14 object-cover rounded-lg flex-shrink-0 bg-bg-tertiary" unoptimized />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-text-primary font-medium text-sm truncate">{banner.title}</h4>
                {banner.description && <p className="text-text-secondary text-xs truncate">{banner.description}</p>}
                <p className="text-text-muted text-xs mt-1">
                  {new Date(banner.createdAt).toLocaleDateString('ko-KR')}
                  {banner.isActive ? <span className="ml-2 text-accent">활성</span> : <span className="ml-2 text-text-muted">비활성</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggle(banner._id, banner.isActive)} disabled={saving} title={banner.isActive ? '비활성화' : '활성화'}
                  className="text-text-secondary hover:text-text-primary transition-colors">
                  {banner.isActive ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => handleEdit(banner)} className="p-1.5 bg-blue-700 hover:bg-blue-800 text-text-primary rounded text-xs"><Save className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(banner._id)} disabled={saving} className="p-1.5 text-accent-text hover:text-accent-text"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  )
}

// ── 이벤트 신청 목록 조회 ──────────────────────────────────────────
interface EventRegistration {
  _id: string
  eventBanner: { _id: string; title: string } | null
  userId: { _id: string; username: string; email: string } | null
  name: string
  email: string
  phone: string
  createdAt: string
}

function EventRegistrationsSection() {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [banners, setBanners] = useState<EventBanner[]>([])
  const [selectedBanner, setSelectedBanner] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 20 }
      if (selectedBanner) params.eventBannerId = selectedBanner
      const data = await adminService.getEventRegistrations(params)
      setRegistrations(data.registrations)
      setTotalPages(data.pagination?.pages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {}
    finally { setLoading(false) }
  }, [page, selectedBanner])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    adminService.getEventBanners().then(d => setBanners(d.banners)).catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={selectedBanner}
          onChange={e => { setSelectedBanner(e.target.value); setPage(1) }}
          className="bg-bg-tertiary border border-line rounded px-3 py-2 text-text-primary text-sm focus:outline-none"
        >
          <option value="">전체 이벤트</option>
          {banners.map(b => <option key={b._id} value={b._id}>{b.title}</option>)}
        </select>
        <span className="text-text-secondary text-sm">총 {total}건</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">신청 내역이 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-text-secondary">
                <th className="text-left py-3 px-3">이름</th>
                <th className="text-left py-3 px-3">이메일</th>
                <th className="text-left py-3 px-3">전화번호</th>
                <th className="text-left py-3 px-3">이벤트</th>
                <th className="text-left py-3 px-3">사용자</th>
                <th className="text-left py-3 px-3">신청일</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(r => (
                <tr key={r._id} className="border-b border-line/50 text-text-primary">
                  <td className="py-2.5 px-3">{r.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{r.email}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{r.phone}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{r.eventBanner?.title || '-'}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{r.userId?.username || '-'}</td>
                  <td className="py-2.5 px-3 text-text-muted">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded text-sm ${page === i + 1 ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type TabKey = 'offseason' | 'season' | 'recruit' | 'tabs' | 'event' | 'registrations'

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'offseason', label: '비시즌 배너' },
  { key: 'season', label: '시즌 배너' },
  { key: 'recruit', label: '모집 배너' },
  { key: 'tabs', label: '설명 탭' },
  { key: 'event', label: '이벤트 배너' },
  { key: 'registrations', label: '이벤트 신청' },
]

export default function AdminSupportBannersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('offseason')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-text-primary font-bold text-xl">배너관리</h1>
          <p className="text-text-secondary text-sm mt-1">지원 배너, 이벤트 배너 및 설명 탭을 관리합니다</p>
        </div>

        <div className="border-b border-line">
          <div className="flex gap-0 overflow-x-auto">
            {TAB_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === item.key
                    ? 'border-red-500 text-accent-text'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'offseason' && <BannersSection category="offseason" label="비시즌 배너" />}
        {activeTab === 'season' && <BannersSection category="season" label="시즌 배너" />}
        {activeTab === 'recruit' && <BannersSection category="recruit" label="모집 배너" />}
        {activeTab === 'tabs' && <TabsSection />}
        {activeTab === 'event' && <EventBannersSection />}
        {activeTab === 'registrations' && <EventRegistrationsSection />}
      </div>
    </AdminLayout>
  )
}
