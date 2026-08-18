const NOTICE_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  notice: { label: '공지', className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40' },
  event: { label: '이벤트', className: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/40' },
  maintenance: { label: '점검', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40' },
  update: { label: '업데이트', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40' },
}

export default function NoticeTypeBadge({ type, className = '' }: { type: string; className?: string }) {
  const style = NOTICE_TYPE_STYLES[type] ?? { label: type, className: 'bg-bg-tertiary text-text-muted border border-line' }
  return (
    <span className={`inline-flex items-center whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-md ${style.className} ${className}`}>
      {style.label}
    </span>
  )
}
