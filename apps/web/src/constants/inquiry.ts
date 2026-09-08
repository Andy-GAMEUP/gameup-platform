export const INQUIRY_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'game', label: '게임' },
  { value: 'account', label: '계정' },
  { value: 'bug', label: '버그' },
  { value: 'report', label: '신고' },
  { value: 'community', label: '커뮤니티' },
  { value: 'other', label: '기타' },
]

export const inquiryCategoryLabel = (value?: string) =>
  INQUIRY_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? '기타'

// 배지 색상/스타일은 apps/web/src/components/InquiryStatusBadge.tsx 하나로 통일 — 여기서는 라벨(드롭다운 등 텍스트 전용 용도)만 다룬다
export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  open: '오픈',
  in_progress: '진행 중',
  closed: '문의 종료',
}

export const inquiryStatusLabel = (value?: string) => INQUIRY_STATUS_LABELS[value || 'open'] ?? '오픈'
