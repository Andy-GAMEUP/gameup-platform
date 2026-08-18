'use client'
import { BadgeCheck } from 'lucide-react'

export default function OfficialBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-semibold px-1 py-0 leading-[14px] whitespace-nowrap ${className}`}>
      <BadgeCheck className="w-2 h-2" />공식 계정
    </span>
  )
}
