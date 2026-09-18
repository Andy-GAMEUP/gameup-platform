'use client'
import { useId } from 'react'

// 관리자 닉네임 옆에 붙는 체크마크 — 텍스트 없이 색으로만 구분 (기업회원 체크와 동일 아이콘, 다른 색)
// 테두리 없이 단색으로 꽉 채우고, 체크 표시는 배경이 비치는 투명 컷아웃으로 표현
export default function AdminBadge({ className = '' }: { className?: string }) {
  const maskId = useId()
  return (
    <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 text-amber-500 flex-shrink-0 ${className}`} aria-label="관리자">
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <path d="m9 12 2 2 4-4" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </mask>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}
