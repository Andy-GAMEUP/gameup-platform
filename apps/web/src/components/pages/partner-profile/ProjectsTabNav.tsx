'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserPlus, FileText } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function ProjectsTabNav() {
  const { id, isOwnProfile, myProjectApplicants, myApplications, hasUnreadFromApplicants, hasUnreadFromOwners } = usePartnerProfileCtx()
  const pathname = usePathname()
  const base = `/partner/${id}/manage/projects`
  const activeKey = pathname === `${base}/applications` ? 'applications' : 'applicants'

  return (
    <div className="flex border-b border-line">
      {isOwnProfile && (
        <Link
          href={`${base}/applicants`}
          className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            activeKey === 'applicants'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          지원자 목록
          <span className="text-xs tabular-nums opacity-70">({myProjectApplicants.length})</span>
          {hasUnreadFromApplicants && (
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          )}
        </Link>
      )}
      {isOwnProfile && (
        <Link
          href={`${base}/applications`}
          className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            activeKey === 'applications'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          내가한 지원
          <span className="text-xs tabular-nums opacity-70">({myApplications.length})</span>
          {hasUnreadFromOwners && (
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
          )}
        </Link>
      )}
    </div>
  )
}
