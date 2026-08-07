'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Loader2, History as HistoryIcon, CalendarClock } from 'lucide-react'
import { partnerService } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { PartnerHistoryItem } from './constants'

function sortKey(item: PartnerHistoryItem) {
  return `${item.year.padStart(4, '0')}-${item.month.padStart(2, '0')}`
}

export default function HistorySection() {
  const { id, partner, canEdit } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const items: PartnerHistoryItem[] = partner.history || []

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [description, setDescription] = useState('')

  const saveMutation = useMutation({
    mutationFn: (history: PartnerHistoryItem[]) => partnerService.updateMyProfile({ history }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] }),
  })

  const groups = useMemo(() => {
    const sorted = [...items].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    const result: { year: string; entries: PartnerHistoryItem[] }[] = []
    for (const item of sorted) {
      const last = result[result.length - 1]
      if (last && last.year === item.year) last.entries.push(item)
      else result.push({ year: item.year, entries: [item] })
    }
    return result
  }, [items])

  const addItem = () => {
    if (!year.trim() || !description.trim()) return
    const next = [...items, { year: year.trim(), month: month.trim(), description: description.trim() }]
    saveMutation.mutate(next)
    setYear(''); setMonth(''); setDescription('')
  }

  const removeItem = (item: PartnerHistoryItem) => {
    saveMutation.mutate(items.filter(i => i !== item))
  }

  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4 flex items-center gap-2">
        <HistoryIcon className="w-4 h-4 text-accent" /> 회사 연혁
      </h2>

      {canEdit && (
        <form onSubmit={e => { e.preventDefault(); addItem() }}
          className="flex flex-col sm:flex-row gap-2 mb-8 bg-bg-tertiary/50 border border-line/60 rounded-xl p-3">
          <div className="relative sm:w-28">
            <input value={year} onChange={e => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="연도 (예: 2017)" inputMode="numeric"
              className="w-full bg-bg-card border border-line rounded-lg pl-3 pr-7 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
            {year && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">년</span>}
          </div>
          <div className="relative sm:w-20">
            <input value={month} onChange={e => setMonth(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="월 (예: 05)" inputMode="numeric"
              className="w-full bg-bg-card border border-line rounded-lg pl-3 pr-7 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
            {month && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">월</span>}
          </div>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="연혁 내용을 입력해주세요"
            className="flex-1 bg-bg-card border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
          <button type="submit" disabled={saveMutation.isPending}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 추가
          </button>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[220px] py-10">
          <CalendarClock className="w-9 h-9 text-text-muted opacity-30 mb-3" />
          <p className="text-text-muted text-sm">등록된 연혁이 없습니다.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/50 via-line to-transparent" />
          <div className="space-y-7">
            {groups.map(group => (
              <div key={group.year} className="relative pl-7">
                <span className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full bg-accent ring-4 ring-accent/15" />
                <div className="text-accent font-bold text-base mb-2.5 tracking-tight">{group.year.padStart(4, '0')}년</div>
                <div className="space-y-2.5">
                  {group.entries.map((item, i) => (
                    <div key={item._id || i} className="group flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 w-11 text-center text-xs font-medium text-text-muted bg-bg-tertiary rounded-md px-1.5 py-0.5">
                        {item.month ? `${item.month}월` : '-'}
                      </span>
                      <span className="text-sm text-text-secondary leading-relaxed break-words">{item.description}</span>
                      {canEdit && (
                        <button onClick={() => removeItem(item)} title="삭제"
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-danger/10 border border-danger/20 text-danger opacity-0 group-hover:opacity-100 hover:bg-danger/20 transition-colors">
                          <X className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
