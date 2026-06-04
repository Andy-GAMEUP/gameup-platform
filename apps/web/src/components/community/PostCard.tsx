'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, ThumbsUp, MessageSquare, Bookmark, Star, Flame, Film } from 'lucide-react'
import LevelBadge from '@/components/LevelBadge'
import type { PostSummary } from '@/services/communityService'
import { getRelativeTime } from '@/lib/relativeTime'

const CHANNEL_MAP: Record<string, { label: string; className: string }> = {
  notice:           { label: '공지', className: 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' },
  'new-game-intro': { label: '신작게임소개', className: 'bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300' },
  free:             { label: '자유게시판', className: 'bg-bg-tertiary text-text-secondary' },
  'beta-game':      { label: '베타게임', className: 'bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300' },
  'live-game':      { label: '라이브게임', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-300' },
  // 레거시 채널 하위 호환
  general:          { label: '일반', className: 'bg-bg-tertiary text-text-secondary' },
  dev:              { label: '개발', className: 'bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300' },
  daily:            { label: '일상', className: 'bg-green-100 text-green-700 dark:bg-accent/30 dark:text-accent' },
  'game-talk':      { label: '게임토크', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600/30 dark:text-yellow-300' },
  'info-share':     { label: '정보공유', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-600/30 dark:text-cyan-300' },
  'new-game':       { label: '신작', className: 'bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-300' },
}

export type ViewMode = 'large' | 'medium' | 'small'

interface PostCardProps {
  post: PostSummary
  currentUserId?: string
  priority?: boolean
  viewMode?: ViewMode
  onGameClick?: (gameId: string, gameTitle: string, serviceType?: string) => void
  /** 링크 URL 오버라이드 (공지사항 등) */
  href?: string
  /** 뒤로가기 버튼에 표시할 탭 이름 */
  fromLabel?: string
}

export default function PostCard({ post, currentUserId, priority = false, viewMode = 'large', onGameClick, href, fromLabel }: PostCardProps) {
  const router = useRouter()
  const ch = CHANNEL_MAP[post.channel] || CHANNEL_MAP.free
  const backLabel = fromLabel ?? ch.label
  const cardHref = href ?? `/community/${post._id}?from=${encodeURIComponent(backLabel)}`
  const textPreview = post.content.replace(/<[^>]*>/g, '').slice(0, 200)
  const thumbnailIdx = post.thumbnailIndex || 0
  const thumbnailImg = post.images?.[thumbnailIdx] || post.images?.[0]

  // ── 소형 카드 (리스트형) ──
  if (viewMode === 'small') {
    const d = new Date(post.createdAt)
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`


    return (
      <Link href={cardHref}
        className={`flex items-center gap-3 bg-bg-card dark:bg-bg-secondary border rounded-xl px-4 py-3 hover:shadow-md dark:hover:border-violet-500/40 transition-all group
          ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
          ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

        {/* 썸네일 */}
        {thumbnailImg && (
          <div className="relative w-[73px] h-[73px] rounded-lg overflow-hidden flex-shrink-0 bg-bg-tertiary">
            <Image src={thumbnailImg} alt="" fill className="object-cover" unoptimized priority={priority} />
          </div>
        )}

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          {/* 1줄: 제목 / 레벨 / 날짜 */}
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
              {post.isPinned && <Star className="w-3 h-3 text-violet-500 inline mr-1 flex-shrink-0" />}
              {post.isHot && <Flame className="w-3 h-3 text-orange-500 inline mr-1 flex-shrink-0" />}
              {post.title}
            </h3>
            {post.gameId
              ? <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300">{post.gameId.title}</span>
              : <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${ch.className}`}>{ch.label}</span>
            }
            <div className="flex-1" />
            <span className="text-xs text-text-muted flex-shrink-0 tabular-nums whitespace-nowrap">{dateStr}</span>
          </div>
          {/* 2줄: 작성자 / 레벨 / 본 수 / 좋아요 / 댓글 */}
          <div className="flex items-center gap-2 mt-[5px] text-[11px] text-text-muted">
            <span className="text-[18px] text-text-secondary">{post.author?.username}</span>
            <LevelBadge level={post.author?.level} size="xs" />
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
          </div>
        </div>
      </Link>
    )
  }

  // ── 중형 카드 (가로형) ──
  if (viewMode === 'medium') {
    return (
      <Link href={cardHref}
        className={`flex bg-bg-card dark:bg-bg-secondary border rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group
          ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
          ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

        {/* 좌측: 썸네일 */}
        {thumbnailImg && (
          <div className="relative w-40 sm:w-48 lg:w-56 flex-shrink-0 bg-bg-tertiary">
            <Image src={thumbnailImg} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={priority} />
            {post.videoUrl && (
              <span className="absolute top-2 left-2 bg-violet-600/90 text-text-primary text-[10px] px-2 py-0.5 rounded flex items-center gap-0.5 backdrop-blur-sm">
                <Film className="w-2.5 h-2.5" />동영상
              </span>
            )}
          </div>
        )}

        {/* 우측: 콘텐츠 */}
        <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-between">
          <div>
            {/* 작성자 + 배지 */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                post.author?.role === 'admin' ? 'bg-violet-600 text-text-primary' :
                post.author?.role === 'developer' ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary'
              }`}>
                {(post.author?.username || '?')[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium text-text-primary">{post.author?.username}</span>
              <LevelBadge level={post.author?.level} />
              <div className="flex-1" />
              <span className="text-[11px] text-text-secondary flex-shrink-0">{getRelativeTime(post.createdAt)}</span>
            </div>

            {/* 배지 + 제목 */}
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {post.isPinned && (
                <span className="bg-violet-100 dark:bg-violet-600/30 text-violet-700 dark:text-violet-300 text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" />고정
                </span>
              )}
              {post.isHot && (
                <span className="bg-orange-100 dark:bg-orange-600/30 text-orange-700 dark:text-orange-300 text-[10px] px-1 py-0.5 rounded flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" />HOT
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ch.className}`}>{ch.label}</span>
            </div>

            <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-1 mb-0.5">
              {post.title}
            </h3>
            <p className="text-xs text-text-muted dark:text-text-secondary line-clamp-2">{textPreview}</p>
          </div>

          {/* 하단 통계 */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-line text-[11px] text-text-secondary">
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
            <span className="ml-auto flex items-center gap-0.5"><Bookmark className="w-3 h-3" />{post.bookmarkCount}</span>
          </div>
        </div>
      </Link>
    )
  }

  // ── 대형 카드 (기존 기본) ──
  return (
    <Link href={cardHref}
      className={`block bg-bg-card dark:bg-bg-secondary border rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group
        ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
        ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

      {/* 썸네일 이미지 (대형) */}
      {thumbnailImg && (
        <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
          <Image src={thumbnailImg} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={priority} />
          {/* 동영상 배지 */}
          {post.videoUrl && (
            <span className="absolute top-3 left-3 bg-violet-600/90 text-text-primary text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
              <Film className="w-3 h-3" />동영상
            </span>
          )}
        </div>
      )}

      {/* 카드 바디 */}
      <div className="p-3 sm:p-4">
        {/* 1줄: 제목 + 탭 배지 + 날짜 */}
        <div className="flex items-end gap-2 mb-1.5 min-w-0">
          {post.isPinned && <Star className="w-3 h-3 text-violet-500 flex-shrink-0" />}
          {post.isHot && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate min-w-0">
            {post.title}
          </h3>
          {post.gameId ? (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onGameClick?.(post.gameId!._id, post.gameId!.title, post.gameId!.serviceType) }}
              style={{ fontSize: 7, transform: 'scale(1.5)', transformOrigin: 'left center' }}
              className="bg-violet-100 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 px-1 py-px rounded-full hover:bg-violet-200 dark:hover:bg-violet-600/40 transition-colors flex-shrink-0 whitespace-nowrap cursor-pointer">
              {post.gameId.title}
            </button>
          ) : (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/community?channel=${post.channel}`) }}
              style={{ fontSize: 7, transform: 'scale(1.5)', transformOrigin: 'left center' }}
              className={`px-1 py-px rounded-full flex-shrink-0 whitespace-nowrap ${ch.className}`}>
              {ch.label}
            </button>
          )}
          <span className="text-[10px] text-text-muted ml-auto flex-shrink-0 whitespace-nowrap tabular-nums">{getRelativeTime(post.createdAt)}</span>
        </div>

        {/* 2줄: 유저 아이콘 + 이름 + 레벨 */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
            post.author?.role === 'admin' ? 'bg-violet-600 text-text-primary' :
            post.author?.role === 'developer' ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary'
          }`}>
            {(post.author?.username || '?')[0].toUpperCase()}
          </div>
          <span className="text-[13px] text-text-secondary truncate">{post.author?.username}</span>
          <LevelBadge level={post.author?.level} size="xs" />
        </div>

        <div className="border-t border-line my-2" />

        {/* 3줄: 통계 */}
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
          <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
        </div>
      </div>
    </Link>
  )
}
