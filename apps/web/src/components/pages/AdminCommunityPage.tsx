'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService, { CommunityBanner, ReportedPost, ReportedComment } from '@/services/adminService'
import communityService from '@/services/communityService'
import {
  Search, ShieldOff, ShieldCheck, Trash2, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, CheckCircle, MessageSquare, PenSquare, X,
  ImagePlus, Link2, Hash, Image as ImageIcon, Megaphone, Upload,
  Plus, Eye, EyeOff, Pin, Bell, BellOff, Edit2, LayoutDashboard, Flag, ExternalLink, ThumbsUp, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'

// ────────── 타입 ──────────

interface Announcement {
  _id: string
  title: string
  content: string
  type: 'notice' | 'event' | 'maintenance' | 'update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isPinned: boolean
  isPublished: boolean
  targetRole: 'all' | 'developer' | 'player'
  publishedAt?: string
  expiresAt?: string
  createdAt: string
}

const FEEDBACK_LABELS: Record<string, { label: string; cls: string }> = {
  general:    { label: '일반',  cls: 'bg-bg-muted/40 text-text-secondary' },
  bug:        { label: '버그',  cls: 'bg-accent-light text-accent-text border border-accent-muted' },
  suggestion: { label: '건의',  cls: 'bg-blue-600/20 text-blue-300 border border-blue-500/30' },
  praise:     { label: '칭찬',  cls: 'bg-accent-light text-accent border border-green-500/30' },
}

const CHANNELS = [
  { value: 'notice', label: '공지사항' },
  { value: 'new-game-intro', label: '신작게임소개' },
  { value: 'beta-game', label: '베타게임' },
  { value: 'live-game', label: '라이브게임' },
  { value: 'free', label: '자유게시판' },
]

const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL ?? ''

// ────────── 공통 컴포넌트 ──────────

export function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${ok ? 'bg-accent' : 'bg-red-600'} text-white`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

function ConfirmModal({ msg, onConfirm, onCancel, danger = true }: {
  msg: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-5 shadow-2xl">
        <p className="text-text-primary text-sm mb-4">{msg}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
          <button onClick={onConfirm} className={`px-3 py-1.5 text-sm text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>확인</button>
        </div>
      </div>
    </div>
  )
}

// ────────── 탭 1: 배너 관리 ──────────

