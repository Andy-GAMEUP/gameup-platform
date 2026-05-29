import { RatingClass } from '@gameup/types'

const RATING_CONFIG: Record<RatingClass, {
  bg: string
  ghost: string
  short: string
  fontSize: number
  ghostSize: number
}> = {
  '전체이용가':    { bg: '#2e8b3a', ghost: '#3dab4a', short: 'ALL', fontSize: 18, ghostSize: 28 },
  '12세이용가':   { bg: '#1a8c6c', ghost: '#24b589', short: '12',  fontSize: 24, ghostSize: 36 },
  '15세이용가':   { bg: '#d97b1a', ghost: '#f09030', short: '15',  fontSize: 24, ghostSize: 36 },
  '18세이용가':   { bg: '#c0392b', ghost: '#e05040', short: '18',  fontSize: 24, ghostSize: 36 },
  '청소년이용불가': { bg: '#b52222', ghost: '#d03535', short: '청불', fontSize: 14, ghostSize: 22 },
}

interface Props {
  ratingClass: RatingClass
  size?: 'sm' | 'md'
}

export default function GracRatingBadge({ ratingClass, size = 'sm' }: Props) {
  const cfg = RATING_CONFIG[ratingClass]
  if (!cfg) return null

  const W = size === 'sm' ? 40 : 56
  const H = size === 'sm' ? 48 : 68
  const gbrSize = size === 'sm' ? 5.5 : 7.5
  const mainSize = size === 'sm' ? cfg.fontSize : Math.round(cfg.fontSize * 1.4)
  const ghostSize = size === 'sm' ? cfg.ghostSize : Math.round(cfg.ghostSize * 1.4)
  const cx = W / 2
  const cy = H / 2 + 3

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={ratingClass}
    >
      {/* 배경 */}
      <rect width={W} height={H} rx="6" fill={cfg.bg} />

      {/* 고스트 텍스트 */}
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={cfg.ghost}
        fontSize={ghostSize}
        fontWeight="900"
        fontFamily="'Arial Black', 'Noto Sans KR', sans-serif"
        letterSpacing="-1"
      >
        {cfg.short}
      </text>

      {/* 메인 텍스트 */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={mainSize}
        fontWeight="900"
        fontFamily="'Arial Black', 'Noto Sans KR', sans-serif"
        letterSpacing="-1"
      >
        {cfg.short}
      </text>

      {/* GBR 좌상단 */}
      <text
        x="4"
        y={gbrSize + 2}
        fill="white"
        fontSize={gbrSize}
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        opacity="0.9"
      >
        GBR
      </text>
    </svg>
  )
}
