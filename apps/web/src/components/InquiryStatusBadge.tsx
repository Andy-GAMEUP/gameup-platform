const INQUIRY_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: '오픈', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/40' },
  in_progress: { label: '진행 중', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40' },
  closed: { label: '문의 종료', className: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/40' },
}

export default function InquiryStatusBadge({ status, className = '' }: { status?: string; className?: string }) {
  const style = INQUIRY_STATUS_STYLES[status || 'open'] ?? INQUIRY_STATUS_STYLES.open
  return (
    <span className={`inline-flex items-center whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-md ${style.className} ${className}`}>
      {style.label}
    </span>
  )
}
