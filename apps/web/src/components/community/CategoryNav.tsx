'use client'
import { Clock, ThumbsUp, TrendingUp, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'new-game-intro', label: '신작게임소개' },
  { value: 'beta-game', label: '베타게임' },
  { value: 'live-game', label: '라이브게임' },
  { value: 'free', label: '자유게시판' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순', icon: Clock },
  { value: 'popular', label: '인기순', icon: ThumbsUp },
  { value: 'trending', label: '추천순', icon: TrendingUp },
]

interface CategoryNavProps {
  selected: string
  onChange: (channel: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
}

export default function CategoryNav({ selected, onChange, sortBy, onSortChange }: CategoryNavProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const currentSort = SORT_OPTIONS.find(s => s.value === sortBy) || SORT_OPTIONS[0]

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex items-center justify-between border-b border-line dark:border-line">
      {/* 카테고리 탭 */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              selected === cat.value
                ? 'border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400'
                : 'border-transparent text-text-muted dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 정렬 드롭다운 */}
      <div className="relative flex-shrink-0" ref={sortRef}>
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-text-muted dark:text-text-secondary hover:text-text-secondary dark:hover:text-text-primary transition-colors"
        >
          <currentSort.icon className="w-3.5 h-3.5" />
          {currentSort.label}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-bg-card dark:bg-bg-secondary border border-line dark:border-line rounded-lg shadow-lg z-20 py-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onSortChange(opt.value); setSortOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  sortBy === opt.value
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                    : 'text-text-muted dark:text-text-secondary hover:bg-bg-tertiary dark:hover:bg-bg-tertiary'
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" /> {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
