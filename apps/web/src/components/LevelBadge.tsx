'use client'
import { useLevels } from '../hooks/useLevels'

interface LevelBadgeProps {
  level?: number
  size?: 'sm' | 'md'
  variant?: 'compact' | 'full'
  className?: string
}

// DB 아이콘 로딩 전 또는 매핑 실패 시 사용할 폴백
const FALLBACK_ICONS: Record<number, string> = {
  1: '\uD83C\uDF31', // 🌱
  2: '\uD83C\uDF3F', // 🌿
  3: '\uD83C\uDF3B', // 🌻
  4: '\u2B50',       // ⭐
  5: '\uD83C\uDF1F', // 🌟
  6: '\uD83D\uDD25', // 🔥
  7: '\uD83D\uDC8E', // 💎
  8: '\uD83D\uDC51', // 👑
  9: '\uD83C\uDF08', // 🌈
  10: '\uD83D\uDE80', // 🚀
}

function getFallbackIcon(level: number): string {
  if (level >= 10) return FALLBACK_ICONS[10]
  return FALLBACK_ICONS[level] || FALLBACK_ICONS[1]
}

export default function LevelBadge({ level = 1, size = 'sm', variant = 'compact', className = '' }: LevelBadgeProps) {
  const { getLevelInfo } = useLevels()
  const info = getLevelInfo(level)
  const icon = info?.icon || getFallbackIcon(level)
  const name = info?.name

  const sizeClasses = size === 'md'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-[10px] px-1 py-0.5'

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-bg-tertiary border border-line text-text-secondary font-medium whitespace-nowrap ${sizeClasses} ${className}`}>
      <span>{icon}</span>
      <span>Lv.{level}</span>
      {variant === 'full' && name && <span className="text-text-muted">{name}</span>}
    </span>
  )
}
