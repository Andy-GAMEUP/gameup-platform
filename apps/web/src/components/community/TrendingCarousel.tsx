'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Flame, Users, FileText, ChevronLeft, ChevronRight, ThumbsUp } from 'lucide-react'
import type { PostSummary, HotGame } from '@/services/communityService'

interface TrendingCarouselProps {
  hotPosts: (PostSummary & { likeCount: number })[]
  hotGames: HotGame[]
}

type TabType = 'posts' | 'games'

export default function TrendingCarousel({ hotPosts, hotGames }: TrendingCarouselProps) {
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  const items = activeTab === 'posts' ? hotPosts : hotGames
  const maxIndex = Math.max(0, items.length - 1)

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const cardWidth = container.firstElementChild
      ? (container.firstElementChild as HTMLElement).offsetWidth + 12
      : 280
    container.scrollTo({ left: cardWidth * index, behavior: 'smooth' })
    setCurrentIndex(index)
  }, [])

  // 자동 스크롤
  useEffect(() => {
    if (items.length <= 1) return
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev >= maxIndex ? 0 : prev + 1
        scrollToIndex(next)
        return next
      })
    }, 5000)
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current) }
  }, [items.length, maxIndex, scrollToIndex])

  const handlePrev = () => {
    const next = currentIndex <= 0 ? maxIndex : currentIndex - 1
    scrollToIndex(next)
  }

  const handleNext = () => {
    const next = currentIndex >= maxIndex ? 0 : currentIndex + 1
    scrollToIndex(next)
  }

  // 탭 변경 시 인덱스 리셋
  useEffect(() => { setCurrentIndex(0); scrollToIndex(0) }, [activeTab, scrollToIndex])

  if (hotPosts.length === 0 && hotGames.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 rounded-2xl p-4 border border-violet-100 dark:border-violet-900/40">
      {/* 캐러셀 */}
      <div className="relative group">
        {/* 이전 */}
        <button onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 rounded-full bg-bg-card dark:bg-bg-tertiary shadow-md flex items-center justify-center text-text-muted hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 카드 리스트 */}
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2">
          {activeTab === 'posts' ? (
            hotPosts.map((post, i) => (
              <Link key={post._id} href={`/community/${post._id}`}
                className="snap-start flex-shrink-0 w-[220px] sm:w-[260px] bg-bg-card dark:bg-bg-secondary rounded-xl p-3 sm:p-4 border border-line dark:border-line hover:border-violet-400 dark:hover:border-violet-500 transition-colors group/card">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-violet-600 dark:text-violet-400' : i === 1 ? 'text-purple-500' : 'text-text-secondary'}`}>
                    {i + 1}
                  </span>
                  <Flame className={`w-4 h-4 ${i === 0 ? 'text-orange-500' : 'text-text-secondary'}`} />
                </div>
                <h4 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover/card:text-accent transition-colors">
                  {post.title}
                </h4>
                <div className="flex items-center gap-2 mt-2 text-xs text-text-muted dark:text-text-secondary">
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
                  <span className="flex items-center gap-1">💬 {post.commentCount}</span>
                </div>
              </Link>
            ))
          ) : (
            hotGames.map((game, i) => (
              <div key={game._id}
                className="snap-start flex-shrink-0 w-[220px] sm:w-[260px] bg-bg-card dark:bg-bg-secondary rounded-xl p-3 sm:p-4 border border-line dark:border-line hover:border-violet-400 dark:hover:border-violet-500 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg font-bold ${i === 0 ? 'text-violet-600 dark:text-violet-400' : 'text-text-secondary'}`}>
                    {i + 1}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-text-primary line-clamp-1">
                  {game.gameTitle || '게임'}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-text-muted dark:text-text-secondary">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{game.totalLikes}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{game.postCount}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 다음 */}
        <button onClick={handleNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 rounded-full bg-bg-card dark:bg-bg-tertiary shadow-md flex items-center justify-center text-text-muted hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 인디케이터 도트 */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {items.map((_, i) => (
            <button key={i} onClick={() => scrollToIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-accent' : 'bg-bg-tertiary'}`} />
          ))}
        </div>
      )}

      {/* 하단 선택 탭 */}
      <div className="flex justify-center gap-2 mt-3">
        <button onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'posts'
              ? 'bg-violet-600 text-text-primary'
              : 'bg-bg-card dark:bg-bg-tertiary text-text-muted dark:text-text-secondary hover:text-violet-600'
          }`}>
          <Flame className="w-3 h-3" /> 인기 글
        </button>
        <button onClick={() => setActiveTab('games')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'games'
              ? 'bg-violet-600 text-text-primary'
              : 'bg-bg-card dark:bg-bg-tertiary text-text-muted dark:text-text-secondary hover:text-violet-600'
          }`}>
          <Users className="w-3 h-3" /> 인기 커뮤니티
        </button>
      </div>
    </div>
  )
}
