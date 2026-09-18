'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Zap, Gamepad2, PenLine, Star } from 'lucide-react'
import LevelBadge from './LevelBadge'
import { authService } from '@/services/authService'

interface PublicProfile {
  username: string
  profileImage: string | null
  level: number
  activityScore: number
  bio: string
  gamesPlayedCount: number
  postsCount: number
  reviewsCount: number
}

const profileCache: Record<string, PublicProfile> = {}
const CARD_WIDTH = 288

interface UserHoverCardProps {
  userId?: string
  role?: string
  children: React.ReactNode
}

// 플레이어(일반 회원)한테만 호버카드 노출 — 기업회원/관리자는 대상 아님
export default function UserHoverCard({ userId, role, children }: UserHoverCardProps) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const handleEnter = () => {
    if (!userId) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) {
      const left = Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8)
      setPos({ top: rect.bottom + 8, left: Math.max(8, left) })
    }
    setOpen(true)
    if (profileCache[userId]) {
      setProfile(profileCache[userId])
      return
    }
    setLoading(true)
    setProfile(null)
    authService.getPublicProfile(userId)
      .then((data) => {
        profileCache[userId] = data
        setProfile(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  if (!userId || role !== 'player') return <>{children}</>

  return (
    <span ref={anchorRef} className="inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: CARD_WIDTH }}
          className="z-[100] bg-bg-card border border-line rounded-2xl shadow-xl overflow-hidden"
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current) }}
          onMouseLeave={handleLeave}
        >
          {loading || !profile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          ) : (
            <>
              <div className="h-12 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
              <div className="px-4 pb-4">
                <div className="-mt-6 w-14 h-14 rounded-full ring-4 ring-bg-card bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-base font-bold text-white overflow-hidden">
                  {profile.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="mt-2 min-w-0">
                  <p className="text-text-primary text-sm font-bold truncate">{profile.username}</p>
                  <LevelBadge level={profile.level} size="xs" variant="full" />
                </div>
                <div className="mt-3 flex items-center bg-bg-tertiary/40 rounded-lg divide-x divide-line/60">
                  <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-text-primary text-sm font-bold leading-none">{profile.activityScore.toLocaleString()}</p>
                    <p className="text-text-muted text-[10px]">활동점수</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
                    <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-text-primary text-sm font-bold leading-none">{profile.gamesPlayedCount}</p>
                    <p className="text-text-muted text-[10px]">플레이 게임</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
                    <PenLine className="w-3.5 h-3.5 text-fuchsia-400" />
                    <p className="text-text-primary text-sm font-bold leading-none">{profile.postsCount}</p>
                    <p className="text-text-muted text-[10px]">작성글</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-0.5 py-2">
                    <Star className="w-3.5 h-3.5 text-yellow-400" />
                    <p className="text-text-primary text-sm font-bold leading-none">{profile.reviewsCount}</p>
                    <p className="text-text-muted text-[10px]">작성 리뷰</p>
                  </div>
                </div>
                {profile.bio && (
                  <div className="mt-3 bg-bg-tertiary/50 rounded-lg px-2.5 py-2">
                    <p className="text-text-muted text-[10px] font-semibold tracking-wide mb-0.5">자기소개</p>
                    <p className="text-text-secondary text-xs leading-relaxed line-clamp-3">{profile.bio}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </span>
  )
}
