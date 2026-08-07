'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Check, X, Contact, History } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { APPLICATION_STATUS_TEXT_COLORS } from './constants'
import { partnerService } from '@/services/partnerService'
import MessageComposeModal from '@/components/MessageComposeModal'
import ConfirmModal from '@/components/ConfirmModal'
import { getMailButtonState, MAIL_BUTTON_CONFIG } from './mailButtonState'

const DECISION_LABELS: Record<string, string> = {
  pending: '검토중', approved: '협의 중', rejected: '거절', 'on-hold': '보류중', confirmed: '확정',
}

// 표에 실제로 보이는 "진행 상태" 값 기준 — 마감(closed)은 app.status에는 없는, 마감 여부로
// 계산되는 표시 전용 상태라 필터 옵션에도 별도로 넣어준다
const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: '검토중' },
  { value: 'approved', label: '협의 중' },
  { value: 'on-hold', label: '보류중' },
  { value: 'confirmed', label: '확정' },
  { value: 'rejected', label: '거절' },
  { value: 'closed', label: '마감' },
]

function getEffectiveStatus(app: any): string {
  const project = typeof app.projectId === 'object' ? app.projectId : null
  const isExpired = !!project?.applicationDeadline && new Date(project.applicationDeadline) < new Date()
  const isClosedUndecided = isExpired && !['confirmed', 'rejected'].includes(app.status)
  return isClosedUndecided ? 'closed' : app.status
}

