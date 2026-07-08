'use client'

import { usePartnerProfileCtx } from './PartnerProfileContext'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from './constants'

export default function ProjectsApplicationsView() {
  const { isOwnProfile, myApplications } = usePartnerProfileCtx()

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  if (myApplications.length === 0) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">지원한 프로젝트가 없습니다.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line bg-bg-tertiary/50">
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">상태</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/20">카테고리</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20">프로젝트명</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/20">예산</th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28">지원일</th>
          </tr>
        </thead>
        <tbody>
          {myApplications.map((app: any) => {
            const project = typeof app.projectId === 'object' ? app.projectId : null
            return (
              <tr key={app._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                <td className="px-5 py-3 border-r border-line/20">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${APPLICATION_STATUS_COLORS[app.status] || APPLICATION_STATUS_COLORS.pending}`}>
                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </span>
                </td>
                <td className="px-3 py-3 border-r border-line/20">
                  {project?.category
                    ? <span className="text-xs text-text-muted bg-bg-tertiary border border-line px-2 py-0.5 rounded-full whitespace-nowrap">{project.category}</span>
                    : <span className="text-text-muted text-xs">-</span>}
                </td>
                <td className="px-3 py-3 max-w-0 border-r border-line/20">
                  <p className="text-text-primary font-medium truncate">
                    {project?.title || '프로젝트 정보 없음'}
                  </p>
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                  {project?.budget || '-'}
                </td>
                <td className="px-5 py-3 text-text-muted text-xs whitespace-nowrap">
                  {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
