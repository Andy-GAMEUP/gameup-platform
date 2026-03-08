'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import partnerService, { TopicGroup, TopicItem } from '@/services/partnerService'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2, GripVertical, X } from 'lucide-react'

export default function AdminPartnerTopicsPage() {
  const [groups, setGroups] = useState<TopicGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await partnerService.admin.getTopicGroups()
      setGroups(data.groups || [])
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAddGroup = async () => {
    setSaving(true)
    try {
      const newGroup = await partnerService.admin.createTopicGroup({
        name: '새 주제 그룹',
        topics: [],
        sortOrder: groups.length,
      })
      setGroups([...groups, newGroup])
      setExpandedId(newGroup._id)
      showToast('그룹이 추가되었습니다')
    } catch {
      showToast('추가 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGroup = async (id: string, updates: { name?: string; topics?: TopicItem[] }) => {
    setSaving(true)
    try {
      await partnerService.admin.updateTopicGroup(id, updates)
      setGroups(groups.map(g => g._id === id ? { ...g, ...updates } : g))
      showToast('저장되었습니다')
    } catch {
      showToast('저장 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('이 그룹을 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await partnerService.admin.deleteTopicGroup(id)
      setGroups(groups.filter(g => g._id !== id))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newGroups = [...groups]
    ;[newGroups[index - 1], newGroups[index]] = [newGroups[index], newGroups[index - 1]]
    
    setSaving(true)
    try {
      await partnerService.admin.reorderTopicGroups(
        newGroups.map((g, i) => ({ id: g._id, sortOrder: i }))
      )
      setGroups(newGroups)
      showToast('순서가 변경되었습니다')
    } catch {
      showToast('순서 변경 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === groups.length - 1) return
    const newGroups = [...groups]
    ;[newGroups[index], newGroups[index + 1]] = [newGroups[index + 1], newGroups[index]]
    
    setSaving(true)
    try {
      await partnerService.admin.reorderTopicGroups(
        newGroups.map((g, i) => ({ id: g._id, sortOrder: i }))
      )
      setGroups(newGroups)
      showToast('순서가 변경되었습니다')
    } catch {
      showToast('순서 변경 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTopic = (groupId: string) => {
    setGroups(groups.map(g => 
      g._id === groupId 
        ? { ...g, topics: [...g.topics, { name: '', isActive: true }] }
        : g
    ))
  }

  const handleRemoveTopic = (groupId: string, topicIndex: number) => {
    setGroups(groups.map(g =>
      g._id === groupId
        ? { ...g, topics: g.topics.filter((_, i) => i !== topicIndex) }
        : g
    ))
  }

  const handleUpdateTopic = (groupId: string, topicIndex: number, updates: Partial<TopicItem>) => {
    setGroups(groups.map(g =>
      g._id === groupId
        ? {
            ...g,
            topics: g.topics.map((t, i) =>
              i === topicIndex ? { ...t, ...updates } : t
            ),
          }
        : g
    ))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">주제 관리</h1>
            <p className="text-slate-400 text-sm mt-1">총 {groups.length}개 그룹</p>
          </div>
          <button
            onClick={handleAddGroup}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            그룹 추가
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">주제 그룹이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, idx) => (
              <div key={group._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-800">
                  <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => setGroups(groups.map(g => g._id === group._id ? { ...g, name: e.target.value } : g))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
                    placeholder="그룹 이름"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0 || saving}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === groups.length - 1 || saving}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleUpdateGroup(group._id, { name: group.name, topics: group.topics })}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    저장
                  </button>

                  <button
                    onClick={() => handleDeleteGroup(group._id)}
                    disabled={saving}
                    className="p-1.5 text-red-400 hover:text-red-300 disabled:opacity-30 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpandedId(expandedId === group._id ? null : group._id)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedId === group._id ? '▼' : '▶'}
                  </button>
                </div>

                {/* Topics */}
                {expandedId === group._id && (
                  <div className="p-4 space-y-3 bg-slate-950/50">
                    {group.topics.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">주제가 없습니다</p>
                    ) : (
                      group.topics.map((topic, topicIdx) => (
                        <div key={topicIdx} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3">
                          <input
                            type="text"
                            value={topic.name}
                            onChange={(e) => handleUpdateTopic(group._id, topicIdx, { name: e.target.value })}
                            className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-slate-500"
                            placeholder="주제 이름"
                          />
                          
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={topic.isActive}
                              onChange={(e) => handleUpdateTopic(group._id, topicIdx, { isActive: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-600 focus:ring-0"
                            />
                            <span className="text-slate-300 text-xs">활성</span>
                          </label>

                          <button
                            onClick={() => handleRemoveTopic(group._id, topicIdx)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}

                    <button
                      onClick={() => handleAddTopic(group._id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      주제 추가
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
