'use client'
import { useRef, useState } from 'react'
import { Megaphone, Star, Image as ImageIcon, Trash2, X, Loader2, Search } from 'lucide-react'
import Editor from '@/components/Editor'
import NoticeTypeBadge from '@/components/NoticeTypeBadge'
import { formatDate } from '@/lib/formatDate'

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''

export interface AnnouncementManagerItem {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
  images?: string[]
  thumbnailIndex?: number
  isPinned?: boolean
  isPublished?: boolean
  targetRole?: 'all' | 'developer' | 'player'
}

export interface AnnouncementFormValue {
  title: string
  content: string
  type: string
  priority: string
  images: string[]
  thumbnailIndex: number
  targetRole?: 'all' | 'developer' | 'player'
  expiresAt?: string
  isPinned?: boolean
  isPublished?: boolean
}

interface Option { value: string; label: string }

export interface AnnouncementManagerProps<T extends AnnouncementManagerItem> {
  items: T[]
  loading: boolean
  typeOptions: Option[]
  priorityOptions: Option[]
  onCreate: (data: AnnouncementFormValue) => Promise<void>
  onUpdate?: (id: string, data: AnnouncementFormValue) => Promise<void>
  onDelete: (item: T) => void
  uploadImages: (files: File[]) => Promise<string[]>
  showAdminFields?: boolean
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').slice(0, 200)
}

function emptyForm(showAdminFields?: boolean): AnnouncementFormValue {
  return {
    title: '', content: '', type: 'notice', priority: 'normal',
    images: [], thumbnailIndex: 0,
    ...(showAdminFields ? { targetRole: 'all', isPinned: false, isPublished: true } : {}),
  }
}

function toForm(item: AnnouncementManagerItem): AnnouncementFormValue {
  return {
    title: item.title, content: item.content, type: item.type, priority: item.priority,
    images: item.images || [], thumbnailIndex: item.thumbnailIndex || 0,
  }
}

