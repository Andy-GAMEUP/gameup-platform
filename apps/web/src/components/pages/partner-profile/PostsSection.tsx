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
  recruiting: '모집중', matched: '매칭 완료', unmatched: '매칭보류',
}

export default function PostsSection() {
  const { id, partner, userProjects } = usePartnerProfileCtx()
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
              <Link key={project._id} href={`/partner/projects/${project._id}?from=channel&channelId=${id}`}
                className="group relative overflow-hidden bg-bg-secondary border border-line rounded-2xl p-5 hover:border-accent/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-4">

                {/* 호버 시 살짝 드러나는 상단 액센트 라인 */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Row 1: 로고 + 프로젝트명/회사명 + 상태 배지 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/25 to-accent/5 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                      {companyName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-text-primary font-semibold text-[15px] leading-snug truncate group-hover:text-accent transition-colors">
                        {project.title}
                      </h2>
                      <p className="text-text-muted text-xs truncate">{companyName}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${STATUS_BADGE[project.status] || STATUS_BADGE.recruiting}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {STATUS_TEXT[project.status] || project.status}
                  </span>
                </div>

                {/* Row 2: 금액 + 마감일 + 지원자 */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted pl-[46px]">
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
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.applicantCount || 0}명 지원
                  </span>
                </div>

                {/* Row 3: 카테고리 + 스킬 태그 */}
                <div className="mt-auto pt-3 border-t border-line/40 flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="bg-bg-tertiary border border-line text-text-muted px-2.5 py-1 rounded-full text-xs flex-shrink-0">
                    {project.category}
                  </span>
                  {project.requiredSkills?.slice(0, 4).map((skill: string, i: number) => (
                    <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0">
                      {skill}
                    </span>
                  ))}
                  {(project.requiredSkills?.length || 0) > 4 && (
                    <span className="text-text-muted text-xs">+{project.requiredSkills.length - 4}</span>
                  )}
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
