const APPROVAL_STATUS_STYLES: Record<string, { label: string; className: string; dotClassName: string; pulse?: boolean }> = {
  not_submitted: { label: '초안',      className: 'text-text-muted', dotClassName: 'bg-text-muted' },
  pending:       { label: '심사중',    className: 'text-yellow-400', dotClassName: 'bg-yellow-400', pulse: true },
  review:        { label: '심사중',    className: 'text-yellow-400', dotClassName: 'bg-yellow-400', pulse: true },
  approved:      { label: '출시 대기', className: 'text-accent',     dotClassName: 'bg-accent',     pulse: true },
  rejected:      { label: '심사 거부', className: 'text-red-400',    dotClassName: 'bg-red-400' },
}

export default function GameApprovalStatusBadge({
  approvalStatus, status, className = '',
}: {
  approvalStatus?: string
  status?: string
  className?: string
}) {
  if (!approvalStatus) return null
  const style = APPROVAL_STATUS_STYLES[approvalStatus]
  if (!style) return null
  // 출시(published) 후에는 심사 거부 외에는 더 이상 표시하지 않는다 (출시 전 상태 안내이므로)
  if (status === 'published' && approvalStatus !== 'rejected') return null

  return (
    <span className={`inline-flex items-center gap-1 text-[15.6px] ${style.className} ${className}`}>
      <span className={`w-1 h-1 rounded-full ${style.dotClassName} ${style.pulse ? 'animate-pulse' : ''}`} />
      {style.label}
    </span>
  )
}
