'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import supportService, { Season } from '@/services/supportService'
import {
  Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react'

const STATUS_LABELS: Record<Season['status'], string> = {
  draft: '준비중',
  recruiting: '모집중',
  'in-progress': '진행중',
  completed: '완료',
}

const STATUS_CLS: Record<Season['status'], string> = {
  draft: 'bg-bg-tertiary text-text-secondary border-line',
  recruiting: 'bg-green-900/40 text-accent border-green-700/50',
  'in-progress': 'bg-blue-900/40 text-blue-400 border-blue-700/50',
  completed: 'bg-purple-900/40 text-purple-400 border-purple-700/50',
}

const NEXT_STATUS: Record<Season['status'], Season['status'] | null> = {
  draft: 'recruiting',
  recruiting: 'in-progress',
  'in-progress': 'completed',
  completed: null,
}

const NEXT_LABEL: Record<Season['status'], string> = {
  draft: '모집 시작',
  recruiting: '진행 시작',
  'in-progress': '완료 처리',
  completed: '',
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-text-primary shadow-lg z-50 ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
      {msg}
    </div>
  )
}

function SeasonRow({
  season,
  onUpdate,
  onDelete,
  onStatusChange,
  saving,
}: {
  season: Season
  onUpdate: (id: string, data: Partial<Season>) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Season['status']) => void
  saving: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(season.title)
  const [recruitingTitle, setRecruitingTitle] = useState(season.recruitingTitle)
  const [recruitingDescription, setRecruitingDescription] = useState(season.recruitingDescription)
  const [recruitingStartDate, setRecruitingStartDate] = useState(season.recruitingStartDate ?? '')
  const [recruitingEndDate, setRecruitingEndDate] = useState(season.recruitingEndDate ?? '')
  const [recruitingMaxCount, setRecruitingMaxCount] = useState(String(season.recruitingMaxCount))
  const [progressTitle, setProgressTitle] = useState(season.progressTitle)
  const [progressDescription, setProgressDescription] = useState(season.progressDescription)
  const [progressStartDate, setProgressStartDate] = useState(season.progressStartDate ?? '')
  const [progressEndDate, setProgressEndDate] = useState(season.progressEndDate ?? '')
  const [completionTitle, setCompletionTitle] = useState(season.completionTitle)
  const [completionDescription, setCompletionDescription] = useState(season.completionDescription)
  const [completionDate, setCompletionDate] = useState(season.completionDate ?? '')

  const nextStatus = NEXT_STATUS[season.status]

  return (
    <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLS[season.status]}`}>
              {STATUS_LABELS[season.status]}
            </span>
            <span className="text-text-primary font-medium text-sm truncate">{season.title}</span>
          </div>
          <p className="text-text-muted text-xs">
            모집: {season.recruitingStartDate ? new Date(season.recruitingStartDate).toLocaleDateString('ko-KR') : '-'}
            {' ~ '}
            {season.recruitingEndDate ? new Date(season.recruitingEndDate).toLocaleDateString('ko-KR') : '-'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {nextStatus && (
            <button
              onClick={() => onStatusChange(season._id, nextStatus)}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-text-primary rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {NEXT_LABEL[season.status]}
            </button>
          )}

          <button
            onClick={() => onUpdate(season._id, { isVisible: !season.isVisible })}
            disabled={saving}
            title={season.isVisible ? '비공개로 전환' : '공개로 전환'}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            {season.isVisible ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onDelete(season._id)}
            disabled={saving}
            className="p-1.5 text-accent-text hover:text-accent-text transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button onClick={() => setExpanded(v => !v)} className="text-text-secondary hover:text-text-primary transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line p-4 space-y-6 bg-bg-primary/30">
          <div>
            <label className="block text-text-secondary text-xs font-medium mb-1">시즌 제목</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line"
            />
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-text-secondary text-xs font-bold uppercase mb-3">모집 단계</p>
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">모집 타이틀</label>
                <input value={recruitingTitle} onChange={e => setRecruitingTitle(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">모집 설명</label>
                <textarea value={recruitingDescription} onChange={e => setRecruitingDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-text-secondary text-xs mb-1">모집 시작일</label>
                  <input type="date" value={recruitingStartDate?.slice(0, 10) ?? ''} onChange={e => setRecruitingStartDate(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
                </div>
                <div>
                  <label className="block text-text-secondary text-xs mb-1">모집 마감일</label>
                  <input type="date" value={recruitingEndDate?.slice(0, 10) ?? ''} onChange={e => setRecruitingEndDate(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
                </div>
                <div>
                  <label className="block text-text-secondary text-xs mb-1">최대 모집 수</label>
                  <input type="number" value={recruitingMaxCount} onChange={e => setRecruitingMaxCount(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-text-secondary text-xs font-bold uppercase mb-3">진행 단계</p>
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">진행 타이틀</label>
                <input value={progressTitle} onChange={e => setProgressTitle(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">진행 설명</label>
                <textarea value={progressDescription} onChange={e => setProgressDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary text-xs mb-1">진행 시작일</label>
                  <input type="date" value={progressStartDate?.slice(0, 10) ?? ''} onChange={e => setProgressStartDate(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
                </div>
                <div>
                  <label className="block text-text-secondary text-xs mb-1">진행 종료일</label>
                  <input type="date" value={progressEndDate?.slice(0, 10) ?? ''} onChange={e => setProgressEndDate(e.target.value)}
                    className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="text-text-secondary text-xs font-bold uppercase mb-3">완료 단계</p>
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">완료 타이틀</label>
                <input value={completionTitle} onChange={e => setCompletionTitle(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">완료 설명</label>
                <textarea value={completionDescription} onChange={e => setCompletionDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line resize-none" />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">완료일</label>
                <input type="date" value={completionDate?.slice(0, 10) ?? ''} onChange={e => setCompletionDate(e.target.value)}
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => onUpdate(season._id, {
                title,
                recruitingTitle,
                recruitingDescription,
                recruitingStartDate: recruitingStartDate || null,
                recruitingEndDate: recruitingEndDate || null,
                recruitingMaxCount: Number(recruitingMaxCount),
                progressTitle,
                progressDescription,
                progressStartDate: progressStartDate || null,
                progressEndDate: progressEndDate || null,
                completionTitle,
                completionDescription,
                completionDate: completionDate || null,
              })}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-text-primary rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSupportSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await supportService.admin.getSeasons({ limit: 100 })
      setSeasons(data.seasons)
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const data = await supportService.admin.createSeason({ title: newTitle.trim() })
      setSeasons(prev => [data.season, ...prev])
      setNewTitle('')
      setCreating(false)
      showToast('시즌이 생성되었습니다')
    } catch {
      showToast('생성 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Season>) => {
    setSaving(true)
    try {
      const data = await supportService.admin.updateSeason(id, updates)
      setSeasons(prev => prev.map(s => s._id === id ? data.season : s))
      showToast('저장되었습니다')
    } catch {
      showToast('저장 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 시즌을 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await supportService.admin.deleteSeason(id)
      setSeasons(prev => prev.filter(s => s._id !== id))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: Season['status']) => {
    setSaving(true)
    try {
      const data = await supportService.admin.updateSeasonStatus(id, status)
      setSeasons(prev => prev.map(s => s._id === id ? data.season : s))
      showToast('상태가 변경되었습니다')
    } catch {
      showToast('상태 변경 실패', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-text-primary font-bold text-xl">시즌 관리</h1>
            <p className="text-text-secondary text-sm mt-1">인큐베이션 시즌을 생성하고 관리합니다</p>
          </div>
          <button
            onClick={() => setCreating(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-text-primary rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            시즌 추가
          </button>
        </div>

        {creating && (
          <div className="bg-bg-secondary border border-line rounded-xl p-4">
            <p className="text-text-secondary text-xs mb-2">새 시즌 제목</p>
            <div className="flex gap-3">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="시즌 제목 입력"
                className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-line"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !newTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-text-primary rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                생성
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
          </div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">시즌이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {seasons.map(season => (
              <SeasonRow
                key={season._id}
                season={season}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </AdminLayout>
  )
}
