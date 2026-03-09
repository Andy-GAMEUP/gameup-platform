'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import supportService, { SupportBanner, SupportTab } from '@/services/supportService'
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
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
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
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1 text-slate-500 hover:text-slate-400 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>

        {imageUrl && (
          <Image src={imageUrl} alt={title} width={80} height={56} className="w-20 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-800" unoptimized />
        )}

        <div className="flex-1 grid grid-cols-1 gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="배너 제목"
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
          />
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="이미지 URL"
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
          />
          <input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="링크 URL (선택)"
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={() => onUpdate(banner._id, { isActive: !banner.isActive })}
            disabled={saving}
            title={banner.isActive ? '비활성화' : '활성화'}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {banner.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onUpdate(banner._id, { title, imageUrl, linkUrl })}
            disabled={saving}
            className="p-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(banner._id)}
            disabled={saving}
            className="p-1.5 text-red-400 hover:text-red-300 transition-colors disabled:opacity-30"
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
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-400 flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
          placeholder="탭 이름"
        />

        <button
          onClick={() => onUpdate(tab._id, { isActive: !tab.isActive })}
          disabled={saving}
          title={tab.isActive ? '비활성화' : '활성화'}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {tab.isActive ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onUpdate(tab._id, { name, content })}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />저장
        </button>

        <button
          onClick={() => onDelete(tab._id)}
          disabled={saving}
          className="p-1.5 text-red-400 hover:text-red-300 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800">
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
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          배너 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">배너가 없습니다</div>
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
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          탭 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : tabs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">탭이 없습니다</div>
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

type TabKey = 'offseason' | 'season' | 'recruit' | 'tabs'

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'offseason', label: '비시즌 배너' },
  { key: 'season', label: '시즌 배너' },
  { key: 'recruit', label: '모집 배너' },
  { key: 'tabs', label: '설명 탭' },
]

export default function AdminSupportBannersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('offseason')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white font-bold text-xl">지원 배너/탭 관리</h1>
          <p className="text-slate-400 text-sm mt-1">배너와 설명 탭을 관리합니다</p>
        </div>

        <div className="border-b border-slate-800">
          <div className="flex gap-0">
            {TAB_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === item.key
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-white'
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
      </div>
    </AdminLayout>
  )
}
