'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Loader2, Sparkles, Layers } from 'lucide-react'
import { partnerService } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { PartnerSkillItem, SKILL_EXPERIENCE_LEVEL_OPTIONS } from './constants'

export default function SkillsSection() {
  const { id, partner, canEdit } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const items: PartnerSkillItem[] = partner.skills || []

  const [name, setName] = useState('')
  const [experienceLevel, setExperienceLevel] = useState(SKILL_EXPERIENCE_LEVEL_OPTIONS[0])

  const saveMutation = useMutation({
    mutationFn: (skills: PartnerSkillItem[]) => partnerService.updateMyProfile({ skills }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] }),
  })

  const addItem = () => {
    if (!name.trim()) return
    const next = [...items, { name: name.trim(), experienceLevel }]
    saveMutation.mutate(next)
    setName('')
  }

  const removeItem = (item: PartnerSkillItem) => {
    saveMutation.mutate(items.filter(i => i !== item))
  }

  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" /> 보유 기술
      </h2>

      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-2 mb-6 bg-bg-tertiary/50 border border-line/60 rounded-xl p-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="기술명을 입력해주세요"
            className="flex-1 bg-bg-card border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}
            className="sm:w-48 bg-bg-card border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
            {SKILL_EXPERIENCE_LEVEL_OPTIONS.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
          <button onClick={addItem} disabled={saveMutation.isPending}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 추가
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[220px] py-10">
          <Layers className="w-9 h-9 text-text-muted opacity-30 mb-3" />
          <p className="text-text-muted text-sm">등록된 기술이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, i) => {
            const tier = SKILL_EXPERIENCE_LEVEL_OPTIONS.indexOf(item.experienceLevel) + 1
            return (
              <div key={item._id || i}
                className="group flex items-center justify-between gap-3 bg-bg-tertiary/50 border border-line rounded-xl px-4 py-3 hover:border-accent/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span key={idx} className={`h-1.5 w-3.5 rounded-full ${idx < tier ? 'bg-accent' : 'bg-line'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">{item.experienceLevel}</span>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => removeItem(item)}
                    className="flex-shrink-0 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