export default function ProjectsApplicantsView() {
  const {
    id, isOwnProfile, myProjectApplicants, applicantStatusMutation, receivedMessages,
    latestMessageIdByCounterpart, messageSeenMap, markMessageSeen,
  } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get('projectId')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    initialProjectId ? [initialProjectId] : []
  )
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([])
  const [isApplicantOpen, setIsApplicantOpen] = useState(false)
  const applicantDropdownRef = useRef<HTMLDivElement>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const [viewingApp, setViewingApp] = useState<any>(null)
  const [messagingApp, setMessagingApp] = useState<any>(null)
  const [rejectTarget, setRejectTarget] = useState<{ projectId: string; appId: string; applicantUserId?: string } | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<any>(null)
  const [contactInfoApp, setContactInfoApp] = useState<any>(null)

  // 협의 하기 팝업 안의 "확정" 버튼 활성화 여부 — 이 지원 건에 대해 실제로 메시지가 오간 적이
  // 있는지(검토중이면 아직 없음, 첫 메시지 발신 시 서버에서 approved로 자동 전환됨)로 판단한다.
  // 상대와 다른 프로젝트에서 나눈 무관한 대화 유무(receivedMessages 전체)로 판단하면, 이 지원
  // 건에 대해 한 번도 대화한 적 없어도 확정이 가능해지는 오류가 생긴다
  const messagingHasConversation = !!messagingApp && messagingApp.status !== 'pending'
  // 거절/마감/확정된 지원 건은 더 이상 새로 메시지를 보낼 수 없으므로, 팝업을 히스토리 전용으로 연다
  const messagingHistoryOnly = !!messagingApp && ['rejected', 'closed', 'confirmed'].includes(getEffectiveStatus(messagingApp))

  // snapshot of ids already viewed as of this page-load, so a row's NEW badge shows once
  // and stays gone the next time this tab is visited (mirrors the sidebar's NEW-clears-on-visit
  // behavior) instead of persisting forever until the application is decided
  const [seenIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`partnerApplicantSeen:${id}`)
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })

  useEffect(() => {
    if (!id || myProjectApplicants.length === 0) return
    try {
      const raw = localStorage.getItem(`partnerApplicantSeen:${id}`)
      const stored: string[] = raw ? JSON.parse(raw) : []
      const merged = new Set([...stored, ...myProjectApplicants.map((a: any) => a._id)])
      localStorage.setItem(`partnerApplicantSeen:${id}`, JSON.stringify(Array.from(merged)))
    } catch {}
  }, [id, myProjectApplicants])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
      if (applicantDropdownRef.current && !applicantDropdownRef.current.contains(e.target as Node)) {
        setIsApplicantOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false)
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

  const applicantOptions = useMemo(() => {
    const map = new Map<string, string>()
    myProjectApplicants.forEach((app: any) => {
      const applicantUserId = app.applicantId?._id
      if (!applicantUserId || map.has(applicantUserId)) return
      map.set(applicantUserId, app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType || '알 수 없음')
    })
    return Array.from(map, ([_id, name]) => ({ _id, name }))
  }, [myProjectApplicants])

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    )
  }

  const toggleApplicant = (applicantUserId: string) => {
    setSelectedApplicantIds(prev =>
      prev.includes(applicantUserId) ? prev.filter(id => id !== applicantUserId) : [...prev, applicantUserId]
    )
  }

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const filteredApplicants = useMemo(() => {
    let base = selectedProjectIds.length === 0
      ? myProjectApplicants
      : myProjectApplicants.filter((app: any) => {
          const project = typeof app.projectId === 'object' ? app.projectId : null
          return project?._id && selectedProjectIds.includes(project._id)
        })
    if (selectedApplicantIds.length > 0) {
      base = base.filter((app: any) => selectedApplicantIds.includes(app.applicantId?._id))
    }
    if (selectedStatuses.length > 0) {
      base = base.filter((app: any) => selectedStatuses.includes(getEffectiveStatus(app)))
    }
    // 거절된 지원 건은 더 이상 조치할 게 없으므로 테이블 맨 아래로 밀어낸다 (그 외 순서는 그대로 유지)
    return [...base].sort((a: any, b: any) =>
      (a.status === 'rejected' ? 1 : 0) - (b.status === 'rejected' ? 1 : 0)
    )
  }, [myProjectApplicants, selectedProjectIds, selectedApplicantIds, selectedStatuses])

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  if (myProjectApplicants.length === 0) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">등록된 프로젝트에 지원한 사람이 없습니다.</div>
  }

  return (
    <div>
      {/* 프로젝트명 + 진행 상태 필터 */}
      <div className="px-5 py-3 border-b border-line flex items-center gap-2">
        <div ref={dropdownRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsOpen(v => !v)}
            className="flex items-center gap-2 text-base border border-line rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
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
                  className="w-full text-left px-4 py-2 text-base text-accent hover:bg-bg-tertiary transition-colors border-b border-line/40"
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

        <div ref={applicantDropdownRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsApplicantOpen(v => !v)}
            className="flex items-center gap-2 text-base border border-line rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <span>
              {selectedApplicantIds.length === 0
                ? '모든 지원 기업'
                : `지원 기업명 (${selectedApplicantIds.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {isApplicantOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 max-h-72 overflow-y-auto bg-bg-card border border-line rounded-xl shadow-xl z-50">
              {selectedApplicantIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedApplicantIds([])}
                  className="w-full text-left px-4 py-2 text-base text-accent hover:bg-bg-tertiary transition-colors border-b border-line/40"
                >
                  선택 초기화
                </button>
              )}
              {applicantOptions.map(a => {
                const checked = selectedApplicantIds.includes(a._id)
                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => toggleApplicant(a._id)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-accent border-accent' : 'border-line'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-text-primary truncate">{a.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div ref={statusDropdownRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsStatusOpen(v => !v)}
            className="flex items-center gap-2 text-base border border-line rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <span>
              {selectedStatuses.length === 0
                ? '모든 진행 상태'
                : `진행 상태 (${selectedStatuses.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 max-h-72 overflow-y-auto bg-bg-card border border-line rounded-xl shadow-xl z-50">
              {selectedStatuses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStatuses([])}
                  className="w-full text-left px-4 py-2 text-base text-accent hover:bg-bg-tertiary transition-colors border-b border-line/40"
                >
                  선택 초기화
                </button>
              )}
              {STATUS_FILTER_OPTIONS.map(opt => {
                const checked = selectedStatuses.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-accent border-accent' : 'border-line'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-text-primary truncate">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-b-xl overflow-hidden">
      {filteredApplicants.length === 0 ? (
        <div className="px-5 py-14 text-center text-text-muted text-sm">선택한 조건에 해당하는 지원자가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr className="border-b border-line bg-bg-tertiary/50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted border-r border-line/40 w-[30.17%]">프로젝트명</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/40 w-[11.33%]">지원 기업명</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/40 w-[11.67%]">지원일</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/40 w-[8%]">지원서</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/40 w-[10%]">진행 상태</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap border-r border-line/40 w-[9%]">협의 하기</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-[9%]">거절</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.map((app: any) => {
                const project = typeof app.projectId === 'object' ? app.projectId : null
                const isExpired = !!project?.applicationDeadline && new Date(project.applicationDeadline) < new Date()
                const applicantUserId = app.applicantId?._id
                // 확정(confirmed)된 지원 건은 영구히 되돌릴 수 없고, 거절(rejected)된 지원 건도 다시
                // 거절할 필요가 없다 — 그 외엔 마감 후 신규 거절만 막는다. 승인 단계 없이 바로 메시지를
                // 주고받을 수 있으므로 대화 중이라는 이유만으로 거절을 막지는 않는다
                const isRejectLocked = ['confirmed', 'rejected'].includes(app.status) || isExpired
                // 마감된 프로젝트에서 아직 결정 안 된(확정/거절 아닌) 지원 건은 더 이상 협의할 의미가
                // 없으므로 결정 표시를 "마감"으로 바꾸고 협의 하기도 막는다 — 이미 확정/거절된 건은
                // 그 결과를 그대로 보여주는 게 더 중요하므로 건드리지 않는다
                const isClosedUndecided = isExpired && !['confirmed', 'rejected'].includes(app.status)
                const { state: rawMailState, isUnread: isUnreadRaw } = getMailButtonState(
                  receivedMessages, applicantUserId, latestMessageIdByCounterpart, messageSeenMap
                )
                // getMailButtonState는 이 상대와 나눈 대화를 프로젝트 구분 없이 전부 본다 — 그래서
                // 지원자와 예전에 다른 프로젝트로 대화한 적이 있으면, 이 지원 건에 대해 아직 아무
                // 메시지도 안 왔는데도 "받음/보냄"으로 잘못 보일 수 있다. 검토중(pending)은 이 지원
                // 건에 대해 아직 첫 메시지가 오간 적이 없다는 뜻이므로(첫 메시지 발신 시 서버에서
                // 자동으로 approved로 바뀜), 그 경우엔 무조건 "협의 시작" 상태로 고정한다
                const mailState = app.status === 'pending' ? 'none' : rawMailState
                // 거절된 지원 건, 검토중인(아직 이 건에 대해 대화가 없는) 지원 건은 안읽음 배지를 끈다
                const isUnread = isUnreadRaw && app.status !== 'rejected' && app.status !== 'pending'
                const { icon: MailIcon, label: mailLabel, className: mailClassName } = MAIL_BUTTON_CONFIG[mailState]
                return (
                  <tr key={app._id} className={`border-b border-line/40 last:border-b-0 transition-colors ${
                    app.status === 'rejected' ? 'bg-bg-tertiary/40 opacity-60 hover:opacity-100' : 'hover:bg-bg-tertiary'
                  }`}>
                    <td className="px-5 py-3 max-w-0 border-r border-line/40">
                      {project
                        ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Link href={`/partner/projects/${project._id}`} target="_blank" rel="noopener noreferrer" className="text-text-primary font-medium hover:text-accent transition-colors truncate">
                              {project.title}
                            </Link>
                            {app.status === 'pending' && !seenIds.has(app._id) && (
                              <span className="flex-shrink-0 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </span>
                        )
                        : <span className="text-text-muted text-xs">-</span>}
                    </td>
                    <td className="px-3 py-3 max-w-0 border-r border-line/40">
                      {app.applicantId?.partnerChannelId ? (
                        <Link
                          href={`/partner/${app.applicantId.partnerChannelId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-text-secondary hover:text-accent transition-colors truncate block"
                        >
                          {app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType}
                        </Link>
                      ) : (
                        <p className="text-text-muted text-xs truncate">
                          {app.applicantId?.companyInfo?.companyName || app.applicantId?.memberType}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/40">
                      {new Date(app.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-3 text-center border-r border-line/40">
                      <button
                        onClick={() => setViewingApp(app)}
                        className="text-xs px-2.5 py-1 rounded border border-line text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      >
                        보기
                      </button>
                    </td>
                    <td className="px-3 py-3 border-r border-line/40">
                      {isClosedUndecided ? (
                        <span className="text-sm font-medium text-text-muted">마감</span>
                      ) : (
                        <span className={`text-sm font-medium ${APPLICATION_STATUS_TEXT_COLORS[app.status] || APPLICATION_STATUS_TEXT_COLORS.pending}`}>
                          {DECISION_LABELS[app.status] || app.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center border-r border-line/40">
                      {app.status === 'confirmed' ? (
                        // 확정되면 협의는 끝났으므로, 협의 하기 대신 상대 연락처를 바로 볼 수 있게 한다 —
                        // 이 버튼이 확정 후 유일한 상호작용이므로, 열람 시 안읽음 배지도 함께 지운다
                        <button
                          onClick={() => {
                            setContactInfoApp(app)
                            if (applicantUserId) markMessageSeen(applicantUserId)
                          }}
                          title="연락처 열람"
                          className="relative inline-flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-600 transition-colors"
                        >
                          <Contact className="w-6 h-6" strokeWidth={2.5} />
                          <span className="text-[10px] font-bold leading-none whitespace-nowrap">연락처 열람</span>
                        </button>
                      ) : app.status === 'rejected' || isClosedUndecided ? (
                        mailState === 'none' ? (
                          // 대화가 아예 없던 지원 건은 거절/마감 이후 새로 협의를 시작할 수 없다
                          <div
                            title={app.status === 'rejected' ? '거절된 지원 건은 협의할 수 없습니다' : '마감된 프로젝트는 협의를 시작할 수 없습니다'}
                            className="flex items-center justify-center w-16 h-14"
                          >
                            <X className="w-6 h-6 text-text-muted" strokeWidth={2.5} />
                          </div>
                        ) : (
                          // 이미 나눈 대화가 있으면 새 메시지는 못 보내도 히스토리는 열람할 수 있게 한다
                          <button
                            onClick={() => {
                              setMessagingApp(app)
                              if (applicantUserId) markMessageSeen(applicantUserId)
                            }}
                            title="히스토리 보기"
                            className="relative inline-flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl bg-bg-card border border-line text-text-secondary hover:border-accent hover:text-accent transition-colors"
                          >
                            <History className="w-6 h-6" strokeWidth={2.5} />
                            <span className="text-[10px] font-bold leading-none whitespace-nowrap">히스토리</span>
                            {isUnread && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-danger rounded-full border-2 border-bg-card animate-pulse" />
                            )}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => {
                            setMessagingApp(app)
                            if (applicantUserId) markMessageSeen(applicantUserId)
                          }}
                          title="협의 하기"
                          className={`relative inline-flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors ${mailClassName}`}
                        >
                          <MailIcon className="w-6 h-6" strokeWidth={2.5} />
                          <span className="text-[10px] font-bold leading-none whitespace-nowrap">{mailLabel}</span>
                          {isUnread && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-danger rounded-full border-2 border-bg-card animate-pulse" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {project && (
                        <button
                          onClick={() => setRejectTarget({ projectId: project._id, appId: app._id, applicantUserId })}
                          disabled={isRejectLocked}
                          title={isRejectLocked ? (
                            app.status === 'confirmed' ? '확정된 지원 건은 되돌릴 수 없습니다'
                            : app.status === 'rejected' ? '이미 거절된 지원 건입니다'
                            : '마감된 프로젝트는 거절할 수 없습니다'
                          ) : undefined}
                          className="bg-red-600/20 hover:bg-red-600/30 disabled:bg-line disabled:text-text-muted disabled:cursor-not-allowed disabled:hover:bg-line text-red-400 px-2.5 py-1 rounded text-base font-medium transition-colors"
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

      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingApp(null)}>
          <div className="bg-bg-primary border border-line rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h2 className="text-text-primary font-bold text-lg">지원서</h2>
              <button onClick={() => setViewingApp(null)} className="p-2 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              <p className="text-xs text-text-muted mb-1">제목</p>
              <p className="text-text-primary text-base font-semibold">{viewingApp.title || '-'}</p>
              <div className="border-t border-line my-4" />
              <p className="text-xs text-text-muted mb-1">내용</p>
              <p className="text-text-secondary text-sm whitespace-pre-wrap">{viewingApp.content || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!rejectTarget}
        title="지원자 거절"
        message="정말 거절하시겠습니까? 거절하면 다시 되돌릴 수 없습니다."
        confirmLabel="거절"
        danger
        onConfirm={() => {
          if (rejectTarget) {
            applicantStatusMutation.mutate({ projectId: rejectTarget.projectId, appId: rejectTarget.appId, status: 'rejected' })
            // 거절하면 더 이상 확인할 대화가 아니므로, 받은 메시지가 안읽음 상태였더라도 무조건 지운다
            if (rejectTarget.applicantUserId) markMessageSeen(rejectTarget.applicantUserId)
          }
          setRejectTarget(null)
        }}
        onCancel={() => setRejectTarget(null)}
      />

      <ConfirmModal
        isOpen={!!confirmTarget}
        title="매칭 확정"
        message="이 지원자와 매칭을 확정하시겠습니까? 확정 후에는 되돌릴 수 없으며, 승인했던 다른 지원자는 자동으로 거절됩니다."
        confirmLabel="확정"
        danger
        onConfirm={() => {
          const project = confirmTarget && typeof confirmTarget.projectId === 'object' ? confirmTarget.projectId : null
          if (project) {
            applicantStatusMutation.mutate({ projectId: project._id, appId: confirmTarget._id, status: 'confirmed' })
          }
          const confirmedApplicantUserId = confirmTarget?.applicantId?._id
          if (confirmedApplicantUserId) markMessageSeen(confirmedApplicantUserId)
          setContactInfoApp(confirmTarget)
          setConfirmTarget(null)
          setMessagingApp(null)
        }}
        onCancel={() => setConfirmTarget(null)}
      />

      {contactInfoApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setContactInfoApp(null)}>
          <div className="bg-bg-card border border-line rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-line">
              <h2 className="text-text-primary font-bold text-lg">매칭이 확정됐습니다. 연락해 보세요</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-1">회사명</p>
                <p className="text-text-primary font-semibold">{contactInfoApp.applicantName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">이메일</p>
                <p className="text-text-primary font-semibold">{contactInfoApp.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">연락처</p>
                <p className="text-text-primary font-semibold">{contactInfoApp.phone || '-'}</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-line flex items-center justify-between">
              <button
                onClick={() => setMessagingApp(contactInfoApp)}
                className="flex items-center gap-1.5 px-3 py-2 border border-line text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary transition-colors"
              >
                <History className="w-4 h-4" /> 대화 히스토리
              </button>
              <button
                onClick={() => setContactInfoApp(null)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <MessageComposeModal
        isOpen={!!messagingApp}
        recipientName={messagingApp?.applicantId?.companyInfo?.companyName || messagingApp?.applicantId?.username || '지원자'}
        counterpartId={messagingApp?.applicantId?._id}
        applicationId={messagingApp?._id}
        historyOnly={messagingHistoryOnly}
        confirmMatch={messagingHistoryOnly ? undefined : {
          canConfirm: messagingHasConversation && !!messagingApp && !['rejected', 'confirmed'].includes(messagingApp.status),
          onConfirm: () => setConfirmTarget(messagingApp),
        }}
        onSend={async (content) => {
          const result = await partnerService.sendApplicationMessage(messagingApp._id, content)
          queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
          // 첫 메시지 발신 시 지원서 상태가 서버에서 pending -> approved로 자동 전환되므로,
          // 지원자 목록의 "진행 상태" 컬럼도 새로 받아와야 한다
          queryClient.invalidateQueries({ queryKey: ['partnerMyProjectApplicants'] })
          return result
        }}
        onClose={() => setMessagingApp(null)}
      />
    </div>
  )
}
