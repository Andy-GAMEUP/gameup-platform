'use client'
import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/AdminLayout'
import minihomeService, { KeywordGroup } from '@/services/minihomeService'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Save, Loader2, GripVertical, X } from 'lucide-react'

interface KeywordItem {
  name: string
  isActive: boolean
}

interface SortableGroupCardProps {
  group: KeywordGroup
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onUpdateGroup: (id: string, updates: { name?: string; keywords?: KeywordItem[] }) => void
  onDeleteGroup: (id: string) => void
  onGroupChange: (updatedGroup: KeywordGroup) => void
  saving: boolean
}

function SortableGroupCard({
  group,
  expandedId,
  setExpandedId,
  onUpdateGroup,
  onDeleteGroup,
  onGroupChange,
  saving,
}: SortableGroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: group._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const handleAddKeyword = () => {
    onGroupChange({ ...group, keywords: [...group.keywords, { name: '', isActive: true }] })
  }

  const handleRemoveKeyword = (idx: number) => {
    onGroupChange({ ...group, keywords: group.keywords.filter((_, i) => i !== idx) })
  }

  const handleUpdateKeyword = (idx: number, updates: Partial<KeywordItem>) => {
    onGroupChange({
      ...group,
      keywords: group.keywords.map((k, i) => (i === idx ? { ...k, ...updates } : k)),
    })
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-400 transition-colors flex-shrink-0"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={group.name}
          onChange={e => onGroupChange({ ...group, name: e.target.value })}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-slate-500"
          placeholder="그룹 이름"
        />

        <button
          onClick={() => onUpdateGroup(group._id, { name: group.name, keywords: group.keywords })}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          저장
        </button>

        <button
          onClick={() => onDeleteGroup(group._id)}
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

      {expandedId === group._id && (
        <div className="p-4 space-y-3 bg-slate-950/50">
          {group.keywords.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">키워드가 없습니다</p>
          ) : (
            group.keywords.map((keyword, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3">
                <input
                  type="text"
                  value={keyword.name}
                  onChange={e => handleUpdateKeyword(idx, { name: e.target.value })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-slate-500"
                  placeholder="키워드 이름"
                />

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keyword.isActive}
                    onChange={e => handleUpdateKeyword(idx, { isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-600 focus:ring-0"
                  />
                  <span className="text-slate-300 text-xs">활성</span>
                </label>

                <button
                  onClick={() => handleRemoveKeyword(idx)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  title="삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          <button
            onClick={handleAddKeyword}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            키워드 추가
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminMiniHomeKeywordsPage() {
  const [groups, setGroups] = useState<KeywordGroup[]>([])
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
      const data = await minihomeService.admin.getKeywordGroups()
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
      const newGroup = await minihomeService.admin.createKeywordGroup({
        name: '새 키워드 그룹',
        keywords: [],
        sortOrder: groups.length,
      })
      setGroups(prev => [...prev, newGroup])
      setExpandedId(newGroup._id)
      showToast('그룹이 추가되었습니다')
    } catch {
      showToast('추가 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGroup = async (id: string, updates: { name?: string; keywords?: KeywordItem[] }) => {
    setSaving(true)
    try {
      await minihomeService.admin.updateKeywordGroup(id, updates)
      setGroups(prev => prev.map(g => g._id === id ? { ...g, ...updates } : g))
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
      await minihomeService.admin.deleteKeywordGroup(id)
      setGroups(prev => prev.filter(g => g._id !== id))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleGroupChange = (updatedGroup: KeywordGroup) => {
    setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (saving) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = groups.findIndex(g => g._id === active.id)
    const newIndex = groups.findIndex(g => g._id === over.id)
    const newGroups = arrayMove(groups, oldIndex, newIndex)
    const prevGroups = groups

    setGroups(newGroups)
    setSaving(true)
    try {
      await minihomeService.admin.reorderKeywordGroups(
        newGroups.map((g, i) => ({ id: g._id, sortOrder: i }))
      )
      showToast('순서가 변경되었습니다')
    } catch {
      setGroups(prevGroups)
      showToast('순서 변경 실패', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">미니홈 키워드 관리</h1>
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
            <p className="text-sm">키워드 그룹이 없습니다</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map(g => g._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {groups.map(group => (
                  <SortableGroupCard
                    key={group._id}
                    group={group}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    onUpdateGroup={handleUpdateGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onGroupChange={handleGroupChange}
                    saving={saving}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
