'use client'
import { Shield } from 'lucide-react'

export default function AdminBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[8px] font-semibold px-1 py-0 leading-[14px] whitespace-nowrap ${className}`}>
      <Shield className="w-2 h-2" />관리자
    </span>
  )
}