function BannerSection({
  title,
  subtitle,
  banners,
  loading,
  uploading,
  addForm,
  formFile,
  formTitle,
  formLinkUrl,
  addFileRef,
  onToggleAddForm,
  onFileChange,
  onTitleChange,
  onLinkChange,
  onAdd,
  onCancelAdd,
  onToggleActive,
  onDelete,
}: {
  title: string
  subtitle: string
  banners: CommunityBanner[]
  loading: boolean
  uploading: boolean
  addForm: boolean
  formFile: File | null
  formTitle: string
  formLinkUrl: string
  addFileRef: React.RefObject<HTMLInputElement | null>
  onToggleAddForm: () => void
  onFileChange: (f: File | null) => void
  onTitleChange: (v: string) => void
  onLinkChange: (v: string) => void
  onAdd: () => void
  onCancelAdd: () => void
  onToggleActive: (b: CommunityBanner) => void
  onDelete: (id: string) => void
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  return (
    <div className="bg-bg-secondary border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-text-primary font-semibold">{title}</h3>
          <p className="text-text-muted text-xs mt-0.5">{subtitle}</p>
        </div>
        {banners.length < 5 && (
          <button onClick={onToggleAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> 배너 추가
          </button>
        )}
      </div>

      {addForm && (
        <div className="mb-4 p-4 bg-bg-tertiary border border-line rounded-xl space-y-3">
          <input type="file" ref={addFileRef} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
            onChange={e => onFileChange(e.target.files?.[0] || null)} />
          <div>
            <label className="text-xs text-text-muted mb-1 block">이미지 *</label>
            <button onClick={() => addFileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-line rounded-lg text-sm text-text-muted hover:text-text-secondary transition-colors">
              <ImageIcon className="w-4 h-4" />
              {formFile ? formFile.name : '이미지 선택 (JPG, PNG, GIF, WebP)'}
            </button>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">제목 (선택)</label>
            <input value={formTitle} onChange={e => onTitleChange(e.target.value)} placeholder="배너 제목"
              className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">링크 URL (선택)</label>
            <input value={formLinkUrl} onChange={e => onLinkChange(e.target.value)} placeholder="https://..."
              className="w-full bg-bg-secondary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onCancelAdd}
              className="px-3 py-1.5 border border-line rounded-lg text-sm text-text-secondary hover:bg-bg-secondary">취소</button>
            <button onClick={onAdd} disabled={uploading || !formFile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 등록
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">등록된 배너가 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-text-muted text-xs">
                <th className="text-left py-2 px-3 font-medium w-12">순서</th>
                <th className="text-left py-2 px-3 font-medium w-24">미리보기</th>
                <th className="text-left py-2 px-3 font-medium">제목</th>
                <th className="text-left py-2 px-3 font-medium">링크</th>
                <th className="text-left py-2 px-3 font-medium w-28">등록일</th>
                <th className="text-left py-2 px-3 font-medium w-16">상태</th>
                <th className="py-2 px-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {banners.map((b, i) => (
                <tr key={b._id} className="border-b border-line last:border-0 hover:bg-bg-tertiary transition-colors">
                  <td className="py-3 px-3 text-text-muted">{i + 1}</td>
                  <td className="py-3 px-3">
                    <div className="w-20 h-12 rounded-lg overflow-hidden border border-line bg-bg-tertiary">
                      <img src={`${UPLOADS_URL}${b.imageUrl}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-text-primary">{b.title || <span className="text-text-muted">-</span>}</td>
                  <td className="py-3 px-3">
                    {b.linkUrl
                      ? <span className="text-accent text-xs truncate max-w-[160px] block">{b.linkUrl}</span>
                      : <span className="text-text-muted">-</span>}
                  </td>
                  <td className="py-3 px-3 text-text-muted text-xs">{fmt(b.createdAt)}</td>
                  <td className="py-3 px-3">
                    <button onClick={() => onToggleActive(b)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${b.isActive ? 'bg-green-500/10 text-green-400' : 'bg-bg-tertiary text-text-muted'}`}>
                      {b.isActive ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => onDelete(b._id)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BannerTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  // 커뮤니티 배너 상태
  const [banners, setBanners] = useState<CommunityBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState<{ id: string } | null>(null)
  const [addForm, setAddForm] = useState(false)
  const [formLinkUrl, setFormLinkUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const addFileRef = useRef<HTMLInputElement>(null)

  // 메인 배너 상태
  const [mainBanners, setMainBanners] = useState<CommunityBanner[]>([])
  const [mainLoading, setMainLoading] = useState(true)
  const [mainUploading, setMainUploading] = useState(false)
  const [mainConfirm, setMainConfirm] = useState<{ id: string } | null>(null)
  const [mainAddForm, setMainAddForm] = useState(false)
  const [mainFormLinkUrl, setMainFormLinkUrl] = useState('')
  const [mainFormTitle, setMainFormTitle] = useState('')
  const [mainFormFile, setMainFormFile] = useState<File | null>(null)
  const mainAddFileRef = useRef<HTMLInputElement>(null)

  const [eventBanners, setEventBanners] = useState<CommunityBanner[]>([])
  const [eventLoading, setEventLoading] = useState(true)
  const [eventUploading, setEventUploading] = useState(false)
  const [eventConfirm, setEventConfirm] = useState<{ id: string } | null>(null)
  const [eventAddForm, setEventAddForm] = useState(false)
  const [eventFormLinkUrl, setEventFormLinkUrl] = useState('')
  const [eventFormTitle, setEventFormTitle] = useState('')
  const [eventFormFile, setEventFormFile] = useState<File | null>(null)
  const eventAddFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllCommunityBanners()
      setBanners(data.banners)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  const loadMain = useCallback(async () => {
    setMainLoading(true)
    try {
      const data = await adminService.getAllMainBanners()
      setMainBanners(data.banners)
    } catch { /* silent */ }
    finally { setMainLoading(false) }
  }, [])

  const loadEvent = useCallback(async () => {
    setEventLoading(true)
    try {
      const data = await adminService.getAllEventBanners()
      setEventBanners(data.banners)
    } catch { /* silent */ }
    finally { setEventLoading(false) }
  }, [])

  useEffect(() => { load(); loadMain(); loadEvent() }, [load, loadMain, loadEvent])

  const handleAdd = async () => {
    if (!formFile) { showToast('이미지를 선택해주세요', false); return }
    setUploading(true)
    try {
      await adminService.uploadCommunityBanner(formFile, { linkUrl: formLinkUrl, title: formTitle })
      showToast('배너가 등록되었습니다')
      setAddForm(false); setFormFile(null); setFormLinkUrl(''); setFormTitle('')
      load()
    } catch (e: any) {
      showToast(e?.response?.data?.message || '업로드 실패', false)
    } finally { setUploading(false) }
  }

  const handleToggleActive = async (b: CommunityBanner) => {
    try {
      await adminService.updateCommunityBanner(b._id, { isActive: !b.isActive })
      load()
    } catch { showToast('변경 실패', false) }
  }

  const handleDelete = async () => {
    if (!confirm) return
    try {
      await adminService.deleteCommunityBanner(confirm.id)
      showToast('삭제되었습니다')
      setConfirm(null); load()
    } catch { showToast('삭제 실패', false) }
  }

  const handleMainAdd = async () => {
    if (!mainFormFile) { showToast('이미지를 선택해주세요', false); return }
    setMainUploading(true)
    try {
      await adminService.uploadMainBanner(mainFormFile, { linkUrl: mainFormLinkUrl, title: mainFormTitle })
      showToast('배너가 등록되었습니다')
      setMainAddForm(false); setMainFormFile(null); setMainFormLinkUrl(''); setMainFormTitle('')
      loadMain()
    } catch (e: any) {
      showToast(e?.response?.data?.message || '업로드 실패', false)
    } finally { setMainUploading(false) }
  }

  const handleMainToggleActive = async (b: CommunityBanner) => {
    try {
      await adminService.updateCommunityBanner(b._id, { isActive: !b.isActive })
      loadMain()
    } catch { showToast('변경 실패', false) }
  }

  const handleMainDelete = async () => {
    if (!mainConfirm) return
    try {
      await adminService.deleteCommunityBanner(mainConfirm.id)
      showToast('삭제되었습니다')
      setMainConfirm(null); loadMain()
    } catch { showToast('삭제 실패', false) }
  }

  const handleEventAdd = async () => {
    if (!eventFormFile) { showToast('이미지를 선택해주세요', false); return }
    setEventUploading(true)
    try {
      await adminService.uploadEventBanner(eventFormFile, { linkUrl: eventFormLinkUrl, title: eventFormTitle })
      showToast('배너가 등록되었습니다')
      setEventAddForm(false); setEventFormFile(null); setEventFormLinkUrl(''); setEventFormTitle('')
      loadEvent()
    } catch (e: any) {
      showToast(e?.response?.data?.message || '업로드 실패', false)
    } finally { setEventUploading(false) }
  }

  const handleEventToggleActive = async (b: CommunityBanner) => {
    try {
      await adminService.updateCommunityBanner(b._id, { isActive: !b.isActive })
      loadEvent()
    } catch { showToast('변경 실패', false) }
  }

  const handleEventDelete = async () => {
    if (!eventConfirm) return
    try {
      await adminService.deleteCommunityBanner(eventConfirm.id)
      showToast('삭제되었습니다')
      setEventConfirm(null); loadEvent()
    } catch { showToast('삭제 실패', false) }
  }

  return (
    <div className="space-y-5">
      {confirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleDelete} onCancel={() => setConfirm(null)} />}
      {mainConfirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleMainDelete} onCancel={() => setMainConfirm(null)} />}
      {eventConfirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleEventDelete} onCancel={() => setEventConfirm(null)} />}

      {/* 메인 탭 배너 */}
      <BannerSection
        title="메인 탭 배너"
        subtitle="메인 페이지 상단에 표시됩니다 · 최대 5개 · 자동 롤링"
        banners={mainBanners}
        loading={mainLoading}
        uploading={mainUploading}
        addForm={mainAddForm}
        formFile={mainFormFile}
        formTitle={mainFormTitle}
        formLinkUrl={mainFormLinkUrl}
        addFileRef={mainAddFileRef}
        onToggleAddForm={() => setMainAddForm(v => !v)}
        onFileChange={setMainFormFile}
        onTitleChange={setMainFormTitle}
        onLinkChange={setMainFormLinkUrl}
        onAdd={handleMainAdd}
        onCancelAdd={() => { setMainAddForm(false); setMainFormFile(null); setMainFormLinkUrl(''); setMainFormTitle('') }}
        onToggleActive={handleMainToggleActive}
        onDelete={id => setMainConfirm({ id })}
      />

      {/* 커뮤니티 홈 배너 */}
      <BannerSection
        title="커뮤니티 홈 배너"
        subtitle="커뮤니티 홈 상단에 표시됩니다 · 최대 5개 · 자동 롤링"
        banners={banners}
        loading={loading}
        uploading={uploading}
        addForm={addForm}
        formFile={formFile}
        formTitle={formTitle}
        formLinkUrl={formLinkUrl}
        addFileRef={addFileRef}
        onToggleAddForm={() => setAddForm(v => !v)}
        onFileChange={setFormFile}
        onTitleChange={setFormTitle}
        onLinkChange={setFormLinkUrl}
        onAdd={handleAdd}
        onCancelAdd={() => { setAddForm(false); setFormFile(null); setFormLinkUrl(''); setFormTitle('') }}
        onToggleActive={handleToggleActive}
        onDelete={id => setConfirm({ id })}
      />

      {/* 이벤트 박스 배너 */}
      <BannerSection
        title="이벤트 박스 배너"
        subtitle="메인 페이지 이벤트 박스에 표시됩니다 · 최대 5개 · 자동 롤링"
        banners={eventBanners}
        loading={eventLoading}
        uploading={eventUploading}
        addForm={eventAddForm}
        formFile={eventFormFile}
        formTitle={eventFormTitle}
        formLinkUrl={eventFormLinkUrl}
        addFileRef={eventAddFileRef}
        onToggleAddForm={() => setEventAddForm(v => !v)}
        onFileChange={setEventFormFile}
        onTitleChange={setEventFormTitle}
        onLinkChange={setEventFormLinkUrl}
        onAdd={handleEventAdd}
        onCancelAdd={() => { setEventAddForm(false); setEventFormFile(null); setEventFormLinkUrl(''); setEventFormTitle('') }}
        onToggleActive={handleEventToggleActive}
        onDelete={id => setEventConfirm({ id })}
      />
    </div>
  )
}

// ────────── 탭 2: 공지사항 관리 ──────────

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  notice:      { label: '공지',  cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' },
  event:       { label: '이벤트', cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' },
  maintenance: { label: '점검',  cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/30' },
  update:      { label: '업데이트', cls: 'bg-green-500/10 text-green-400 border border-green-500/30' },
}

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  urgent: { label: '긴급', cls: 'bg-red-500/10 text-red-400 border border-red-500/30' },
  high:   { label: '높음', cls: 'bg-orange-500/10 text-orange-400 border border-orange-500/30' },
  normal: { label: '보통', cls: 'bg-bg-tertiary text-text-muted border border-line' },
  low:    { label: '낮음', cls: 'bg-bg-tertiary text-text-muted border border-line' },
}

function AnnouncementForm({
  initial, onSave, onCancel
}: {
  initial?: Partial<Announcement>
  onSave: (data: Partial<Announcement>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Announcement>>({
    title: '', content: '', type: 'notice', priority: 'normal',
    targetRole: 'all', isPinned: false, isPublished: true,
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof Announcement, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.title?.trim()) { setError('제목을 입력하세요'); return }
    if (!form.content?.trim()) { setError('내용을 입력하세요'); return }
    setSaving(true); setError('')
    try { await onSave(form) } catch { setError('저장에 실패했습니다') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-xl p-5 space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-text-muted mb-1 block">유형</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
            <option value="notice">공지</option>
            <option value="event">이벤트</option>
            <option value="maintenance">점검</option>
            <option value="update">업데이트</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">우선순위</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="normal">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">대상</label>
          <select value={form.targetRole} onChange={e => set('targetRole', e.target.value)}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none">
            <option value="all">전체</option>
            <option value="developer">개발자</option>
            <option value="player">플레이어</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted mb-1 block">만료일 (선택)</label>
          <input type="date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''}
            onChange={e => set('expiresAt', e.target.value || undefined)}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-xs text-text-muted mb-1 block">제목 *</label>
        <input value={form.title || ''} onChange={e => set('title', e.target.value)} maxLength={200}
          placeholder="공지 제목"
          className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
      </div>

      <div>
        <label className="text-xs text-text-muted mb-1 block">내용 *</label>
        <textarea value={form.content || ''} onChange={e => set('content', e.target.value)} rows={5}
          placeholder="공지 내용을 입력하세요..."
          className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" />
      </div>

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

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 border border-line rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary">취소</button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          저장
        </button>
      </div>
    </div>
  )
}

function AnnouncementsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null)
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAnnouncements({ limit: 50, type: typeFilter || undefined })
      setItems(data.announcements || [])
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [typeFilter, showToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async (form: Partial<Announcement>) => {
    await adminService.createAnnouncement(form)
    showToast('공지가 등록되었습니다')
    setCreating(false)
    load()
  }

  const handleUpdate = async (form: Partial<Announcement>) => {
    if (!editing) return
    await adminService.updateAnnouncement(editing._id, form)
    showToast('수정되었습니다')
    setEditing(null)
    load()
  }

  const handleTogglePublish = async (item: Announcement) => {
    await adminService.updateAnnouncement(item._id, { isPublished: !item.isPublished })
    showToast(item.isPublished ? '비게시로 변경됨' : '게시됨')
    load()
  }

  const handleTogglePin = async (item: Announcement) => {
    await adminService.updateAnnouncement(item._id, { isPinned: !item.isPinned })
    load()
  }

  const handleDelete = (item: Announcement) => {
    setConfirm({
      msg: `"${item.title}" 공지를 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirm(null)
        await adminService.deleteAnnouncement(item._id)
        showToast('삭제되었습니다')
        load()
      },
    })
  }

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'notice', 'event', 'maintenance', 'update'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'
              }`}>
              {t === '' ? '전체' : TYPE_LABELS[t]?.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setCreating(true); setEditing(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> 공지 작성
        </button>
      </div>

      {creating && <AnnouncementForm onSave={handleCreate} onCancel={() => setCreating(false)} />}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">등록된 공지사항이 없습니다</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item._id}>
              {editing?._id === item._id ? (
                <AnnouncementForm initial={item} onSave={handleUpdate} onCancel={() => setEditing(null)} />
              ) : (
                <div className={`bg-bg-secondary border rounded-xl p-4 ${item.isPinned ? 'border-accent/40' : 'border-line'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        {item.isPinned && <Pin className="w-3.5 h-3.5 text-accent" />}
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_LABELS[item.type]?.cls}`}>{TYPE_LABELS[item.type]?.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_LABELS[item.priority]?.cls}`}>{PRIORITY_LABELS[item.priority]?.label}</span>
                        <span className="text-xs text-text-muted">{item.targetRole === 'all' ? '전체' : item.targetRole === 'developer' ? '개발자' : '플레이어'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${item.isPublished ? 'bg-green-500/10 text-green-400' : 'bg-bg-tertiary text-text-muted'}`}>
                          {item.isPublished ? '게시중' : '미게시'}
                        </span>
                      </div>
                      <p className="text-text-primary font-medium text-sm">{item.title}</p>
                      <p className="text-text-muted text-xs mt-0.5 line-clamp-1">{item.content}</p>
                      <p className="text-text-muted text-xs mt-1">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleTogglePin(item)} title={item.isPinned ? '고정 해제' : '상단 고정'}
                        className={`p-1.5 rounded-lg transition-colors ${item.isPinned ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleTogglePublish(item)} title={item.isPublished ? '비게시' : '게시'}
                        className={`p-1.5 rounded-lg transition-colors ${item.isPublished ? 'text-green-400 bg-green-500/10' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}>
                        {item.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => { setEditing(item); setCreating(false) }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────── 탭 3: 게시글 모니터링 ──────────

function WritePostModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState('notice')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [links, setLinks] = useState<{ url: string; label: string }[]>([])
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 5) { setError('이미지는 최대 5개까지 가능합니다'); return }
    setUploading(true)
    try {
      const data = await communityService.uploadImages(Array.from(files))
      setImages(prev => [...prev, ...(data.images || [])])
    } catch { setError('이미지 업로드 실패') }
    finally { setUploading(false) }
  }

  const handleAddTag = () => {
    const tag = tagInput.replace(/^#/, '').trim()
    if (!tag || tags.length >= 10) return
    if (!tags.includes(tag)) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  const handleAddLink = () => {
    if (!linkUrl.trim() || links.length >= 10) return
    setLinks(prev => [...prev, { url: linkUrl.trim(), label: linkLabel.trim() || linkUrl.trim() }])
    setLinkUrl(''); setLinkLabel(''); setShowLinkInput(false)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true); setError('')
    try {
      await communityService.createPost({ title: title.trim(), content: content.trim(), channel, images, videoUrl: videoUrl.trim() || undefined, links: links.length > 0 ? links : undefined, tags: tags.length > 0 ? tags : undefined })
      onSuccess()
    } catch { setError('게시글 작성에 실패했습니다') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-bg-primary border border-line rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-line flex items-center justify-between flex-shrink-0">
          <h2 className="text-text-primary font-bold text-lg flex items-center gap-2"><PenSquare className="w-5 h-5 text-accent" /> 관리자 콘텐츠 작성</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">게시판</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button key={ch.value} onClick={() => setChannel(ch.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${channel === ch.value ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">제목 *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="게시글 제목"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">내용 *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} placeholder="내용을 입력하세요..."
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">이미지 (최대 5개)</label>
            <input type="file" ref={fileRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-line group">
                  <img src={img.startsWith('http') ? img : `${UPLOADS_URL}${img}`} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
              {images.length < 5 && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5" /><span className="text-xs mt-1">추가</span></>}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">영상 URL (선택)</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..."
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-text-secondary text-sm font-medium">링크 (최대 10개)</label>
              {links.length < 10 && <button onClick={() => setShowLinkInput(true)} className="text-accent text-xs hover:underline flex items-center gap-1"><Link2 className="w-3 h-3" /> 추가</button>}
            </div>
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm mb-1">
                <Link2 className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-accent truncate flex-1">{l.label}</span>
                <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5 text-text-muted" /></button>
              </div>
            ))}
            {showLinkInput && (
              <div className="flex gap-2">
                <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="URL" className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
                <input type="text" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="라벨" className="w-28 bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
                <button onClick={handleAddLink} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm">추가</button>
                <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkLabel('') }}><X className="w-4 h-4 text-text-muted" /></button>
              </div>
            )}
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">태그 (최대 10개)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  placeholder="태그 입력 후 Enter"
                  className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary focus:outline-none" />
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                    #{tag}<button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-5 border-t border-line flex items-center justify-between flex-shrink-0">
          <p className="text-text-muted text-xs">관리자 계정으로 게시됩니다</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-line rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary">취소</button>
            <button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenSquare className="w-4 h-4" />} 게시하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────── 탭 3: 신고글 관리 ──────────

type SortField = 'reportCount' | 'title' | 'author' | 'createdAt' | 'views' | 'likes' | 'commentCount'
type SortDir = 'asc' | 'desc'

export function ReportedPostsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [reported, setReported] = useState<ReportedPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('reportCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<any>(null)

  const LIMIT = 10
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> : <ArrowDown className="w-3 h-3 text-accent" />
  }

  const sorted = [...reported].filter(p => !statusFilter || p.status === statusFilter).sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortField === 'reportCount') { av = a.reportCount; bv = b.reportCount }
    else if (sortField === 'title') { av = a.title; bv = b.title }
    else if (sortField === 'author') { av = a.author?.username ?? ''; bv = b.author?.username ?? '' }
    else if (sortField === 'createdAt') { av = a.createdAt; bv = b.createdAt }
    else if (sortField === 'views') { av = a.views ?? 0; bv = b.views ?? 0 }
    else if (sortField === 'likes') { av = a.likes?.length ?? 0; bv = b.likes?.length ?? 0 }
    else if (sortField === 'commentCount') { av = a.commentCount ?? 0; bv = b.commentCount ?? 0 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getReportedPosts({ page, limit: LIMIT, search: search || undefined })
      setReported(data.posts || [])
      setTotal(data.total || 0)
    } catch { showToast('신고 목록 불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, showToast])

  useEffect(() => { load() }, [load])

  const handleAction = (post: ReportedPost, action: 'hide' | 'delete' | 'restore') => {
    const labels = { hide: '숨김', delete: '삭제', restore: '복구' }
    const statuses = { hide: 'hidden', delete: 'deleted', restore: 'active' }
    setConfirm({
      msg: `"${post.title}" 게시글을 ${labels[action]}하시겠습니까?`,
      danger: action !== 'restore',
      onConfirm: async () => {
        setConfirm(null); setActionId(post._id)
        try {
          await adminService.updatePostStatus(post._id, { status: statuses[action], clearReports: action === 'restore', deletedByReport: action === 'delete' })
          showToast(`${labels[action]} 처리되었습니다`)
          load()
        } catch { showToast('처리 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    active: { label: '배포 중', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
    hidden: { label: '숨김', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    deleted: { label: '삭제', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  }

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="제목·내용 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
          <option value="">전체 상태</option>
          <option value="active">정상</option>
          <option value="hidden">숨김</option>
        </select>
        <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{total}</span>건</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : reported.length === 0 ? (
        <div className="text-center py-16 text-text-muted">신고된 게시글이 없습니다</div>
      ) : (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide">
                <th className="w-1 px-0" />
                <th className="px-4 py-3 text-left whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    제목 <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">탭</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  <button onClick={() => handleSort('author')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    작성자 <SortIcon field="author" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    날짜 <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => handleSort('reportCount')} className="flex items-center gap-1 mx-auto hover:text-text-primary transition-colors">
                    <Flag className="w-3.5 h-3.5" /> <SortIcon field="reportCount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => handleSort('views')} className="flex items-center gap-1 mx-auto hover:text-text-primary transition-colors">
                    <Eye className="w-3.5 h-3.5" /> <SortIcon field="views" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => handleSort('likes')} className="flex items-center gap-1 mx-auto hover:text-text-primary transition-colors">
                    <ThumbsUp className="w-3.5 h-3.5" /> <SortIcon field="likes" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => handleSort('commentCount')} className="flex items-center gap-1 mx-auto hover:text-text-primary transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" /> <SortIcon field="commentCount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">게시물보기</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">숨김</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">삭제</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(post => {
                const st = STATUS_LABEL[post.status] || STATUS_LABEL.active
                const ch = CHANNELS.find(c => c.value === post.channel)
                return (
                  <tr key={post._id} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors ${actionId === post._id ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* 위험도 바 */}
                    <td className={`w-1 p-0 ${post.reportCount >= 5 ? 'bg-red-500' : post.reportCount >= 3 ? 'bg-orange-400' : ''}`} />

                    {/* 상태 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${st.cls}`}>{st.label}</span>
                    </td>

                    {/* 제목 */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-text-primary font-semibold text-sm truncate">{post.title}</p>
                    </td>

                    {/* 등록 탭 위치 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-secondary bg-bg-tertiary border border-line px-2 py-0.5 rounded-md">
                        {ch ? ch.label : post.channel}
                      </span>
                    </td>

                    {/* 작성자 */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{post.author?.username ?? '—'}</td>

                    {/* 날짜 */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</td>

                    {/* 신고 수 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center">
                        <Flag className="w-3.5 h-3.5" />{post.reportCount}
                      </span>
                    </td>

                    {/* 통계 */}
                    <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.views ?? 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.likes?.length ?? 0}</td>
                    <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.commentCount ?? 0}</td>

                    {/* 게시물보기 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Link href={`/community/${post._id}`} target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                        <ExternalLink className="w-3 h-3" /> 게시물보기
                      </Link>
                    </td>

                    {/* 숨김/복구 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {post.status === 'hidden' ? (
                        <button onClick={() => handleAction(post, 'restore')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> 복구
                        </button>
                      ) : (
                        <button onClick={() => handleAction(post, 'hide')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40 transition-colors">
                          <EyeOff className="w-3 h-3" /> 숨김
                        </button>
                      )}
                    </td>

                    {/* 삭제 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => handleAction(post, 'delete')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-red-700/20 text-red-400 border-red-600/40 hover:bg-red-700/40 transition-colors">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronLeft className="w-4 h-4 text-text-primary" />
          </button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}

// ────────── 탭 4: 게임 리뷰 관리 ──────────

function ReviewsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBlocked, setFilterBlocked] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const [showWriteModal, setShowWriteModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllReviews({ page, search, isBlocked: filterBlocked || undefined })
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, filterBlocked, showToast])

  useEffect(() => { load() }, [load])

  const handleBlock = (r: any) => {
    const blocking = !r.isBlocked
    setConfirm({
      msg: blocking ? `"${r.title}" 리뷰를 차단하시겠습니까?` : `"${r.title}" 차단을 해제하시겠습니까?`,
      danger: blocking,
      onConfirm: async () => {
        setConfirm(null); setActionId(r._id)
        try { await adminService.blockReview(r._id, { isBlocked: blocking }); showToast(blocking ? '차단되었습니다' : '차단 해제됨'); load() }
        catch { showToast('처리 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  const handleDelete = (r: any) => {
    setConfirm({
      msg: `"${r.title}" 리뷰를 삭제하시겠습니까?`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null); setActionId(r._id)
        try { await adminService.deleteReview(r._id); showToast('삭제되었습니다'); load() }
        catch { showToast('삭제 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {showWriteModal && <WritePostModal onClose={() => setShowWriteModal(false)} onSuccess={() => { setShowWriteModal(false); showToast('게시글이 작성되었습니다') }} />}

      <div className="flex items-center justify-between">
        <span className="text-text-muted text-sm">총 <span className="text-text-primary font-semibold">{total}</span>개</span>
        <button onClick={() => setShowWriteModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium">
          <PenSquare className="w-4 h-4" /> 콘텐츠 작성
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="리뷰 제목·내용 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <select value={filterBlocked} onChange={e => { setFilterBlocked(e.target.value); setPage(1) }}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
          <option value="">전체</option>
          <option value="false">정상</option>
          <option value="true">차단됨</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-text-muted">리뷰가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const fb = FEEDBACK_LABELS[r.feedbackType] || FEEDBACK_LABELS.general
            return (
              <div key={r._id} className={`bg-bg-secondary border rounded-xl p-4 ${r.isBlocked ? 'border-red-800/50 bg-red-950/10' : 'border-line'} ${actionId === r._id ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-bg-tertiary rounded-full flex items-center justify-center text-sm font-bold text-text-primary flex-shrink-0">
                    {(r.userId?.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-text-secondary text-sm font-medium">{r.userId?.username}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${fb.cls}`}>{fb.label}</span>
                      {r.isBlocked && <span className="bg-red-500/10 text-red-400 text-xs px-1.5 rounded border border-red-500/30">차단됨</span>}
                      {r.gameId && <Link href={`/admin/metrics/${r.gameId._id}`} className="text-text-muted hover:text-cyan-300 text-xs">🎮 {r.gameId.title}</Link>}
                    </div>
                    <p className={`text-sm font-semibold mb-0.5 ${r.isBlocked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{r.title}</p>
                    <p className={`text-xs line-clamp-2 ${r.isBlocked ? 'text-text-muted' : 'text-text-secondary'}`}>{r.content}</p>
                    <p className="text-text-muted text-xs mt-1">{new Date(r.createdAt).toLocaleDateString('ko-KR')} · 도움됨 {r.helpfulCount || 0}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleBlock(r)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${r.isBlocked ? 'bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40' : 'bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40'}`}>
                      {r.isBlocked ? <><ShieldCheck className="w-3 h-3" /> 해제</> : <><ShieldOff className="w-3 h-3" /> 차단</>}
                    </button>
                    <button onClick={() => handleDelete(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border bg-red-700/20 text-red-400 border-red-600/40 hover:bg-red-700/40 transition-colors">
                      <Trash2 className="w-3 h-3" /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronLeft className="w-4 h-4 text-text-primary" />
          </button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}

// ────────── 신고센터: 댓글 탭 ──────────

export function ReportedCommentsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [comments, setComments] = useState<ReportedComment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('reportCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<any>(null)

  const LIMIT = 10
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> : <ArrowDown className="w-3 h-3 text-accent" />
  }

  const sorted = [...comments].filter(c => !statusFilter || c.status === statusFilter).sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortField === 'reportCount') { av = a.reportCount; bv = b.reportCount }
    else if (sortField === 'author') { av = a.author?.username ?? ''; bv = b.author?.username ?? '' }
    else if (sortField === 'createdAt') { av = a.createdAt; bv = b.createdAt }
    else if (sortField === 'likes') { av = a.likes?.length ?? 0; bv = b.likes?.length ?? 0 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getReportedComments({ page, limit: LIMIT, search: search || undefined })
      setComments(data.comments || [])
      setTotal(data.total || 0)
    } catch { showToast('신고 댓글 목록 불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, showToast])

  useEffect(() => { load() }, [load])

  const handleAction = (comment: ReportedComment, action: 'hide' | 'delete' | 'restore') => {
    const labels = { hide: '숨김', delete: '댓글 삭제', restore: '복구' }
    setConfirm({
      msg: action === 'hide'
        ? '이 댓글을 숨김 처리하시겠습니까?'
        : action === 'delete'
        ? '이 댓글을 삭제하시겠습니까?'
        : '이 댓글을 복구하시겠습니까?',
      danger: action !== 'restore',
      onConfirm: async () => {
        setConfirm(null); setActionId(comment._id)
        try {
          await adminService.adminCommentAction(comment._id, { action })
          showToast(`${labels[action]} 처리되었습니다`)
          load()
        } catch { showToast('처리 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    active: { label: '배포 중', cls: 'bg-green-500/10 text-green-400 border-green-500/30' },
    hidden: { label: '숨김',   cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    deleted: { label: '삭제',  cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  }

  const CHANNELS = [
    { value: 'notice', label: '공지사항' },
    { value: 'new-game-intro', label: '신작게임소개' },
    { value: 'beta-game', label: '베타게임' },
    { value: 'live-game', label: '라이브게임' },
    { value: 'free', label: '자유게시판' },
  ]

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="댓글 내용 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
          <option value="">전체 상태</option>
          <option value="active">배포 중</option>
          <option value="hidden">숨김</option>
        </select>
        <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{total}</span>건</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16 text-text-muted">신고된 댓글이 없습니다</div>
      ) : (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide">
                <th className="w-1 px-0" />
                <th className="px-4 py-3 text-left whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left">댓글 내용</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">게시글</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">탭</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  <button onClick={() => handleSort('author')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    작성자 <SortIcon field="author" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    날짜 <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">
                  <button onClick={() => handleSort('reportCount')} className="flex items-center gap-1 mx-auto hover:text-text-primary transition-colors">
                    <Flag className="w-3.5 h-3.5" /> <SortIcon field="reportCount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">게시물보기</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">숨김</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">댓글삭제</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(comment => {
                const st = STATUS_LABEL[comment.status] || STATUS_LABEL.active
                const ch = CHANNELS.find(c => c.value === comment.postId?.channel)
                return (
                  <tr key={comment._id} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors ${actionId === comment._id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className={`w-1 p-0 ${comment.reportCount >= 5 ? 'bg-red-500' : comment.reportCount >= 3 ? 'bg-orange-400' : ''}`} />

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${st.cls}`}>{st.label}</span>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-text-primary font-medium text-sm truncate">{comment.content}</p>
                    </td>

                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-text-secondary text-sm truncate">{comment.postId?.title ?? '—'}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-secondary bg-bg-tertiary border border-line px-2 py-0.5 rounded-md">
                        {ch ? ch.label : (comment.postId?.channel ?? '—')}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{comment.author?.username ?? '—'}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center">
                        <Flag className="w-3.5 h-3.5" />{comment.reportCount}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {comment.postId && (
                        <Link href={`/community/${comment.postId._id}`} target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 게시물보기
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {comment.status === 'hidden' ? (
                        <button onClick={() => handleAction(comment, 'restore')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> 복구
                        </button>
                      ) : (
                        <button onClick={() => handleAction(comment, 'hide')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40 transition-colors">
                          <EyeOff className="w-3 h-3" /> 숨김
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => handleAction(comment, 'delete')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-red-700/20 text-red-400 border-red-600/40 hover:bg-red-700/40 transition-colors">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronLeft className="w-4 h-4 text-text-primary" />
          </button>
          <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      )}
    </div>
  )
}

// ────────── 신고센터: 삭제 보관함 탭 ──────────

function DeletedCountdown({ deletedAt }: { deletedAt?: string }) {
  if (!deletedAt) return <span className="text-text-muted text-xs">—</span>
  const deleted = new Date(deletedAt)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
  const daysLeft = 30 - daysSince
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-text-secondary">{daysSince}일 경과</span>
      <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-400' : daysLeft <= 14 ? 'text-orange-400' : 'text-text-muted'}`}>
        D-{Math.max(0, daysLeft)}
      </span>
    </div>
  )
}

export function DeletedArchiveTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [subTab, setSubTab] = useState<'posts' | 'comments'>('posts')
  const [confirm, setConfirm] = useState<any>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  // ── 게시글 ──
  const [posts, setPosts] = useState<ReportedPost[]>([])
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsPage, setPostsPage] = useState(1)
  const [postsSearch, setPostsSearch] = useState('')
  const [postsLoading, setPostsLoading] = useState(true)
  const LIMIT = 10
  const postsTotalPages = Math.max(1, Math.ceil(postsTotal / LIMIT))

  const loadPosts = useCallback(async () => {
    setPostsLoading(true)
    try {
      const data = await adminService.getDeletedPosts({ page: postsPage, limit: LIMIT, search: postsSearch || undefined })
      setPosts(data.posts || [])
      setPostsTotal(data.total || 0)
    } catch { showToast('불러오기 실패', false) }
    finally { setPostsLoading(false) }
  }, [postsPage, postsSearch, showToast])

  useEffect(() => { if (subTab === 'posts') loadPosts() }, [subTab, loadPosts])

  const handleRestorePost = (post: ReportedPost) => {
    setConfirm({
      msg: `"${post.title}" 게시글을 신고 상태로 복구하시겠습니까?`,
      danger: false,
      onConfirm: async () => {
        setConfirm(null); setActionId(post._id)
        try {
          await adminService.updatePostStatus(post._id, { status: 'active' })
          showToast('복구되었습니다')
          loadPosts()
        } catch { showToast('복구 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  // ── 댓글 ──
  const [comments, setComments] = useState<ReportedComment[]>([])
  const [commentsTotal, setCommentsTotal] = useState(0)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsSearch, setCommentsSearch] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(true)
  const commentsTotalPages = Math.max(1, Math.ceil(commentsTotal / LIMIT))

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const data = await adminService.getDeletedComments({ page: commentsPage, limit: LIMIT, search: commentsSearch || undefined })
      setComments(data.comments || [])
      setCommentsTotal(data.total || 0)
    } catch { showToast('불러오기 실패', false) }
    finally { setCommentsLoading(false) }
  }, [commentsPage, commentsSearch, showToast])

  useEffect(() => { if (subTab === 'comments') loadComments() }, [subTab, loadComments])

  const handleRestoreComment = (comment: ReportedComment) => {
    setConfirm({
      msg: '이 댓글을 신고 상태로 복구하시겠습니까?',
      danger: false,
      onConfirm: async () => {
        setConfirm(null); setActionId(comment._id)
        try {
          await adminService.adminCommentAction(comment._id, { action: 'restore' })
          showToast('복구되었습니다')
          loadComments()
        } catch { showToast('복구 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  const CHANNELS_MAP: Record<string, string> = {
    'notice': '공지사항', 'new-game-intro': '신작게임소개',
    'beta-game': '베타게임', 'live-game': '라이브게임', 'free': '자유게시판',
  }

  const SUB_TABS = [
    { key: 'posts' as const,    label: '게시글', icon: MessageSquare },
    { key: 'comments' as const, label: '댓글',   icon: MessageCircle },
  ]

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {/* 서브 탭 */}
      <div className="flex gap-1 border-b border-line">
        {SUB_TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                subTab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {/* 게시글 목록 */}
      {subTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input value={postsSearch} onChange={e => { setPostsSearch(e.target.value); setPostsPage(1) }} placeholder="제목·내용 검색..."
                className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
            </div>
            <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{postsTotal}</span>건</span>
          </div>
          {postsLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-text-muted">삭제된 게시글이 없습니다</div>
          ) : (
            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">제목</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">탭</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">작성자</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">삭제일</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap"><Eye className="w-3.5 h-3.5 mx-auto" /></th>
                    <th className="px-4 py-3 text-center whitespace-nowrap"><ThumbsUp className="w-3.5 h-3.5 mx-auto" /></th>
                    <th className="px-4 py-3 text-center whitespace-nowrap"><MessageCircle className="w-3.5 h-3.5 mx-auto" /></th>
                    <th className="px-4 py-3 text-center whitespace-nowrap"><Flag className="w-3.5 h-3.5 mx-auto" /></th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">삭제 카운트</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">복구</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post._id} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors ${actionId === post._id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-text-primary font-semibold text-sm truncate">{post.title}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-text-secondary bg-bg-tertiary border border-line px-2 py-0.5 rounded-md">
                          {CHANNELS_MAP[post.channel] ?? post.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{post.author?.username ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.views ?? 0}</td>
                      <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.likes?.length ?? 0}</td>
                      <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{post.commentCount ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center">
                          <Flag className="w-3.5 h-3.5" />{post.reportCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <DeletedCountdown deletedAt={post.deletedAt} />
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button onClick={() => handleRestorePost(post)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> 복구
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {postsTotalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button onClick={() => setPostsPage(p => Math.max(1, p - 1))} disabled={postsPage === 1}
                className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-text-primary" />
              </button>
              <span className="text-text-secondary text-sm">{postsPage} / {postsTotalPages}</span>
              <button onClick={() => setPostsPage(p => Math.min(postsTotalPages, p + 1))} disabled={postsPage === postsTotalPages}
                className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-text-primary" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 댓글 목록 */}
      {subTab === 'comments' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input value={commentsSearch} onChange={e => { setCommentsSearch(e.target.value); setCommentsPage(1) }} placeholder="댓글 내용 검색..."
                className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
            </div>
            <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{commentsTotal}</span>건</span>
          </div>
          {commentsLoading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-16 text-text-muted">삭제된 댓글이 없습니다</div>
          ) : (
            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">댓글 내용</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">게시글</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">탭</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">작성자</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">삭제일</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap"><Flag className="w-3.5 h-3.5 mx-auto" /></th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">삭제 카운트</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">복구</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map(comment => (
                    <tr key={comment._id} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors ${actionId === comment._id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-text-primary font-semibold text-sm truncate">{comment.content}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <p className="text-text-secondary text-sm truncate">{comment.postId?.title ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-text-secondary bg-bg-tertiary border border-line px-2 py-0.5 rounded-md">
                          {CHANNELS_MAP[comment.postId?.channel ?? ''] ?? (comment.postId?.channel ?? '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{comment.author?.username ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center">
                          <Flag className="w-3.5 h-3.5" />{comment.reportCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <DeletedCountdown deletedAt={comment.deletedAt} />
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button onClick={() => handleRestoreComment(comment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40 transition-colors">
                          <ShieldCheck className="w-3 h-3" /> 복구
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {commentsTotalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button onClick={() => setCommentsPage(p => Math.max(1, p - 1))} disabled={commentsPage === 1}
                className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-text-primary" />
              </button>
              <span className="text-text-secondary text-sm">{commentsPage} / {commentsTotalPages}</span>
              <button onClick={() => setCommentsPage(p => Math.min(commentsTotalPages, p + 1))} disabled={commentsPage === commentsTotalPages}
                className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-text-primary" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ────────── 메인 페이지 ──────────

const TABS = [
  { key: 'banner', label: '배너 관리', icon: ImageIcon },
  { key: 'announcements', label: '공지사항', icon: Megaphone },
  { key: 'reviews', label: '게임 리뷰 관리', icon: MessageSquare },
]

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState('banner')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AdminLayout>
      {toast && <Toast {...toast} />}

      <div className="space-y-5">
        <h2 className="text-text-primary text-xl font-bold flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-purple-400" /> 커뮤니티 관리
        </h2>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-line">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'banner' && <BannerTab showToast={showToast} />}
        {activeTab === 'announcements' && <AnnouncementsTab showToast={showToast} />}
        {activeTab === 'reviews' && <ReviewsTab showToast={showToast} />}
      </div>
    </AdminLayout>
  )
}
