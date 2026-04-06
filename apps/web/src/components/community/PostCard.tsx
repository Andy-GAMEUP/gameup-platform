'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, ThumbsUp, MessageSquare, Bookmark, Star, Flame, Film, ImageIcon } from 'lucide-react'
import type { PostSummary } from '@/services/communityService'
import { getRelativeTime } from '@/lib/relativeTime'
import LevelBadge from '@/components/LevelBadge'

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
  /** 첫 번째 카드에 priority 설정하여 LCP 최적화 */
  priority?: boolean
  /** 카드 보기 모드 */
  viewMode?: ViewMode
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return <span className="text-xs font-medium text-violet-600 dark:text-violet-400">관리자</span>
  if (role === 'developer') return <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">개발사</span>
  return null
}

export default function PostCard({ post, currentUserId, priority = false, viewMode = 'large' }: PostCardProps) {
  const ch = CHANNEL_MAP[post.channel] || CHANNEL_MAP.free
  const textPreview = post.content.replace(/<[^>]*>/g, '').slice(0, 200)
  const thumbnailIdx = post.thumbnailIndex || 0
  const thumbnailImg = post.images?.[thumbnailIdx] || post.images?.[0]
  const isMyPost = currentUserId && post.author?._id === currentUserId

  // ── 소형 카드 (리스트형) ──
  if (viewMode === 'small') {
    return (
      <Link href={`/community/${post._id}`}
        className={`flex items-center gap-3 bg-bg-card dark:bg-bg-secondary border rounded-xl px-4 py-3 hover:shadow-md dark:hover:border-violet-500/40 transition-all group
          ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
          ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

        {/* 좌측: 썸네일 (정사각형) */}
        {thumbnailImg && (
          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-bg-tertiary">
            <Image src={thumbnailImg} alt="" fill className="object-cover" unoptimized priority={priority} />
          </div>
        )}

        {/* 중앙: 제목 + 메타 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {post.isPinned && <Star className="w-3 h-3 text-violet-500 flex-shrink-0" />}
            {post.isHot && <Flame className="w-3 h-3 text-orange-500 flex-shrink-0" />}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ch.className}`}>{ch.label}</span>
          </div>
          <h3 className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
            {post.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-text-secondary">
            <span>{post.author?.username}</span>
            <LevelBadge level={post.author?.level} />
            <span>·</span>
            <span>{getRelativeTime(post.createdAt)}</span>
          </div>
        </div>

        {/* 우측: 통계 */}
        <div className="flex items-center gap-3 text-[11px] text-text-secondary flex-shrink-0">
          <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
        </div>
      </Link>
    )
  }

  // ── 중형 카드 (가로형) ──
  if (viewMode === 'medium') {
    return (
      <Link href={`/community/${post._id}`}
        className={`flex bg-bg-card dark:bg-bg-secondary border rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group
          ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
          ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

        {/* 좌측: 썸네일 */}
        {thumbnailImg && (
          <div className="relative w-40 sm:w-48 lg:w-56 flex-shrink-0 bg-bg-tertiary">
            <Image src={thumbnailImg} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={priority} />
            {post.images.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-text-primary text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 backdrop-blur-sm">
                <ImageIcon className="w-2.5 h-2.5" />{post.images.length}
              </span>
            )}
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
              <RoleBadge role={post.author?.role || ''} />
              <span className="text-[11px] text-text-secondary">· {getRelativeTime(post.createdAt)}</span>
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
    <Link href={`/community/${post._id}`}
      className={`block bg-bg-card dark:bg-bg-secondary border rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group
        ${post.isPinned ? 'border-violet-300 dark:border-violet-500/40' : 'border-line dark:border-line'}
        ${post.isHot ? 'ring-1 ring-orange-300 dark:ring-orange-500/30' : ''}`}>

      {/* 썸네일 이미지 (대형) */}
      {thumbnailImg && (
        <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
          <Image src={thumbnailImg} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={priority} />
          {/* 이미지 개수 배지 */}
          {post.images.length > 1 && (
            <span className="absolute bottom-3 right-3 bg-black/60 text-text-primary text-xs px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
              <ImageIcon className="w-3 h-3" />{post.images.length}
            </span>
          )}
          {/* 동영상 배지 */}
          {post.videoUrl && (
            <span className="absolute top-3 left-3 bg-violet-600/90 text-text-primary text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
              <Film className="w-3 h-3" />동영상
            </span>
          )}
        </div>
      )}

      {/* 카드 바디 */}
      <div className="p-4 sm:p-5">
        {/* 작성자 + 역할 + 시간 + 게임태그 */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            post.author?.role === 'admin' ? 'bg-violet-600 text-text-primary' :
            post.author?.role === 'developer' ? 'bg-cyan-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary'
          }`}>
            {(post.author?.username || '?')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-text-primary">{post.author?.username}</span>
          <LevelBadge level={post.author?.level} />
          <RoleBadge role={post.author?.role || ''} />
          {isMyPost && <span className="text-xs text-violet-500">내 글</span>}
          <span className="text-xs text-text-secondary">·</span>
          <span className="text-xs text-text-secondary">{getRelativeTime(post.createdAt)}</span>
          {post.gameId && (
            <span className="text-xs bg-violet-100 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
              {post.gameId.title}
            </span>
          )}
        </div>

        {/* 배지 + 제목 */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {post.isPinned && (
            <span className="bg-violet-100 dark:bg-violet-600/30 text-violet-700 dark:text-violet-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Star className="w-3 h-3" />고정
            </span>
          )}
          {post.isHot && (
            <span className="bg-orange-100 dark:bg-orange-600/30 text-orange-700 dark:text-orange-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Flame className="w-3 h-3" />HOT
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${ch.className}`}>{ch.label}</span>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2 mb-1">
          {post.title}
        </h3>
        <p className="text-sm text-text-muted dark:text-text-secondary line-clamp-2 sm:line-clamp-3">{textPreview}</p>

        {/* 하단 상호작용 */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line text-xs text-text-secondary">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.views.toLocaleString()}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{post.likeCount}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
          <span className="ml-auto flex items-center gap-1"><Bookmark className="w-3.5 h-3.5" />{post.bookmarkCount}</span>
        </div>
      </div>
    </Link>
  )
}
