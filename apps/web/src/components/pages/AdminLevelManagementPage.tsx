'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService, { LevelData } from '@/services/adminService'
import { Loader2, Save, Award } from 'lucide-react'

const DEFAULT_LEVELS: LevelData[] = [
  { level: 1, name: '새싹', minScore: 0, memberCount: 0 },
  { level: 2, name: '씨앗', minScore: 10, memberCount: 0 },
  { level: 3, name: '새내기', minScore: 30, memberCount: 0 },
  { level: 4, name: '입문자', minScore: 60, memberCount: 0 },
  { level: 5, name: '활동가', minScore: 100, memberCount: 0 },
  { level: 6, name: '일반', minScore: 150, memberCount: 0 },
  { level: 7, name: '열정', minScore: 210, memberCount: 0 },
  { level: 8, name: '도전자', minScore: 280, memberCount: 0 },
  { level: 9, name: '숙련자', minScore: 360, memberCount: 0 },
  { level: 10, name: '고수', minScore: 450, memberCount: 0 },
  { level: 11, name: '전문가', minScore: 550, memberCount: 0 },
  { level: 12, name: '달인', minScore: 660, memberCount: 0 },
  { level: 13, name: '마스터', minScore: 780, memberCount: 0 },
  { level: 14, name: '그랜드마스터', minScore: 910, memberCount: 0 },
  { level: 15, name: '챔피언', minScore: 1050, memberCount: 0 },
  { level: 16, name: '레전드', minScore: 1200, memberCount: 0 },
  { level: 17, name: '신화', minScore: 1360, memberCount: 0 },
  { level: 18, name: '불멸', minScore: 1530, memberCount: 0 },
]

const LEVEL_ICONS = ['🌱', '🌿', '🍀', '🌸', '⭐', '🌟', '💫', '🔥', '💎', '👑', '🏆', '🎯', '⚡', '🌈', '🦅', '🐉', '🌌', '✨']

export default function AdminLevelManagementPage() {
  const [levels, setLevels] = useState<LevelData[]>(DEFAULT_LEVELS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminService.getLevels()
      .then(res => {
        const d = (res?.data ?? res) as LevelData[]
        if (Array.isArray(d) && d.length > 0) setLevels(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const updateLevel = (index: number, key: keyof LevelData, value: string | number) => {
    setLevels(prev => prev.map((l, i) => i === index ? { ...l, [key]: value } : l))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateLevels(levels)
      alert('저장되었습니다.')
    } catch {
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-accent-text" />
          <h2 className="text-text-primary text-xl font-bold">레벨 관리</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>

        <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-text-secondary font-medium px-4 py-3 w-20">등급</th>
                  <th className="text-center text-text-secondary font-medium px-4 py-3 w-16">아이콘</th>
                  <th className="text-right text-text-secondary font-medium px-4 py-3 w-24">회원수</th>
                  <th className="text-left text-text-secondary font-medium px-4 py-3">명칭</th>
                  <th className="text-right text-text-secondary font-medium px-4 py-3">누적 활동 점수 기준</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {levels.map((level, i) => (
                  <tr key={level.level} className="hover:bg-bg-tertiary/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-violet-400 font-bold">Lv.{level.level}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={level.icon ?? LEVEL_ICONS[i] ?? '⭐'}
                        onChange={e => updateLevel(i, 'icon', e.target.value)}
                        className="bg-bg-tertiary border border-line rounded px-2 py-1 text-text-primary text-base focus:outline-none"
                      >
                        {LEVEL_ICONS.map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-text-secondary">{(level.memberCount ?? 0).toLocaleString()}명</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={level.name}
                        onChange={e => updateLevel(i, 'name', e.target.value)}
                        className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent w-full max-w-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min={0}
                          value={level.minScore}
                          onChange={e => updateLevel(i, 'minScore', Number(e.target.value))}
                          className="bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-text-primary text-sm focus:outline-none focus:border-accent w-32 text-right"
                        />
                        <span className="text-text-secondary text-sm">점</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
