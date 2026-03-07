'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { playerService, ScrapItem } from '@/services/playerService'

type FilterType = 'all' | 'game' | 'community'

const TYPE_LABELS: Record<string, string> = {
  game: '게임',
  community: '커뮤니티',
  partner: '파트너',
  minihome: '미니홈',
  solution: '솔루션',
}

const TYPE_COLORS: Record<string, string> = {
  game: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  community: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  partner: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  minihome: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  solution: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

function getTargetHref(scrap: ScrapItem): string {
  if (scrap.targetType === 'game') return `/games/${scrap.targetId}`
  if (scrap.targetType === 'community') return `/community/${scrap.targetId}`
  return '#'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TABS: { label: string; value: FilterType }[] = [
  { label: '전체', value: 'all' },
  { label: '게임', value: 'game' },
  { label: '커뮤니티', value: 'community' },
]

export default function ScrapPage() {
  const [activeType, setActiveType] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['scraps', activeType, page],
    queryFn: () =>
      playerService.getMyAllScraps({
        type: activeType === 'all' ? undefined : activeType,
        page,
        limit: LIMIT,
      }),
  })

  const handleTabChange = (tab: FilterType) => {
    setActiveType(tab)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">내 스크랩</h1>
        <p className="text-slate-400 text-sm mb-8">저장한 게임, 커뮤니티 글을 한 곳에서 확인하세요.</p>

        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeType === tab.value
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-slate-500">
            <p>스크랩 목록을 불러오지 못했습니다.</p>
          </div>
        )}

        {!isLoading && !isError && data && data.scraps.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg mb-2">스크랩한 항목이 없습니다.</p>
            <p className="text-slate-600 text-sm">게임이나 커뮤니티 글에서 스크랩 버튼을 눌러보세요.</p>
          </div>
        )}

        {!isLoading && !isError && data && data.scraps.length > 0 && (
          <>
            <div className="space-y-3">
              {data.scraps.map((scrap) => (
                <ScrapCard key={scrap._id} scrap={scrap} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm"
                >
                  이전
                </button>
                <span className="px-4 py-2 text-sm text-slate-400">
                  {page} / {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ScrapCard({ scrap }: { scrap: ScrapItem }) {
  const href = getTargetHref(scrap)
  const title = scrap.target?.title ?? '(삭제된 항목)'
  const typeLabel = TYPE_LABELS[scrap.targetType] ?? scrap.targetType
  const typeColor = TYPE_COLORS[scrap.targetType] ?? 'bg-slate-700/50 text-slate-300 border-slate-600'

  return (
    <Link href={href} className="block">
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-white font-medium truncate">{title}</span>
        </div>
        <span className="shrink-0 text-slate-500 text-xs">{formatDate(scrap.createdAt)}</span>
      </div>
    </Link>
  )
}
