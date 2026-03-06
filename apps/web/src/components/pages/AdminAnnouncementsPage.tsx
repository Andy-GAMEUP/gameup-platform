'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService, { Announcement } from '@/services/adminService'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  notice: { label: '공지', color: 'text-blue-400' },
  event: { label: '이벤트', color: 'text-purple-400' },
  maintenance: { label: '점검', color: 'text-yellow-400' },
  update: { label: '업데이트', color: 'text-green-400' },
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: '낮음', color: 'text-slate-400' },
  normal: { label: '보통', color: 'text-blue-400' },
  high: { label: '높음', color: 'text-orange-400' },
  urgent: { label: '긴급', color: 'text-red-400' },
}

const emptyForm: {
  title: string
  content: string
  type: 'notice' | 'event' | 'maintenance' | 'update'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isPinned: boolean
  isPublished: boolean
  targetRole: 'all' | 'developer' | 'player'
  expiresAt: string
} = {
  title: '',
  content: '',
  type: 'notice',
  priority: 'normal',
  isPinned: false,
  isPublished: false,
  targetRole: 'all',
  expiresAt: ''
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await adminService.getAnnouncements({ limit: 20 })
      setAnnouncements(data.announcements)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const openNew = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditTarget(a)
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      targetRole: a.targetRole,
      expiresAt: a.expiresAt ? a.expiresAt.substring(0, 10) : ''
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.content) return
    try {
      const payload = {
        ...form,
        expiresAt: form.expiresAt || undefined
      }
      if (editTarget) {
        await adminService.updateAnnouncement(editTarget._id, payload)
      } else {
        await adminService.createAnnouncement(payload)
      }
      setShowForm(false)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await adminService.deleteAnnouncement(id)
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">공지사항 관리</h2>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">총 {total}건</span>
            <button onClick={openNew} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              + 공지 작성
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 w-8">📌</th>
                <th className="text-left px-4 py-3">제목</th>
                <th className="text-left px-4 py-3">유형</th>
                <th className="text-left px-4 py-3">우선순위</th>
                <th className="text-left px-4 py-3">대상</th>
                <th className="text-left px-4 py-3">게시 상태</th>
                <th className="text-left px-4 py-3">작성일</th>
                <th className="text-left px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">로딩 중...</td></tr>
              ) : announcements.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-500">공지사항이 없습니다</td></tr>
              ) : announcements.map((a) => {
                const tl = TYPE_LABELS[a.type] || { label: a.type, color: 'text-slate-400' }
                const pl = PRIORITY_LABELS[a.priority] || { label: a.priority, color: 'text-slate-400' }
                return (
                  <tr key={a._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-yellow-400">{a.isPinned ? '📌' : ''}</td>
                    <td className="px-4 py-3 text-white font-medium">{a.title}</td>
                    <td className={`px-4 py-3 ${tl.color} text-xs`}>{tl.label}</td>
                    <td className={`px-4 py-3 ${pl.color} text-xs`}>{pl.label}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{{ all: '전체', developer: '개발자', player: '플레이어' }[a.targetRole]}</td>
                    <td className="px-4 py-3">
                      {a.isPublished ? (
                        <span className="text-green-400 text-xs">게시됨</span>
                      ) : (
                        <span className="text-slate-500 text-xs">미게시</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(a.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(a)} className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-600/40 transition-colors">편집</button>
                        <button onClick={() => handleDelete(a._id)} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600/40 transition-colors">삭제</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 작성/편집 패널 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">{editTarget ? '공지사항 편집' : '공지사항 작성'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1">제목 *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" placeholder="공지사항 제목" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">내용 *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" placeholder="공지사항 내용..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">유형</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
                    <option value="notice">공지</option>
                    <option value="event">이벤트</option>
                    <option value="maintenance">점검</option>
                    <option value="update">업데이트</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">우선순위</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
                    <option value="low">낮음</option>
                    <option value="normal">보통</option>
                    <option value="high">높음</option>
                    <option value="urgent">긴급</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">대상</label>
                  <select value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value as typeof form.targetRole })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm">
                    <option value="all">전체</option>
                    <option value="developer">개발자</option>
                    <option value="player">플레이어</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">만료일 (선택)</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="accent-red-500" />
                  <span className="text-slate-300 text-sm">상단 고정</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="accent-red-500" />
                  <span className="text-slate-300 text-sm">즉시 게시</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium text-sm transition-colors">{editTarget ? '저장' : '작성'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-700 text-slate-400 hover:text-white py-2 rounded text-sm transition-colors">취소</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
