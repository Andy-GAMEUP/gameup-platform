'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { APPLICATION_STATUS_COLORS } from './constants'

const DECISION_LABELS: Record<string, string> = {
  pending: '검토중', approved: '매칭승인', rejected: '거절', 'on-hold': '보류중',
}

export default function ProjectsApplicantsView() {
  const { isOwnProfile, myProjectApplicants, applicantStatusMutation } = usePartnerProfileCtx()
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get('projectId')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    initialProjectId ? [initialProjectId] : []
  )
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>()
    myProjectApplicants.forEach((app: any) => {
      const project = typeof app.projectId === 'object' ? app.projectId : null
      if (project?._id && !map.has(project._id)) map.set(project._id, project.title)
    })
    return Array.from(map, ([_id, title]) => ({ _id, title }))
  }, [myProjectApplicants])

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    )
  }

  const filteredApplicants = selectedProjectIds.length === 0
    ? myProjectApplicants
    : myProjectApplicants.filter((app: any) => {
        const project = typeof app.projectId === 'object' ? app.projectId : null
        return project?._id && selectedProjectIds.includes(project._id)
      })

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  if (myProjectApplicants.length === 0) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트에 지원한 사람이 없습니다.</div>
  }

  return (
    <div>
      {/* 프로젝트명 필터 */}
      <div className="px-5 py-3 border-b border-line">
        <div ref={dropdownRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            className="flex items-center gap-2 text-sm border border-line rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <span>
              {selectedProjectIds.length === 0
                ? '모든 프로젝트'
                : `프로젝트명 (${selectedProjectIds.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-bg-card border border-line rounded-xl shadow-xl z-50">
              {selectedProjectIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProjectIds([])}
                  className="w-full text-left px-4 py-2 text-xs text-accent hover:bg-bg-tertiary transition-colors border-b border-line/40"
                >
                  선택 초기화
                </button>
              )}
              {projectOptions.map(p => {
                const checked = selectedProjectIds.includes(p._id)
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggleProject(p._id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-accent border-accent' : 'border-line'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-text-primary truncate">{p.title}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-b-xl overflow-hidden">
      {filteredApplicants.length === 0 ? (
        <div className="px-5 py-14 text-center text-text-muted text-sm">선택한 프로젝트에 해당하는 지원자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr className="border-b border-line bg-bg-tertiary/50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20 w-[18.17%]">프로젝트명</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/20 w-[11.33%]">지원 기업명</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[12%]">제안 금액</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[11.67%]">지원일</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[10%]">결정</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/20 w-[8.33%]">승인</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-[9%]">거절</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.map((app: any) => {
                const project = typeof app.projectId === 'object' ? app.projectId : null
                const isExpired = !!project?.applicationDeadline && new Date(project.applicationDeadline) < new Date()
                const isDecisionLocked = isExpired && app.status !== 'approved'
                return (
                  <tr key={app._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                    <td className="px-5 py-3 max-w-0 border-r border-line/20">
                      {project
                        ? (
                          <Link href={`/partner/projects/${project._id}`} target="_blank" rel="noopener noreferrer" className="text-text-primary font-medium hover:text-accent transition-colors truncate block">
                            {project.title}
                          </Link>
                        )
                        : <span className="text-text-muted text-xs">-</span>}
                    </td>
                    <td className="px-3 py-3 max-w-0 border-r border-line/20">
                      <p className="text-text-muted text-xs truncate">
                        {app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType}
                      </p>
                    </td>
                    <td className="px-3 py-3 max-w-0 border-r border-line/20">
                      <p className="text-text-muted text-xs truncate">
                        {app.proposedBudget || '-'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/20">
                      {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-3 border-r border-line/20">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${APPLICATION_STATUS_COLORS[app.status] || APPLICATION_STATUS_COLORS.pending}`}>
                        {DECISION_LABELS[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-line/20">
                      {project && (
                        <button
                          onClick={() => applicantStatusMutation.mutate({ projectId: project._id, appId: app._id, status: 'approved' })}
                          disabled={isDecisionLocked}
                          title={isDecisionLocked ? '마감된 프로젝트는 승인할 수 없습니다' : undefined}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-line disabled:text-text-muted disabled:cursor-not-allowed disabled:hover:bg-line text-text-primary px-2.5 py-1 rounded text-xs font-medium transition-colors"
                        >
                          승인
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {project && (
                        <button
                          onClick={() => applicantStatusMutation.mutate({ projectId: project._id, appId: app._id, status: 'rejected' })}
                          disabled={isDecisionLocked}
                          title={isDecisionLocked ? '마감된 프로젝트는 거절할 수 없습니다' : undefined}
                          className="bg-red-600/20 hover:bg-red-600/30 disabled:bg-line disabled:text-text-muted disabled:cursor-not-allowed disabled:hover:bg-line text-red-400 px-2.5 py-1 rounded text-xs font-medium transition-colors"
                        >
                          거절
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
