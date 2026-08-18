'use client'
import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import adminService, { CommunityBanner, ReportedPost, ReportedComment, ReportedAnnouncement, ReportReason, DeletedAnnouncement } from '@/services/adminService'
import communityService from '@/services/communityService'
import AnnouncementManager, { AnnouncementFormValue } from '@/components/community/AnnouncementManager'
import {
  Search, ShieldOff, ShieldCheck, Trash2, ChevronLeft, ChevronRight, ChevronDown,
  Loader2, AlertCircle, AlertTriangle, CheckCircle, MessageSquare, PenSquare, X,
  ImagePlus, Hash, Image as ImageIcon, Megaphone, Upload,
  Plus, Eye, EyeOff, Pin, Bell, BellOff, Edit2, LayoutDashboard, ExternalLink, ThumbsUp, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown,
  BarChart2, Star,
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import { formatDate } from '@/lib/formatDate'

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
  images?: string[]
  thumbnailIndex?: number
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
          <button onClick={onCancel} className="px-3 py-1.5 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
          <button onClick={onConfirm} className={`px-3 py-1.5 text-base text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>확인</button>
        </div>
      </div>
    </div>
  )
}

// ────────── 게임 선택기 ──────────

function GameSelectorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('')
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    adminService.getAllGames({ search: search || undefined, limit: 20 })
      .then(d => setGames(d.games || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, open])

  const selectedId = value.match(/^\/games\/([^/]+)$/)?.[1]

  const handleSelect = (g: any) => {
    onChange(`/games/${g._id}`)
    setSelectedName(g.title)
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => { onChange(''); setSelectedName('') }

  return (
    <div ref={ref} className="relative">
      {selectedId ? (
        <div className="flex items-center gap-2 bg-bg-tertiary border border-accent/40 rounded-lg px-3 py-2">
          <span className="flex-1 text-sm text-text-primary truncate">{selectedName || value}</span>
          <button type="button" onClick={handleClear} className="text-text-muted hover:text-text-primary flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="게임명 검색..."
            className="w-full pl-9 pr-8 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
          />
          <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      )}
      {open && !selectedId && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-bg-secondary border border-line rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-text-muted" /></div>
          ) : games.length === 0 ? (
            <p className="text-center text-text-muted text-xs py-4">게임이 없습니다</p>
          ) : games.map(g => (
            <button key={g._id} type="button" onClick={() => handleSelect(g)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary transition-colors text-left">
              <div className="w-8 h-8 rounded-md overflow-hidden border border-line bg-bg-tertiary flex-shrink-0">
                <img src={g.thumbnail ? `${UPLOADS_URL}${g.thumbnail}` : ''} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm text-text-primary truncate">{g.title}</span>
            </button>
          ))}
        </div>
      )}
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
  onEdit,
  gameSelector,
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
  onEdit: (id: string, data: { title: string; linkUrl: string; file?: File }) => void
  gameSelector?: boolean
}) {
  const [statPeriod, setStatPeriod] = useState<1 | 7 | 30 | null>(7)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const customRef = useRef<HTMLDivElement>(null)
  const [chartBannerId, setChartBannerId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!customOpen) return
    const handler = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [customOpen])

  const getDateRange = (): { from: string; to: string } => {
    if (statPeriod !== null) {
      const from = new Date()
      from.setDate(from.getDate() - statPeriod + 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    return { from: customFrom || today, to: customTo || today }
  }

  const getStats = (b: CommunityBanner) => {
    const { from, to } = getDateRange()
    const stats = (b.dailyStats || []).filter(s => s.date >= from && s.date <= to)
    const impressions = stats.reduce((acc, s) => acc + s.impressions, 0)
    const clicks = stats.reduce((acc, s) => acc + s.clicks, 0)
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '-'
    return { impressions, clicks, ctr }
  }

  const getChartData = (b: CommunityBanner) => {
    const { from, to } = getDateRange()
    const days: string[] = []
    const cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    const statsMap = Object.fromEntries((b.dailyStats || []).map(s => [s.date, s]))
    return days.map(date => ({
      date: date.slice(5),
      노출수: statsMap[date]?.impressions ?? 0,
      클릭수: statsMap[date]?.clicks ?? 0,
      수정: statsMap[date]?.edits ?? 0,
    }))
  }

  const [gameNamesMap, setGameNamesMap] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!gameSelector) return
    adminService.getAllGames({ limit: 200 })
      .then(d => {
        const map: Record<string, string> = {}
        ;(d.games || []).forEach((g: any) => { map[g._id] = g.title })
        setGameNamesMap(map)
      })
      .catch(() => {})
  }, [gameSelector, banners])

  const [addPreview, setAddPreview] = useState<string>('')
  const handleAddFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    onFileChange(f)
    setAddPreview(f ? URL.createObjectURL(f) : '')
  }
  const handleCancelAdd = () => { onCancelAdd(); setAddPreview('') }
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editLinkUrl, setEditLinkUrl] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string>('')
  const editFileRef = useRef<HTMLInputElement>(null)

  const startEdit = (b: CommunityBanner) => {
    setEditId(b._id)
    setEditBanner(b)
    setEditTitle(b.title || '')
    setEditLinkUrl(b.linkUrl || '')
    setEditFile(null)
    setEditPreview('')
  }
  const [editBanner, setEditBanner] = useState<CommunityBanner | null>(null)
  const cancelEdit = () => { setEditId(null); setEditBanner(null); setEditFile(null); setEditPreview('') }
  const saveEdit = () => {
    if (!editId) return
    onEdit(editId, { title: editTitle, linkUrl: editLinkUrl, ...(editFile ? { file: editFile } : {}) })
    cancelEdit()
  }
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setEditFile(f)
    setEditPreview(URL.createObjectURL(f))
  }
  return (
    <>
      {editBanner && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="text-text-primary font-semibold text-sm">배너 수정</h3>
              <button onClick={cancelEdit} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <input ref={editFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleEditFileChange} />
              <div>
                <label className="text-xs text-text-muted block mb-1.5">이미지</label>
                <div
                  className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-line bg-bg-tertiary flex items-center justify-center cursor-pointer hover:border-accent transition-colors group"
                  onClick={() => editFileRef.current?.click()}
                >
                  <img
                    src={editPreview || `${UPLOADS_URL}${editBanner.imageUrl}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
                {editFile && <p className="text-xs text-text-muted mt-1">{editFile.name}</p>}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">이름</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="배너 제목"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">{gameSelector ? '연결 게임' : '링크 URL'}</label>
                {gameSelector
                  ? <GameSelectorInput value={editLinkUrl} onChange={setEditLinkUrl} />
                  : <input
                      value={editLinkUrl}
                      onChange={e => setEditLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                }
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
              <button onClick={cancelEdit} className="px-4 py-1.5 border border-line text-text-secondary hover:bg-bg-tertiary rounded-lg text-base transition-colors">취소</button>
              <button onClick={saveEdit} className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}
      {addForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="text-text-primary font-semibold text-sm">배너 추가</h3>
              <button onClick={handleCancelAdd} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <input type="file" ref={addFileRef} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAddFileChange} />
              <div>
                <label className="text-xs text-text-muted block mb-1.5">이미지 *</label>
                <div
                  className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-line bg-bg-tertiary flex items-center justify-center cursor-pointer hover:border-accent transition-colors group"
                  onClick={() => addFileRef.current?.click()}
                >
                  {addPreview
                    ? <img src={addPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-text-secondary transition-colors">
                        <Upload className="w-8 h-8" />
                        <span className="text-xs">클릭하여 이미지 선택</span>
                      </div>
                  }
                  {addPreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                {formFile && <p className="text-xs text-text-muted mt-1">{formFile.name}</p>}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">이름 (선택)</label>
                <input value={formTitle} onChange={e => onTitleChange(e.target.value)} placeholder="배너 제목"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">{gameSelector ? '연결 게임 *' : '링크 URL (선택)'}</label>
                {gameSelector
                  ? <GameSelectorInput value={formLinkUrl} onChange={onLinkChange} />
                  : <input value={formLinkUrl} onChange={e => onLinkChange(e.target.value)} placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                }
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
              <button onClick={handleCancelAdd} className="px-4 py-1.5 border border-line text-text-secondary hover:bg-bg-tertiary rounded-lg text-base transition-colors">취소</button>
              <button onClick={onAdd} disabled={uploading || !formFile || (!!gameSelector && !formLinkUrl)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium disabled:opacity-50 transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 등록
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="bg-bg-secondary border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-text-primary font-semibold">{title}</h3>
          <p className="text-text-muted text-xs mt-0.5">{subtitle}</p>
        </div>
        {banners.length < 5 && (
          <button onClick={onToggleAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium transition-colors">
            <Plus className="w-4 h-4" /> 배너 추가
          </button>
        )}
      </div>


      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">등록된 배너가 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1.5 mb-3 px-1 flex-wrap">
            <span className="text-xs text-text-muted mr-1">운영 기간</span>
            {([1, 7, 30] as const).map(p => (
              <button key={p} onClick={() => setStatPeriod(p)}
                className={`px-2.5 py-0.5 rounded-full text-base font-medium transition-colors ${statPeriod === p ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
                {p === 1 ? '오늘' : `${p}일`}
              </button>
            ))}
            <div className="relative ml-1" ref={customRef}>
              <button onClick={() => setCustomOpen(o => !o)}
                className={`px-2.5 py-0.5 rounded-full text-base font-medium transition-colors ${statPeriod === null ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}>
                {statPeriod === null && customFrom && customTo ? `${customFrom.slice(5)} ~ ${customTo.slice(5)}` : '직접 설정'}
              </button>
              {customOpen && (
                <div className="absolute top-7 left-0 z-20 bg-bg-secondary border border-line rounded-xl shadow-xl p-3 flex flex-col gap-2 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted">시작일</span>
                    <input type="date" value={customFrom} max={customTo || today}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-line bg-bg-tertiary text-text-primary [color-scheme:dark]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted">종료일</span>
                    <input type="date" value={customTo} min={customFrom} max={today}
                      onChange={e => setCustomTo(e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-line bg-bg-tertiary text-text-primary [color-scheme:dark]" />
                  </div>
                  <button
                    onClick={() => { if (customFrom && customTo) { setStatPeriod(null); setCustomOpen(false) } }}
                    disabled={!customFrom || !customTo}
                    className="mt-1 px-3 py-1 rounded-lg text-base font-medium bg-accent text-white disabled:opacity-40 disabled:cursor-not-allowed">
                    적용
                  </button>
                </div>
              )}
            </div>
          </div>
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-line text-text-muted text-sm divide-x divide-white/[0.06]">
                <th className="text-left py-2 px-3 font-medium w-16">순서</th>
                <th className="text-left py-2 px-3 font-medium w-24">미리보기</th>
                <th className="text-left py-2 px-3 font-medium">이름</th>
                <th className="text-left py-2 px-3 font-medium w-80">{gameSelector ? '게임명' : '링크'}</th>
                <th className="text-left py-2 px-3 font-medium w-28">등록일</th>
                <th className="text-left py-2 px-3 font-medium w-28">최근 수정일</th>
                <th className="text-right py-2 px-3 font-medium w-20">노출수</th>
                <th className="text-right py-2 px-3 font-medium w-20">클릭수</th>
                <th className="text-right py-2 px-3 font-medium w-16">CTR</th>
                <th className="text-left py-2 px-3 font-medium w-32">상태</th>
                <th className="text-left py-2 px-3 font-medium w-16">그래프</th>
                <th className="text-left py-2 px-3 font-medium w-16">수정</th>
                <th className="text-left py-2 px-3 font-medium w-16">삭제</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b, i) => (
                <Fragment key={b._id}>
                <tr className="border-b border-line last:border-0 hover:bg-bg-tertiary transition-colors divide-x divide-white/[0.06]">
                  <td className="py-3 px-3 text-text-muted">{i + 1}</td>
                  <td className="py-3 px-3">
                    <div className="w-20 h-12 rounded-lg overflow-hidden border border-line bg-bg-tertiary">
                      <img src={`${UPLOADS_URL}${b.imageUrl}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-text-primary">{b.title || <span className="text-text-muted">-</span>}</td>
                  <td className="py-3 px-3">
                    {gameSelector
                      ? (() => {
                          const id = b.linkUrl?.match(/^\/games\/([^/]+)$/)?.[1]
                          return id
                            ? <a href={`/games/${id}`} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">{gameNamesMap[id] || id}</a>
                            : <span className="text-text-muted">-</span>
                        })()
                      : b.linkUrl
                        ? <a href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="text-accent text-xs truncate max-w-[80px] block hover:underline">{b.linkUrl}</a>
                        : <span className="text-text-muted">-</span>
                    }
                  </td>
                  <td className="py-3 px-3 text-text-muted text-xs">{formatDate(b.createdAt)}</td>
                  <td className="py-3 px-3 text-text-muted text-xs">{formatDate(b.updatedAt)}</td>
                  {(() => { const s = getStats(b); return (<>
                    <td className="py-3 px-3 text-right text-xs text-text-secondary">{s.impressions.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-xs text-text-secondary">{s.clicks.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-xs text-text-muted">{s.ctr === '-' ? '-' : `${s.ctr}%`}</td>
                  </>) })()}
                  <td className="py-3 px-3">
                    <button onClick={() => onToggleActive(b)} className="flex items-center gap-2 group">
                      <div className={`relative w-9 h-5 rounded-full transition-colors ${b.isActive ? 'bg-green-500' : 'bg-bg-muted'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${b.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                      <span className={`text-xs ${b.isActive ? 'text-green-400' : 'text-text-muted'}`}>{b.isActive ? '활성' : '비활성'}</span>
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => setChartBannerId(chartBannerId === b._id ? null : b._id)}
                      className={`p-1.5 rounded-lg transition-colors ${chartBannerId === b._id ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-accent hover:bg-accent/10'}`}>
                      <BarChart2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => startEdit(b)}
                      className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => onDelete(b._id)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                {chartBannerId === b._id && (
                  <tr className="border-b border-line bg-bg-tertiary/50">
                    <td colSpan={12} className="px-4 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart2 className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">{b.title || '배너'} — {statPeriod === 1 ? '오늘' : statPeriod !== null ? `최근 ${statPeriod}일` : `${customFrom} ~ ${customTo}`}</span>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={getChartData(b)} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} width={36} />
                          <Tooltip content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]?.payload as { 노출수: number; 클릭수: number; 수정: number }
                            return (
                              <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                                <p style={{ color: '#ccc', marginBottom: 6 }}>{label}</p>
                                <p style={{ color: '#6366f1', margin: '2px 0' }}>노출수 : {d.노출수.toLocaleString()}</p>
                                <p style={{ color: '#22d3ee', margin: '2px 0' }}>클릭수 : {d.클릭수.toLocaleString()}</p>
                                {d.수정 > 0 && <p style={{ color: '#f59e0b', margin: '4px 0 0' }}>수정 횟수 : {d.수정}회</p>}
                              </div>
                            )
                          }} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="노출수" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="클릭수" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line dataKey="수정" stroke="transparent" dot={false} activeDot={false} legendType="none" />
                          {(() => {
                            const updatedMD = b.updatedAt.slice(5, 10)
                            const chartDates = getChartData(b).map(d => d.date)
                            if (!chartDates.includes(updatedMD)) return null
                            return (
                              <ReferenceLine x={updatedMD} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                            )
                          })()}
                        </LineChart>
                      </ResponsiveContainer>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
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

  // 신작 배너 상태
  const [newGameBanners, setNewGameBanners] = useState<CommunityBanner[]>([])
  const [newGameLoading, setNewGameLoading] = useState(true)
  const [newGameUploading, setNewGameUploading] = useState(false)
  const [newGameConfirm, setNewGameConfirm] = useState<{ id: string } | null>(null)
  const [newGameAddForm, setNewGameAddForm] = useState(false)
  const [newGameFormLinkUrl, setNewGameFormLinkUrl] = useState('')
  const [newGameFormTitle, setNewGameFormTitle] = useState('')
  const [newGameFormFile, setNewGameFormFile] = useState<File | null>(null)
  const newGameAddFileRef = useRef<HTMLInputElement>(null)

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

  const loadNewGame = useCallback(async () => {
    setNewGameLoading(true)
    try {
      const data = await adminService.getAllNewGameBanners()
      setNewGameBanners(data.banners)
    } catch { /* silent */ }
    finally { setNewGameLoading(false) }
  }, [])

  useEffect(() => { load(); loadMain(); loadEvent(); loadNewGame() }, [load, loadMain, loadEvent, loadNewGame])

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

  const handleEdit = async (id: string, data: { title: string; linkUrl: string; file?: File }) => {
    try { await adminService.updateCommunityBanner(id, data); showToast('수정되었습니다'); load() }
    catch { showToast('수정 실패', false) }
  }
  const handleMainEdit = async (id: string, data: { title: string; linkUrl: string; file?: File }) => {
    try { await adminService.updateCommunityBanner(id, data); showToast('수정되었습니다'); loadMain() }
    catch { showToast('수정 실패', false) }
  }
  const handleEventEdit = async (id: string, data: { title: string; linkUrl: string; file?: File }) => {
    try { await adminService.updateCommunityBanner(id, data); showToast('수정되었습니다'); loadEvent() }
    catch { showToast('수정 실패', false) }
  }

  const handleNewGameAdd = async () => {
    if (!newGameFormFile) { showToast('이미지를 선택해주세요', false); return }
    setNewGameUploading(true)
    try {
      await adminService.uploadNewGameBanner(newGameFormFile, { linkUrl: newGameFormLinkUrl, title: newGameFormTitle })
      showToast('배너가 등록되었습니다')
      setNewGameAddForm(false); setNewGameFormFile(null); setNewGameFormLinkUrl(''); setNewGameFormTitle('')
      loadNewGame()
    } catch (e: any) {
      showToast(e?.response?.data?.message || '업로드 실패', false)
    } finally { setNewGameUploading(false) }
  }
  const handleNewGameToggleActive = async (b: CommunityBanner) => {
    try { await adminService.updateCommunityBanner(b._id, { isActive: !b.isActive }); loadNewGame() }
    catch { showToast('변경 실패', false) }
  }
  const handleNewGameDelete = async () => {
    if (!newGameConfirm) return
    try {
      await adminService.deleteCommunityBanner(newGameConfirm.id)
      showToast('삭제되었습니다')
      setNewGameConfirm(null); loadNewGame()
    } catch { showToast('삭제 실패', false) }
  }
  const handleNewGameEdit = async (id: string, data: { title: string; linkUrl: string; file?: File }) => {
    try { await adminService.updateCommunityBanner(id, data); showToast('수정되었습니다'); loadNewGame() }
    catch { showToast('수정 실패', false) }
  }

  const [bannerTab, setBannerTab] = useState<'main' | 'community' | 'event' | 'newgame'>('main')

  const BANNER_TABS = [
    { key: 'main'      as const, label: '메인_배너' },
    { key: 'community' as const, label: '커뮤니티_배너' },
    { key: 'event'     as const, label: '메인_이벤트' },
    { key: 'newgame'   as const, label: '메인_신작' },
  ]

  return (
    <div className="space-y-5">
      {confirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleDelete} onCancel={() => setConfirm(null)} />}
      {mainConfirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleMainDelete} onCancel={() => setMainConfirm(null)} />}
      {eventConfirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleEventDelete} onCancel={() => setEventConfirm(null)} />}
      {newGameConfirm && <ConfirmModal msg="배너를 삭제하시겠습니까?" onConfirm={handleNewGameDelete} onCancel={() => setNewGameConfirm(null)} />}

      {/* 배너 종류 탭 */}
      <div className="flex gap-1 border-b border-line">
        {BANNER_TABS.map(t => (
          <button key={t.key} onClick={() => setBannerTab(t.key)}
            className={`px-4 py-2.5 text-base font-medium border-b-2 transition-colors ${
              bannerTab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {bannerTab === 'main' && (
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
          onEdit={handleMainEdit}
        />
      )}

      {bannerTab === 'newgame' && (
        <BannerSection
          title="메인_신작 배너"
          subtitle="메인 페이지 신작 게임 섹션에 표시됩니다 · 최대 5개 · 자동 롤링"
          banners={newGameBanners}
          loading={newGameLoading}
          uploading={newGameUploading}
          addForm={newGameAddForm}
          formFile={newGameFormFile}
          formTitle={newGameFormTitle}
          formLinkUrl={newGameFormLinkUrl}
          addFileRef={newGameAddFileRef}
          onToggleAddForm={() => setNewGameAddForm(v => !v)}
          onFileChange={setNewGameFormFile}
          onTitleChange={setNewGameFormTitle}
          onLinkChange={setNewGameFormLinkUrl}
          onAdd={handleNewGameAdd}
          onCancelAdd={() => { setNewGameAddForm(false); setNewGameFormFile(null); setNewGameFormLinkUrl(''); setNewGameFormTitle('') }}
          onToggleActive={handleNewGameToggleActive}
          onDelete={id => setNewGameConfirm({ id })}
          onEdit={handleNewGameEdit}
          gameSelector
        />
      )}

      {bannerTab === 'community' && (
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
          onEdit={handleEdit}
        />
      )}

      {bannerTab === 'event' && (
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
          onEdit={handleEventEdit}
        />
      )}
    </div>
  )
}

// ────────── 탭 2: 공지사항 관리 ──────────

const ANNOUNCEMENT_TYPE_OPTIONS = [
  { value: 'notice', label: '공지' },
  { value: 'event', label: '이벤트' },
  { value: 'maintenance', label: '점검' },
  { value: 'update', label: '업데이트' },
]

const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { value: 'urgent', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'normal', label: '보통' },
  { value: 'low', label: '낮음' },
]

function AnnouncementsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAnnouncements({ limit: 50 })
      setItems(data.announcements || [])
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: AnnouncementFormValue) => {
    await adminService.createAnnouncement(data as Partial<Announcement>)
    showToast('공지가 등록되었습니다')
    load()
  }

  const handleUpdate = async (id: string, data: AnnouncementFormValue) => {
    await adminService.updateAnnouncement(id, data as Partial<Announcement>)
    showToast('수정되었습니다')
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
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      <AnnouncementManager
        items={items}
        loading={loading}
        typeOptions={ANNOUNCEMENT_TYPE_OPTIONS}
        priorityOptions={ANNOUNCEMENT_PRIORITY_OPTIONS}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        uploadImages={async (files) => {
          const result = await communityService.uploadImages(files)
          return result.images
        }}
      />
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
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
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

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true); setError('')
    try {
      await communityService.createPost({ title: title.trim(), content: content.trim(), channel, images, videoUrl: videoUrl.trim() || undefined, tags: tags.length > 0 ? tags : undefined })
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
                  className={`px-3 py-1.5 rounded-lg text-base font-medium transition-colors ${channel === ch.value ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}>
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
            <button onClick={onClose} className="px-4 py-2 border border-line rounded-lg text-base text-text-secondary hover:bg-bg-tertiary">취소</button>
            <button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium disabled:opacity-50">
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

const REPORT_CATEGORY_FIXED: Record<string, string> = {
  notice: '공지',
  free: '자유게시판',
  'new-game-intro': '신작게임소개',
}

function reportedPostCategory(post: ReportedPost): string {
  if (REPORT_CATEGORY_FIXED[post.channel]) return REPORT_CATEGORY_FIXED[post.channel]
  return post.gameId?.title ?? (CHANNELS.find(c => c.value === post.channel)?.label ?? post.channel)
}

interface MergedReportRow {
  key: string
  kind: 'post' | 'announcement'
  _id: string
  title: string
  category: string
  status: 'active' | 'hidden' | 'deleted' | 'notice'
  author: string | null
  reportCount: number
  views: number
  likeCount: number
  commentCount: number
  createdAt: string
  viewPath: string
  reports: ReportReason[]
  post?: ReportedPost
}

export function ReportedPostsTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [posts, setPosts] = useState<ReportedPost[]>([])
  const [announcements, setAnnouncements] = useState<ReportedAnnouncement[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('reportCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const [reasonRow, setReasonRow] = useState<MergedReportRow | null>(null)

  const LIMIT = 10

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-accent" /> : <ArrowDown className="w-3 h-3 text-accent" />
  }

  const merged: MergedReportRow[] = [
    ...posts.map((p): MergedReportRow => ({
      key: `post-${p._id}`, kind: 'post', _id: p._id, title: p.title, category: reportedPostCategory(p),
      status: p.status, author: p.author?.username ?? null, reportCount: p.reportCount, views: p.views ?? 0,
      likeCount: p.likes?.length ?? 0, commentCount: p.commentCount ?? 0, createdAt: p.createdAt,
      viewPath: `/community/${p._id}`, post: p,
      reports: (p.reports || []).map(r => ({
        reason: r.reason, createdAt: r.createdAt,
        username: (typeof r.userId === 'object' ? r.userId?.username : null) ?? null,
      })),
    })),
    ...announcements.map((a): MergedReportRow => ({
      key: `ann-${a._id}`, kind: 'announcement', _id: a._id, title: a.title, category: a.category,
      status: 'notice', author: null, reportCount: a.reportCount, views: a.views ?? 0,
      likeCount: a.likeCount ?? 0, commentCount: 0, createdAt: a.createdAt, viewPath: a.viewPath,
      reports: a.reports || [],
    })),
  ]

  const filtered = merged.filter(r => (!statusFilter || r.status === statusFilter) && (!search || r.title.toLowerCase().includes(search.toLowerCase())))

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string = 0, bv: number | string = 0
    if (sortField === 'reportCount') { av = a.reportCount; bv = b.reportCount }
    else if (sortField === 'title') { av = a.title; bv = b.title }
    else if (sortField === 'author') { av = a.author ?? ''; bv = b.author ?? '' }
    else if (sortField === 'createdAt') { av = a.createdAt; bv = b.createdAt }
    else if (sortField === 'views') { av = a.views; bv = b.views }
    else if (sortField === 'likes') { av = a.likeCount; bv = b.likeCount }
    else if (sortField === 'commentCount') { av = a.commentCount; bv = b.commentCount }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const paged = sorted.slice((page - 1) * LIMIT, page * LIMIT)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [postData, annData] = await Promise.all([
        adminService.getReportedPosts({ page: 1, limit: 500 }),
        adminService.getReportedAnnouncements(),
      ])
      setPosts(postData.posts || [])
      setAnnouncements(annData.announcements || [])
    } catch { showToast('신고 목록 불러오기 실패', false) }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, statusFilter])

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
    active: { label: '배포 중', cls: 'text-text-primary' },
    hidden: { label: '숨김', cls: 'text-text-primary' },
    deleted: { label: '삭제', cls: 'text-text-primary' },
    notice: { label: '공지', cls: 'text-text-primary' },
  }

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      {reasonRow && (
        <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4" onClick={() => setReasonRow(null)}>
          <div className="bg-bg-card border border-line rounded-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-text-primary font-bold">신고 사유 — {reasonRow.title}</h3>
            </div>
            {reasonRow.reports.length === 0 ? (
              <p className="text-text-muted text-sm">신고 사유가 기록되어 있지 않습니다</p>
            ) : (
              <ul className="space-y-3">
                {reasonRow.reports.map((r, i) => (
                  <li key={i} className="bg-bg-secondary border border-line rounded-lg p-3">
                    <p className="text-text-primary text-sm whitespace-pre-wrap break-words">{r.reason}</p>
                    <p className="text-text-muted text-xs mt-1.5">
                      {r.username ?? '알 수 없음'} · {new Date(r.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setReasonRow(null)}
              className="mt-5 w-full px-4 py-2 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="제목·내용 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
          <option value="">전체 상태</option>
          <option value="active">배포 중</option>
          <option value="hidden">숨김</option>
          <option value="notice">공지</option>
        </select>
        <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{total}</span>건</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-text-muted">신고된 콘텐츠가 없습니다</div>
      ) : (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide divide-x divide-line">
                <th className="px-4 py-3 text-left whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    제목 <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">카테고리</th>
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
                    <AlertTriangle className="w-3.5 h-3.5" /> <SortIcon field="reportCount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center whitespace-nowrap">게시물보기</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">숨김</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">삭제</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(row => {
                const st = STATUS_LABEL[row.status] || STATUS_LABEL.active
                const isPost = row.kind === 'post'
                return (
                  <tr key={row.key} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors divide-x divide-line ${actionId === row._id ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* 상태 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>

                    {/* 제목 */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-text-primary font-semibold text-sm truncate">{row.title}</p>
                    </td>

                    {/* 카테고리 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-secondary">{row.category}</span>
                    </td>

                    {/* 작성자 */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{row.author ?? '—'}</td>

                    {/* 날짜 */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{formatDate(row.createdAt)}</td>

                    {/* 신고 수 (클릭하면 사유 모달) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => setReasonRow(row)} title="신고 사유 보기"
                        className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center hover:underline">
                        <AlertTriangle className="w-3.5 h-3.5" />{row.reportCount}
                      </button>
                    </td>

                    {/* 게시물보기 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Link href={row.viewPath} target="_blank" title="게시물보기"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-sky-500 hover:bg-sky-500/10 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>

                    {/* 숨김/복구 (게시글만) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {!isPost ? (
                        <span className="text-text-muted">—</span>
                      ) : row.status === 'hidden' ? (
                        <button onClick={() => handleAction(row.post!, 'restore')} title="복구"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleAction(row.post!, 'hide')} title="숨김"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </td>

                    {/* 삭제 (게시글만) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {!isPost ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <button onClick={() => handleAction(row.post!, 'delete')} title="삭제"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-base font-medium">
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
                    <p className="text-text-muted text-xs mt-1">{formatDate(r.createdAt)} · 도움됨 {r.helpfulCount || 0}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleBlock(r)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-base border transition-colors ${r.isBlocked ? 'bg-green-700/20 text-green-400 border-green-600/40 hover:bg-green-700/40' : 'bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40'}`}>
                      {r.isBlocked ? <><ShieldCheck className="w-3 h-3" /> 해제</> : <><ShieldOff className="w-3 h-3" /> 차단</>}
                    </button>
                    <button onClick={() => handleDelete(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-base border bg-red-700/20 text-red-400 border-red-600/40 hover:bg-red-700/40 transition-colors">
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
    active: { label: '배포 중', cls: 'text-text-primary' },
    hidden: { label: '숨김',   cls: 'text-text-primary' },
    deleted: { label: '삭제',  cls: 'text-text-primary' },
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
              <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide divide-x divide-line">
                <th className="px-4 py-3 text-left whitespace-nowrap">상태</th>
                <th className="px-4 py-3 text-left">댓글 내용</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">게시글</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">카테고리</th>
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
                    <AlertTriangle className="w-3.5 h-3.5" /> <SortIcon field="reportCount" />
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
                  <tr key={comment._id} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors divide-x divide-line ${actionId === comment._id ? 'opacity-50 pointer-events-none' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-text-primary font-medium text-sm truncate">{comment.content}</p>
                    </td>

                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="text-text-secondary text-sm truncate">{comment.postId?.title ?? '—'}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-secondary">{ch ? ch.label : (comment.postId?.channel ?? '—')}</span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{comment.author?.username ?? '—'}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{formatDate(comment.createdAt)}</td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 text-sm font-bold text-red-400 justify-center">
                        <AlertTriangle className="w-3.5 h-3.5" />{comment.reportCount}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {comment.postId && (
                        <Link href={`/community/${comment.postId._id}`} target="_blank" title="게시물보기"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-sky-500 hover:bg-sky-500/10 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {comment.status === 'hidden' ? (
                        <button onClick={() => handleAction(comment, 'restore')} title="복구"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => handleAction(comment, 'hide')} title="숨김"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => handleAction(comment, 'delete')} title="댓글 삭제"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
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

interface MergedDeletedRow {
  key: string
  kind: 'post' | 'announcement'
  annKind?: 'platform' | 'game'
  _id: string
  title: string
  category: string
  author: string | null
  reportCount: number
  views: number
  likeCount: number
  commentCount: number
  createdAt: string
  deletedAt: string
  viewPath: string
}

export function DeletedArchiveTab({ showToast }: { showToast: (msg: string, ok?: boolean) => void }) {
  const [posts, setPosts] = useState<ReportedPost[]>([])
  const [announcements, setAnnouncements] = useState<DeletedAnnouncement[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const LIMIT = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [postData, annData] = await Promise.all([
        adminService.getDeletedPosts({ page: 1, limit: 500 }),
        adminService.getDeletedAnnouncements(),
      ])
      setPosts(postData.posts || [])
      setAnnouncements(annData.announcements || [])
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  const CHANNELS_MAP: Record<string, string> = {
    'notice': '공지사항', 'new-game-intro': '신작게임소개',
    'beta-game': '베타게임', 'live-game': '라이브게임', 'free': '자유게시판',
  }

  const merged: MergedDeletedRow[] = [
    ...posts.map((p): MergedDeletedRow => ({
      key: `post-${p._id}`, kind: 'post', _id: p._id, title: p.title,
      category: `${CHANNELS_MAP[p.channel] ?? p.channel}${p.gameId?.title ? ` > ${p.gameId.title}` : ''}`,
      author: p.author?.username ?? null, reportCount: p.reportCount, views: p.views ?? 0,
      likeCount: p.likes?.length ?? 0, commentCount: p.commentCount ?? 0, createdAt: p.createdAt,
      deletedAt: p.deletedAt ?? p.createdAt, viewPath: `/community/${p._id}`,
    })),
    ...announcements.map((a): MergedDeletedRow => ({
      key: `ann-${a._id}`, kind: 'announcement', annKind: a.kind, _id: a._id, title: a.title,
      category: a.category, author: null, reportCount: a.reportCount, views: a.views ?? 0,
      likeCount: a.likeCount ?? 0, commentCount: 0, createdAt: a.createdAt,
      deletedAt: a.deletedAt, viewPath: a.viewPath,
    })),
  ]

  const filtered = merged.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const paged = sorted.slice((page - 1) * LIMIT, page * LIMIT)

  const handleRestore = (row: MergedDeletedRow) => {
    setConfirm({
      msg: `"${row.title}"을(를) 복구하시겠습니까?`,
      danger: false,
      onConfirm: async () => {
        setConfirm(null); setActionId(row._id)
        try {
          if (row.kind === 'post') await adminService.updatePostStatus(row._id, { status: 'active' })
          else await adminService.restoreAnnouncement(row.annKind!, row._id)
          showToast('복구되었습니다')
          load()
        } catch { showToast('복구 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  const handlePermanentDelete = (row: MergedDeletedRow) => {
    setConfirm({
      msg: `"${row.title}"을(를) 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null); setActionId(row._id)
        try {
          if (row.kind === 'post') await adminService.permanentlyDeletePost(row._id)
          else await adminService.permanentlyDeleteAnnouncement(row.annKind!, row._id)
          showToast('완전히 삭제되었습니다')
          load()
        } catch { showToast('완전 삭제 실패', false) }
        finally { setActionId(null) }
      },
    })
  }

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="제목 검색..."
            className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none" />
        </div>
        <span className="text-text-muted text-sm flex-shrink-0">총 <span className="text-text-primary font-semibold">{total}</span>건</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-text-muted">삭제된 게시물이 없습니다</div>
      ) : (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg-tertiary text-xs text-text-secondary font-semibold uppercase tracking-wide divide-x divide-line">
                <th className="px-4 py-3 text-left">제목</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">위치</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">작성자</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">삭제일</th>
                <th className="px-4 py-3 text-center whitespace-nowrap"><Eye className="w-3.5 h-3.5 mx-auto" /></th>
                <th className="px-4 py-3 text-center whitespace-nowrap"><ThumbsUp className="w-3.5 h-3.5 mx-auto" /></th>
                <th className="px-4 py-3 text-center whitespace-nowrap"><MessageCircle className="w-3.5 h-3.5 mx-auto" /></th>
                <th className="px-4 py-3 text-center whitespace-nowrap">신고</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">완전 삭제</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">복구</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(row => (
                <tr key={row.key} className={`border-t border-line bg-bg-secondary hover:bg-bg-tertiary transition-colors divide-x divide-line ${actionId === row._id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-text-primary font-semibold text-sm truncate">{row.title}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="text-sm text-text-secondary">{row.category}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary font-medium">{row.author ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">{formatDate(row.deletedAt)}</td>
                  <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{row.views}</td>
                  <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{row.likeCount}</td>
                  <td className="px-4 py-3 text-center text-sm text-text-secondary font-medium">{row.commentCount}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-red-400">{row.reportCount}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button onClick={() => handlePermanentDelete(row)} title="완전 삭제"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button onClick={() => handleRestore(row)} title="복구"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

// ────────── 메인 페이지 ──────────

export default function AdminCommunityPage() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'banner'
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AdminLayout>
      {toast && <Toast {...toast} />}

      <div className="space-y-5">
        <div>
          <h2 className="text-text-primary text-xl font-bold flex items-center gap-2">
            {activeTab === 'banner' && <ImageIcon className="w-5 h-5 text-purple-400" />}
            {activeTab === 'announcements' && <Megaphone className="w-5 h-5 text-purple-400" />}
            {activeTab === 'reviews' && <MessageSquare className="w-5 h-5 text-purple-400" />}
            {activeTab === 'banner' ? '배너 관리' : activeTab === 'announcements' ? '공지사항' : '게임 리뷰 관리'}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {activeTab === 'banner' && '커뮤니티에서 메인 화면에 노출되는 배너 이미지를 등록하고 관리합니다'}
            {activeTab === 'announcements' && '커뮤니티에서 플랫폼 전체 공지사항을 작성하고 관리합니다'}
            {activeTab === 'reviews' && '커뮤니티에서 사용자가 작성한 게임 리뷰를 검토하고 관리합니다'}
          </p>
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === 'banner' && <BannerTab showToast={showToast} />}
        {activeTab === 'announcements' && <AnnouncementsTab showToast={showToast} />}
        {activeTab === 'reviews' && <ReviewsTab showToast={showToast} />}
      </div>
    </AdminLayout>
  )
}
