'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, UserPlus, FileText } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function ProjectsTabNav() {
  const { id, isOwnProfile, userProjects, myProjectApplicants, myApplications } = usePartnerProfileCtx()
  const pathname = usePathname()
  const base = `/partner/${id}/projects`
  const activeKey = pathname === `${base}/applicants` ? 'applicants' : pathname === `${base}/applications` ? 'applications' : 'myProjects'

  return (
    <div className="flex border-b border-line">
      <Link
        href={base}
        className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
          activeKey === 'myProjects'
            ? 'border-accent text-accent'
            : 'border-transparent text-text-secondary hover:text-text-primary'
        }`}
      >
        <Briefcase className="w-3.5 h-3.5" />
        등록 프로젝트
        <span className="text-xs tabular-nums opacity-70">({userProjects.length})</span>
      </Link>
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
        </Link>
      )}
    </div>
  )
}
