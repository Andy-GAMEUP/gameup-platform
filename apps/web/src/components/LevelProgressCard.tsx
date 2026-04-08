'use client'
import { useLevels } from '../hooks/useLevels'

interface LevelProgressCardProps {
  level: number
  activityScore: number
  className?: string
}

export default function LevelProgressCard({ level, activityScore, className = '' }: LevelProgressCardProps) {
  const { getLevelInfo, getNextLevel, getProgressToNext } = useLevels()
  const currentInfo = getLevelInfo(level)
  const nextInfo = getNextLevel(level)
  const { percent, remaining } = getProgressToNext(activityScore, level)

  const icon = currentInfo?.icon || '🌱'
  const name = currentInfo?.name || `레벨 ${level}`

  return (
    <div className={`bg-bg-secondary border border-line rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center text-3xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">Lv.{level}</span>
            <span className="text-lg text-accent font-semibold">{name}</span>
          </div>
          <p className="text-sm text-text-secondary">활동점수: <strong className="text-accent">{activityScore.toLocaleString()}점</strong></p>
        </div>
      </div>

      {nextInfo ? (
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>다음 등급: Lv.{nextInfo.level} {nextInfo.name}</span>
            <span>{remaining.toLocaleString()}점 남음</span>
          </div>
          <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-right text-[10px] text-text-muted mt-1">{percent}%</div>
        </div>
      ) : (
        <div className="text-center text-sm text-accent font-medium py-2">
          최고 등급 달성!
        </div>
      )}
    </div>
  )
}
