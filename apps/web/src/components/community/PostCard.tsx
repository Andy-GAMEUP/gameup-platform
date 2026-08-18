'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, ThumbsUp, MessageSquare, Flame, Film } from 'lucide-react'
import LevelBadge from '@/components/LevelBadge'
import OfficialBadge from '@/components/OfficialBadge'
import AdminBadge from '@/components/AdminBadge'
import type { PostSummary } from '@/services/communityService'
import { getRelativeTime } from '@/lib/relativeTime'
import { formatDate } from '@/lib/formatDate'

export const CHANNEL_MAP: Record<string, { label: string; className: string }> = {
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
  /** 소형(리스트형) 카드 전용: 목록의 첫 번째 항목이면 구분선을 생략 */
  isFirstInList?: boolean
}

export function communityTabHref(channel: string, gameId?: { _id: string; title: string; serviceType?: string }) {
  const qs = new URLSearchParams()
  qs.set('channel', channel)
  if (gameId) {
    qs.set('gameId', gameId._id)
    qs.set('gameTitle', gameId.title)
    if (gameId.serviceType) qs.set('gameServiceType', gameId.serviceType)
  }
  return `/community?${qs.toString()}`
}

const GAME_CHANNELS = new Set(['beta-game', 'live-game'])

// 게시물의 뒤로가기 라벨/목적지 — gameId가 있어도 채널 자체가 베타/라이브게임(자녀 탭)이 아니면
// (예: 신작게임소개에 "관련 게임"만 태그된 경우) gameId를 무시한다 — 안 그러면 채널 탭과
// 게임 자녀 탭이 동시에 활성화되는 사이드바 이중 강조 버그가 생긴다.
export function postBackNav(post: { channel: string; gameId?: { _id: string; title: string; serviceType?: string } }) {
  const gameId = GAME_CHANNELS.has(post.channel) ? post.gameId : undefined
  const label = gameId?.title ?? (CHANNEL_MAP[post.channel]?.label ?? CHANNEL_MAP.free.label)
  const href = communityTabHref(post.channel, gameId)
  return { label, href }
}

export default function PostCard({ post, currentUserId, priority = false, viewMode = 'large', onGameClick, href, fromLabel, isFirstInList = false }: PostCardProps) {
  const ch = CHANNEL_MAP[post.channel] || CHANNEL_MAP.free
  const nav = postBackNav(post)
  const backLabel = fromLabel ?? nav.label
  const fromHref = nav.href
  const cardHref = href ?? `/community/${post._id}?from=${encodeURIComponent(backLabel)}&fromHref=${encodeURIComponent(fromHref)}`
  const textPreview = post.content.replace(/<[^>]*>/g, '').slice(0, 200)
  const thumbnailIdx = post.thumbnailIndex || 0
  const thumbnailImg = post.images?.[thumbnailIdx] || post.images?.[0]

  // ── 소형 카드 (리스트형) ──
  if (viewMode === 'small') {
    const dateStr = formatDate(post.createdAt)
    return (
      <Link href={cardHref}
        className={`relative flex items-center gap-3 px-4 py-3.5 overflow-hidden hover:bg-bg-tertiary transition-colors duration-200 cursor-pointer group before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0 before:bg-accent before:transition-all before:duration-200 group-hover:before:w-[3px] ${isFirstInList ? '' : 'border-t border-line'}`}>

        {/* 썸네일 (있을 때만 그대로 표시) */}
        {thumbnailImg && (
          <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden flex-shrink-0 bg-bg-tertiary ring-1 ring-black/5 dark:ring-white/10">
            <Image src={thumbnailImg} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" unoptimized priority={priority} />
          </div>
        )}

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          {/* 1줄: 제목(크게) / 댓글 */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-text-primary text-[14.72px] font-medium group-hover:text-accent transition-colors truncate">
              {post.title}
            </span>
            <span className="flex items-center gap-0.5 text-xs text-accent font-semibold flex-shrink-0 bg-accent/10 px-1.5 py-0.5 rounded-full"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
            <div className="flex-1" />
            <span className="text-text-muted text-xs flex-shrink-0 tabular-nums">{dateStr}</span>
          </div>
          {/* 2줄: 닉네임 / 조회수 / 추천 */}
          <div className="flex items-center gap-2 mt-[5px] text-xs text-text-muted">
            <span className="text-[13.2px] text-text-secondary">{post.author?.username}</span>
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
            <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
          </div>
        </div>
      </Link>
    )
  }

  // ── 중형 카드 (가로형) ──
  if (viewMode === 'medium') {
    return (
      <Link href={cardHref}
        className={`flex bg-bg-card dark:bg-bg-secondary border border-line dark:border-line rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group
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
              {post.author?.profileImage ? (
                <img src={post.author.profileImage} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  post.author?.role === 'admin' ? 'bg-violet-600 text-text-primary' :
                  post.author?.role === 'developer' ? 'bg-cyan-600 text-text-primary' : 'bg-accent text-text-inverse'
                }`}>
                  {(post.author?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-text-primary">{post.author?.username}</span>
              {post.author?.role === 'developer' ? <OfficialBadge /> : post.author?.role === 'admin' ? <AdminBadge /> : <LevelBadge level={post.author?.level} size="xs" />}
              <div className="flex-1" />
              <span className="text-[11px] text-text-secondary flex-shrink-0">{getRelativeTime(post.createdAt)}</span>
            </div>

            {/* 배지 + 제목 */}
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
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
          </div>
        </div>
      </Link>
    )
  }

  // ── 대형 카드 (기존 기본) ──
  const largeDateStr = formatDate(post.createdAt)
  return (
    <Link href={cardHref}
      className="block bg-bg-card dark:bg-bg-secondary border border-line dark:border-line rounded-2xl overflow-hidden hover:shadow-lg dark:hover:border-violet-500/40 transition-all group">

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
        {/* 1줄: 제목(크게) + 댓글 + 날짜 */}
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <span className="text-text-primary text-[14.72px] font-medium group-hover:text-accent transition-colors truncate min-w-0">
            {post.title}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-accent font-semibold flex-shrink-0 bg-accent/10 px-1.5 py-0.5 rounded-full"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
          <span className="text-text-muted text-xs ml-auto flex-shrink-0 whitespace-nowrap tabular-nums">{largeDateStr}</span>
        </div>

        {/* 2줄: 유저 아이콘 + 닉네임 */}
        <div className="flex items-center gap-2 mb-2">
          {post.author?.profileImage ? (
            <img src={post.author.profileImage} alt="" className="w-[22px] h-[22px] rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 bg-accent text-text-inverse">
              {(post.author?.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[13.2px] text-text-secondary truncate">{post.author?.username}</span>
        </div>

        <div className="border-t border-line my-2" />

        {/* 3줄: 조회수 + 추천 */}
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{post.views.toLocaleString()}</span>
          <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
        </div>
      </div>
    </Link>
  )
}
