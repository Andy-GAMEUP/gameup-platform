'use client'

import Link from 'next/link'
import { Clock, Users, Wallet } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'

const STATUS_BADGE: Record<string, string> = {
  recruiting: 'bg-emerald-100 text-emerald-700 font-semibold',
  matched: 'bg-blue-100 text-blue-700 font-semibold',
  unmatched: 'bg-amber-100 text-amber-700 font-semibold',
}
const STATUS_TEXT: Record<string, string> = {
  recruiting: '모집중', matched: '매칭성공', unmatched: '매칭보류',
}

export default function PostsSection() {
  const { partner, userProjects } = usePartnerProfileCtx()
  const companyName = partner.displayNameOverride || (partner.userId as any)?.companyInfo?.companyName || partner.userId?.username || '?'

  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-text-primary font-semibold text-lg">등록 프로젝트</h2>
      </div>
      {userProjects.length ? (
        <div className="flex flex-col gap-3 p-5">
          {userProjects.map((project: any) => {
            const deadline = project.applicationDeadline
              ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
              : null

            return (
              <Link key={project._id} href={`/partner/projects/${project._id}`} target="_blank" rel="noopener noreferrer"
                className="group bg-bg-secondary border border-line rounded-2xl p-5 hover:border-accent/40 hover:shadow-lg transition-all flex flex-col gap-3">

                {/* Row 1: 프로젝트명 + 상태 배지 */}
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-text-primary font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {project.title}
                  </h2>
                  <span className={`flex-shrink-0 text-sm px-4 py-2 rounded-xl ${STATUS_BADGE[project.status] || STATUS_BADGE.recruiting}`}>
                    {STATUS_TEXT[project.status] || project.status}
                  </span>
                </div>

                {/* Row 2: 로고 + 회사명 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                    {companyName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <p className="text-text-muted text-xs truncate">{companyName}</p>
                </div>

                {/* Row 3: 금액 + 마감일 */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted pl-8">
                  {(project.budget || project.budgetMin) && (
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      {project.budget || `${project.budgetMin}~${project.budgetMax}`}
                    </span>
                  )}
                  {deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {deadline} 마감
                    </span>
                  )}
                </div>

                {/* Row 4: 지원자 */}
                <div className="pl-8">
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Users className="w-3 h-3" />
                    {project.applicantCount || 0}명 지원
                  </span>
                </div>

                {/* Row 5: 카테고리 + 스킬 + 지원하기 */}
                <div className="mt-auto pt-3 border-t border-line/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="bg-bg-tertiary border border-line text-text-muted px-2 py-0.5 rounded-full text-xs flex-shrink-0">
                      {project.category}
                    </span>
                    {project.requiredSkills?.slice(0, 3).map((skill: string, i: number) => (
                      <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                        {skill}
                      </span>
                    ))}
                    {(project.requiredSkills?.length || 0) > 3 && (
                      <span className="text-text-muted text-xs">+{project.requiredSkills.length - 3}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-accent border-2 border-accent/40 px-4 py-2.5 rounded-xl group-hover:bg-accent group-hover:text-text-primary group-hover:border-accent transition-all whitespace-nowrap">
                      지원하기
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트가 없습니다.</div>
      )}
    </div>
  )
}
