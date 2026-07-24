'use client'

import Link from 'next/link'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, OPERATION_STATUS_LABELS, OPERATION_STATUS_COLORS } from './constants'

export default function ProjectsMyProjectsView() {
  const { id, isOwnProfile, userProjects } = usePartnerProfileCtx()

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  if (userProjects.length === 0) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트가 없습니다.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead>
          <tr className="border-b border-line bg-bg-tertiary/50">
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20 w-[30%]">프로젝트명</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[9%]">카테고리</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[10%]">등록일</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[10%]">마감일</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[7%]">지원자</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[11%]">매칭 현황</th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-[11%]">운영 현황</th>
          </tr>
        </thead>
        <tbody>
          {userProjects.map((project: any) => {
            const isExpired = !!project.applicationDeadline && new Date(project.applicationDeadline) < new Date()
            const operationStatus = isExpired ? 'closed' : 'active'
            return (
              <tr key={project._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                <td className="px-5 py-3 max-w-0 border-r border-line/20">
                  <Link href={`/partner/projects/${project._id}`} target="_blank" rel="noopener noreferrer" className="text-text-primary font-medium hover:text-accent transition-colors truncate block">
                    {project.title}
                  </Link>
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                  {project.category}
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                  {new Date(project.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                  {project.applicationDeadline
                    ? new Date(project.applicationDeadline).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td className="px-3 py-3 text-center text-xs border-r border-line/20">
                  {project.applicantCount > 0 ? (
                    <Link
                      href={`/partner/${id}/manage/projects/applicants?projectId=${project._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent font-medium hover:underline"
                    >
                      {project.applicantCount}명
                    </Link>
                  ) : (
                    <span className="text-text-secondary">0명</span>
                  )}
                </td>
                <td className="px-3 py-3 border-r border-line/20">
                  <span className={`text-xs font-medium ${PROJECT_STATUS_COLORS[project.status] || PROJECT_STATUS_COLORS.recruiting}`}>
                    {PROJECT_STATUS_LABELS[project.status] || project.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${OPERATION_STATUS_COLORS[operationStatus]}`}>
                    {OPERATION_STATUS_LABELS[operationStatus]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
