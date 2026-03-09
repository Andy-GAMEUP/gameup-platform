'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import supportService, { Season, GameApplication } from '@/services/supportService'
import {
  Loader2, ChevronDown, ChevronUp, Save, Trash2, Plus,
} from 'lucide-react'

const APP_STATUS_LABELS: Record<GameApplication['status'], string> = {
  pending: '대기중',
  reviewing: '검토중',
  selected: '선발',
  rejected: '거절',
  'on-hold': '보류',
}

const APP_STATUS_CLS: Record<GameApplication['status'], string> = {
  pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  reviewing: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
  selected: 'bg-green-900/40 text-green-400 border-green-700/50',
  rejected: 'bg-red-900/40 text-red-400 border-red-700/50',
  'on-hold': 'bg-slate-700 text-slate-300 border-slate-600',
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${ok ? 'bg-green-700' : 'bg-red-700'}`}>
      {msg}
    </div>
  )
}

interface MilestoneForm {
  title: string
  date: string
  description: string
  buildUrl: string
  isCompleted: boolean
}

function ApplicationRow({
  app,
  onRefresh,
  saving,
  setSaving,
  showToast,
}: {
  app: GameApplication
  onRefresh: () => void
  saving: boolean
  setSaving: (v: boolean) => void
  showToast: (msg: string, ok?: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(app.status)
  const [adminNote, setAdminNote] = useState(app.adminNote)
  const [gameplay, setGameplay] = useState(String(app.score?.gameplay ?? 0))
  const [design, setDesign] = useState(String(app.score?.design ?? 0))
  const [sound, setSound] = useState(String(app.score?.sound ?? 0))
  const [business, setBusiness] = useState(String(app.score?.business ?? 0))
  const [milestones, setMilestones] = useState(app.milestones ?? [])
  const [newMilestone, setNewMilestone] = useState<MilestoneForm>({
    title: '', date: '', description: '', buildUrl: '', isCompleted: false,
  })
  const [addingMilestone, setAddingMilestone] = useState(false)

  const handleSaveStatus = async () => {
    setSaving(true)
    try {
      await supportService.admin.updateApplicationStatus(app._id, { status, adminNote })
      showToast('저장되었습니다')
    } catch {
      showToast('저장 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirm('이 신청을 확정하시겠습니까?')) return
    setSaving(true)
    try {
      await supportService.admin.confirmApplication(app._id)
      showToast('확정되었습니다')
      onRefresh()
    } catch {
      showToast('확정 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveScore = async () => {
    setSaving(true)
    try {
      await supportService.admin.scoreApplication(app._id, {
        gameplay: Number(gameplay),
        design: Number(design),
        sound: Number(sound),
        business: Number(business),
      })
      showToast('점수가 저장되었습니다')
    } catch {
      showToast('저장 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMilestone = async (idx: number, data: Partial<MilestoneForm>) => {
    setSaving(true)
    try {
      await supportService.admin.updateMilestone(app._id, idx, data)
      setMilestones(prev => prev.map((m, i) => i === idx ? { ...m, ...data } : m))
      showToast('마일스톤이 저장되었습니다')
    } catch {
      showToast('저장 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return
    setSaving(true)
    try {
      await supportService.admin.addMilestone(app._id, newMilestone)
      setMilestones(prev => [...prev, newMilestone])
      setNewMilestone({ title: '', date: '', description: '', buildUrl: '', isCompleted: false })
      setAddingMilestone(false)
      showToast('마일스톤이 추가되었습니다')
    } catch {
      showToast('추가 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMilestone = async (idx: number) => {
    if (!confirm('이 마일스톤을 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await supportService.admin.deleteMilestone(app._id, idx)
      setMilestones(prev => prev.filter((_, i) => i !== idx))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${APP_STATUS_CLS[app.status]}`}>
              {APP_STATUS_LABELS[app.status]}
            </span>
            {app.isConfirmed && (
              <span className="text-xs px-2 py-0.5 rounded-full border bg-green-900/40 text-green-400 border-green-700/50">확정</span>
            )}
            <span className="text-white font-medium text-sm truncate">{app.gameName}</span>
          </div>
          <p className="text-slate-500 text-xs">
            {app.userId?.username} · {app.genre} · {new Date(app.createdAt).toLocaleDateString('ko-KR')}
            {app.score?.total > 0 && ` · 점수: ${app.score.total}`}
          </p>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-6 bg-slate-950/30">
          <div className="grid grid-cols-2 gap-4">
            {app.iconUrl && (
              <div className="col-span-2 flex items-center gap-3">
                <img src={app.iconUrl} alt={app.gameName} className="w-16 h-16 rounded-xl object-cover bg-slate-800" />
                <div>
                  <p className="text-white font-medium">{app.gameName}</p>
                  <p className="text-slate-400 text-sm">{app.genre} · {app.userId?.username}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-slate-500 text-xs mb-1">플랫폼</p>
              <p className="text-slate-300 text-sm">{app.platforms.join(', ') || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">스크린샷</p>
              <p className="text-slate-300 text-sm">{app.screenshots.length}장</p>
            </div>
          </div>

          {app.description && (
            <div>
              <p className="text-slate-500 text-xs mb-1">설명</p>
              <p className="text-slate-300 text-sm leading-relaxed">{app.description}</p>
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <p className="text-slate-400 text-xs font-bold uppercase mb-3">상태 관리</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as GameApplication['status'])}
                  className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none flex-shrink-0"
                >
                  {(Object.keys(APP_STATUS_LABELS) as GameApplication['status'][]).map(s => (
                    <option key={s} value={s}>{APP_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  onClick={handleConfirm}
                  disabled={saving || app.isConfirmed}
                  className="px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  확정
                </button>
              </div>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={2}
                placeholder="관리자 메모"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500 resize-none"
              />
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="text-slate-400 text-xs font-bold uppercase mb-3">점수 입력 (0~100)</p>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-slate-500 text-xs mb-1">게임플레이</label>
                <input type="number" min={0} max={100} value={gameplay} onChange={e => setGameplay(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-slate-500 text-xs mb-1">디자인</label>
                <input type="number" min={0} max={100} value={design} onChange={e => setDesign(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-slate-500 text-xs mb-1">사운드</label>
                <input type="number" min={0} max={100} value={sound} onChange={e => setSound(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-slate-500 text-xs mb-1">비즈니스</label>
                <input type="number" min={0} max={100} value={business} onChange={e => setBusiness(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500" />
              </div>
            </div>
            <button
              onClick={handleSaveScore}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              점수 저장
            </button>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs font-bold uppercase">마일스톤</p>
              <button
                onClick={() => setAddingMilestone(v => !v)}
                className="flex items-center gap-1 text-green-400 hover:text-green-300 text-xs transition-colors"
              >
                <Plus className="w-3 h-3" />추가
              </button>
            </div>

            {addingMilestone && (
              <div className="bg-slate-800/50 rounded-lg p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="제목" value={newMilestone.title}
                    onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
                  <input type="date" value={newMilestone.date}
                    onChange={e => setNewMilestone(p => ({ ...p, date: e.target.value }))}
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
                <textarea placeholder="설명" value={newMilestone.description} rows={2}
                  onChange={e => setNewMilestone(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none resize-none" />
                <input placeholder="빌드 URL" value={newMilestone.buildUrl}
                  onChange={e => setNewMilestone(p => ({ ...p, buildUrl: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newMilestone.isCompleted}
                      onChange={e => setNewMilestone(p => ({ ...p, isCompleted: e.target.checked }))}
                      className="accent-green-500" />
                    <span className="text-slate-300 text-xs">완료됨</span>
                  </label>
                  <button onClick={handleAddMilestone} disabled={saving || !newMilestone.title.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded text-xs transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    추가
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <MilestoneEditRow
                  key={idx}
                  milestone={m}
                  onUpdate={data => handleUpdateMilestone(idx, data)}
                  onDelete={() => handleDeleteMilestone(idx)}
                  saving={saving}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MilestoneEditRow({
  milestone,
  onUpdate,
  onDelete,
  saving,
}: {
  milestone: { title: string; date: string; description: string; buildUrl: string; isCompleted: boolean }
  onUpdate: (data: Partial<{ title: string; date: string; description: string; buildUrl: string; isCompleted: boolean }>) => void
  onDelete: () => void
  saving: boolean
}) {
  const [title, setTitle] = useState(milestone.title)
  const [date, setDate] = useState(milestone.date?.slice(0, 10) ?? '')
  const [description, setDescription] = useState(milestone.description)
  const [buildUrl, setBuildUrl] = useState(milestone.buildUrl)
  const [isCompleted, setIsCompleted] = useState(milestone.isCompleted)

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
      </div>
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none resize-none" />
      <input value={buildUrl} onChange={e => setBuildUrl(e.target.value)} placeholder="빌드 URL"
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isCompleted} onChange={e => setIsCompleted(e.target.checked)} className="accent-green-500" />
          <span className="text-slate-300 text-xs">완료됨</span>
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdate({ title, date, description, buildUrl, isCompleted })} disabled={saving}
            className="p-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} disabled={saving}
            className="p-1.5 text-red-400 hover:text-red-300 transition-colors disabled:opacity-30">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSupportApplicationsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [applications, setApplications] = useState<GameApplication[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supportService.admin.getSeasons({ limit: 100 })
      .then(d => {
        setSeasons(d.seasons)
        if (d.seasons.length > 0) setSelectedSeasonId(d.seasons[0]._id)
      })
      .catch(() => showToast('시즌 불러오기 실패', false))
  }, [])

  const load = useCallback(async () => {
    if (!selectedSeasonId) return
    setLoading(true)
    try {
      const data = await supportService.admin.getApplications({
        seasonId: selectedSeasonId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      })
      setApplications(data.applications)
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [selectedSeasonId, statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white font-bold text-xl">게임 신청 관리</h1>
          <p className="text-slate-400 text-sm mt-1">인큐베이션 게임 신청을 검토하고 관리합니다</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedSeasonId}
            onChange={e => setSelectedSeasonId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
          >
            {seasons.map(s => (
              <option key={s._id} value={s._id}>{s.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-slate-500"
          >
            <option value="all">전체</option>
            {(Object.keys(APP_STATUS_LABELS) as GameApplication['status'][]).map(s => (
              <option key={s} value={s}>{APP_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">신청이 없습니다</div>
        ) : (
          <div className="space-y-3">
            {applications.map(app => (
              <ApplicationRow
                key={app._id}
                app={app}
                onRefresh={load}
                saving={saving}
                setSaving={setSaving}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </AdminLayout>
  )
}