function AnnouncementFormModal({
  title, initial, typeOptions, priorityOptions, showAdminFields, uploadImages, onSave, onClose,
}: {
  title: string
  initial: AnnouncementFormValue
  typeOptions: Option[]
  priorityOptions: Option[]
  showAdminFields?: boolean
  uploadImages: (files: File[]) => Promise<string[]>
  onSave: (data: AnnouncementFormValue) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<AnnouncementFormValue>(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof AnnouncementFormValue>(k: K, v: AnnouncementFormValue[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  const pushImage = (url: string) => set('images', [...form.images, url])

  const removeImage = (idx: number) => {
    setForm(p => {
      const images = p.images.filter((_, i) => i !== idx)
      let thumbnailIndex = p.thumbnailIndex
      if (idx === thumbnailIndex) thumbnailIndex = 0
      else if (idx < thumbnailIndex) thumbnailIndex -= 1
      return { ...p, images, thumbnailIndex }
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const urls = await uploadImages(files)
      setForm(p => ({ ...p, images: [...p.images, ...urls] }))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('제목을 입력하세요'); return }
    if (!form.content.trim()) { setError('내용을 입력하세요'); return }
    setSaving(true); setError('')
    try { await onSave(form) } catch { setError('저장에 실패했습니다'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-bg-secondary border border-line rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {showAdminFields && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">대상</label>
                <select value={form.targetRole} onChange={e => set('targetRole', e.target.value as AnnouncementFormValue['targetRole'])}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
                  <option value="all">전체</option>
                  <option value="developer">개발자</option>
                  <option value="player">플레이어</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">만료일 (선택)</label>
                <input type="date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
                  onChange={e => set('expiresAt', e.target.value || undefined)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none" />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">제목 *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} maxLength={200}
                placeholder="공지사항 제목"
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div className="w-40 flex-shrink-0">
              <label className="text-xs text-text-muted mb-1 block">공지 유형 *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">내용 *</label>
            <div className="bg-bg-card border border-line rounded-2xl overflow-hidden">
              <Editor
                content={form.content}
                onChange={html => set('content', html)}
                placeholder="공지사항 내용을 입력하세요"
                onImageUpload={async (file) => {
                  const [url] = await uploadImages([file])
                  pushImage(url)
                  return url
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">이미지 (선택)</label>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set('thumbnailIndex', i)}
                  className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all group ${
                    form.thumbnailIndex === i ? 'border-accent shadow-sm shadow-accent/30' : 'border-line hover:border-accent/50'
                  }`}
                >
                  <img src={img.startsWith('http') ? img : `${UPLOADS_URL}${img}`} alt="" className="w-full h-full object-cover" />
                  {form.thumbnailIndex === i && (
                    <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                      <Star className="w-4 h-4 text-white fill-white drop-shadow" />
                    </div>
                  )}
                  <span
                    onClick={e => { e.stopPropagation(); removeImage(i) }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </span>
                </button>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-20 h-14 rounded-lg border-2 border-dashed border-line hover:border-accent/50 flex items-center justify-center text-text-muted hover:text-accent transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
            </div>
            {form.images.length > 0 && (
              <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1"><Star className="w-3 h-3" />별 표시된 이미지가 목록 썸네일로 사용됩니다</p>
            )}
          </div>

          {showAdminFields && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.isPinned} onChange={e => set('isPinned', e.target.checked)} className="rounded" />
                <span className="text-sm text-text-secondary">상단 고정</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.isPublished} onChange={e => set('isPublished', e.target.checked)} className="rounded" />
                <span className="text-sm text-text-secondary">즉시 게시</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-line rounded-lg text-base text-text-secondary hover:bg-bg-tertiary">취소</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementManager<T extends AnnouncementManagerItem>({
  items, loading, typeOptions, priorityOptions,
  onCreate, onUpdate, onDelete,
  uploadImages, showAdminFields,
}: AnnouncementManagerProps<T>) {
  const [creating, setCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [search, setSearch] = useState('')

  const filteredItems = search.trim()
    ? items.filter(i => i.title.toLowerCase().includes(search.trim().toLowerCase()))
    : items

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="제목 검색..."
              className="bg-bg-tertiary border border-line rounded-lg pl-8 pr-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent w-[36rem]"
            />
          </div>
          <span className="text-base text-text-secondary whitespace-nowrap">총 {items.length}개</span>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white border-2 border-accent-hover rounded-xl text-xl font-semibold transition-colors">
          <Megaphone className="w-5 h-5" /> 공지 작성
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-text-secondary">불러오는 중...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          {items.length === 0 ? '등록된 공지사항이 없습니다' : '검색 결과가 없습니다'}
        </div>
      ) : filteredItems.map(item => {
        const thumb = item.images?.[item.thumbnailIndex || 0] || item.images?.[0]
        return (
        <div key={item._id} onClick={() => onUpdate && setEditingItem(item)}
          className={`p-4 bg-bg-tertiary/30 rounded-lg border border-line flex items-start gap-3 ${onUpdate ? 'cursor-pointer hover:bg-bg-tertiary/60 transition-colors' : ''}`}>
          {thumb && (
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-bg-tertiary">
              <img src={thumb.startsWith('http') ? thumb : `${UPLOADS_URL}${thumb}`} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold">{item.title}</h3>
              <NoticeTypeBadge type={item.type} />
            </div>
            <p className="text-sm text-text-secondary mb-1">{stripHtml(item.content)}</p>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(item) }}
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-line text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )})}

      {creating && (
        <AnnouncementFormModal
          title="새 공지사항 작성"
          initial={emptyForm(showAdminFields)}
          typeOptions={typeOptions}
          priorityOptions={priorityOptions}
          showAdminFields={showAdminFields}
          uploadImages={uploadImages}
          onClose={() => setCreating(false)}
          onSave={async (data) => { await onCreate(data); setCreating(false) }}
        />
      )}
      {editingItem && onUpdate && (
        <AnnouncementFormModal
          title="공지사항 수정"
          initial={toForm(editingItem)}
          typeOptions={typeOptions}
          priorityOptions={priorityOptions}
          showAdminFields={showAdminFields}
          uploadImages={uploadImages}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => { await onUpdate(editingItem._id, data); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
