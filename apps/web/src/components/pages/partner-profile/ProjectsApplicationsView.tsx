'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, X, Contact, History } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TEXT_COLORS } from './constants'
import { partnerService } from '@/services/partnerService'
import partnerMatchingService from '@/services/partnerMatchingService'
import MessageComposeModal from '@/components/MessageComposeModal'
import ConfirmModal from '@/components/ConfirmModal'
import { getMailButtonState, MAIL_BUTTON_CONFIG } from './mailButtonState'
import { formatDate } from '@/lib/formatDate'

const formatBudget = (value: string | undefined) => {
  if (!value) return '-'
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toLocaleString('ko-KR')}원` : value
}

export default function ProjectsApplicationsView() {
  const {
    id, isOwnProfile, myApplications, receivedMessages,
    latestMessageIdByCounterpart, messageSeenMap, markMessageSeen,
  } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const [messagingApp, setMessagingApp] = useState<any>(null)
  const [cancelTarget, setCancelTarget] = useState<any>(null)
  const [contactInfoApp, setContactInfoApp] = useState<any>(null)
  // 거절/확정된 지원 건은 더 이상 새로 메시지를 보낼 수 없으므로, 팝업을 히스토리 전용으로 연다
  const messagingHistoryOnly = !!messagingApp && ['rejected', 'confirmed'].includes(messagingApp.status)

  // 확정된 지원 건의 "매칭을 축하드립니다!" 배지를 한 번 본 뒤로는 다시 안 뜨게 한다
  // (지원자 목록의 NEW 배지 seen 처리와 동일한 패턴)
  const [confirmedSeenIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`partnerApplicationConfirmedSeen:${id}`)
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })

  useEffect(() => {
    if (!id || myApplications.length === 0) return
    try {
      const raw = localStorage.getItem(`partnerApplicationConfirmedSeen:${id}`)
      const stored: string[] = raw ? JSON.parse(raw) : []
      const merged = new Set([
        ...stored,
        ...myApplications.filter((a: any) => a.status === 'confirmed').map((a: any) => a._id),
      ])
      localStorage.setItem(`partnerApplicationConfirmedSeen:${id}`, JSON.stringify(Array.from(merged)))
    } catch {}
  }, [id, myApplications])

  const cancelMutation = useMutation({
    mutationFn: (appId: string) => partnerMatchingService.cancelApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerMyApplications'] })
      setCancelTarget(null)
    },
  })

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  if (myApplications.length === 0) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">지원한 프로젝트가 없습니다.</div>
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line bg-bg-tertiary/50">
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/40">진행 상태</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24 border-r border-line/40">카테고리</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted border-r border-line/40">프로젝트명</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-32 border-r border-line/40">등록 기업명</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/40">예산</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/40">지원일</th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-28 border-r border-line/40">협의 하기</th>
            <th className="text-center px-5 py-2.5 text-xs font-semibold text-text-muted whitespace-nowrap w-24">지원 취소</th>
          </tr>
        </thead>
        <tbody>
          {myApplications.map((app: any) => {
            const project = typeof app.projectId === 'object' ? app.projectId : null
            const ownerUserId = project?.ownerId?._id || (typeof project?.ownerId === 'string' ? project.ownerId : null)
            const { state: rawMailState, isUnread: isUnreadRaw } = getMailButtonState(
              receivedMessages, ownerUserId, latestMessageIdByCounterpart, messageSeenMap
            )
            // getMailButtonState는 이 상대와 나눈 대화를 프로젝트 구분 없이 전부 본다 — 그래서 담당자와
            // 예전에 다른 프로젝트로 대화한 적이 있으면, 이 지원 건은 아직 검토중(첫 메시지도 안 온
            // 상태)인데 "받음/보냄"으로 잘못 보일 수 있다. 검토중(pending)은 이 지원 건에 대해 아직
            // 대화가 시작 안 됐다는 뜻이므로 그 경우엔 무조건 "대기 중"으로 고정한다
            const mailState = app.status === 'pending' ? 'none' : rawMailState
            // 거절된 지원 건, 검토중인(아직 이 건에 대해 대화가 없는) 지원 건은 안읽음 배지를 끈다
            const isUnread = isUnreadRaw && app.status !== 'rejected' && app.status !== 'pending'
            const { icon: MailIcon, label: mailLabel, className: mailClassName } = MAIL_BUTTON_CONFIG[mailState]
            return (
              <tr key={app._id} className="border-b border-line/40 last:border-b-0 hover:bg-bg-tertiary transition-colors">
                <td className="px-5 py-3 border-r border-line/40">
                  <span className={`text-sm font-medium ${APPLICATION_STATUS_TEXT_COLORS[app.status] || APPLICATION_STATUS_TEXT_COLORS.pending}`}>
                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </span>
                </td>
                <td className="px-3 py-3 border-r border-line/40">
                  {project?.category
                    ? <span className="text-xs text-text-muted bg-bg-tertiary border border-line px-2 py-0.5 rounded-full whitespace-nowrap">{project.category}</span>
                    : <span className="text-text-muted text-xs">-</span>}
                </td>
                <td className="px-3 py-3 max-w-0 border-r border-line/40">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {project?.title || '프로젝트 정보 없음'}
                    </p>
                    {app.status === 'confirmed' && !confirmedSeenIds.has(app._id) && (
                      <span className="flex-shrink-0 bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                        매칭 확정!!
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-3 py-3 max-w-0 border-r border-line/40">
                  {project?.ownerId?.partnerChannelId ? (
                    <Link
                      href={`/partner/${project.ownerId.partnerChannelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-secondary hover:text-accent transition-colors truncate block"
                    >
                      {project.ownerId?.companyInfo?.companyName || project.ownerId?.username || '-'}
                    </Link>
                  ) : (
                    <p className="text-text-muted text-xs truncate">
                      {project?.ownerId?.companyInfo?.companyName || project?.ownerId?.username || '-'}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/40">
                  {formatBudget(project?.budget)}
                </td>
                <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap border-r border-line/40">
                  {formatDate(app.createdAt)}
                </td>
                <td className="px-3 py-3 text-center border-r border-line/40">
                  {app.status === 'confirmed' ? (
                    // 확정되면 협의는 끝났으므로, 협의 하기 대신 프로젝트 담당자 연락처를 바로 볼 수 있게 한다 —
                    // 이 버튼이 확정 후 유일한 상호작용이므로, 열람 시 안읽음 배지도 함께 지운다
                    <button
                      onClick={() => {
                        setContactInfoApp(app)
                        if (ownerUserId) markMessageSeen(ownerUserId)
                      }}
                      title="연락처 열람"
                      className="relative inline-flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-600 transition-colors"
                    >
                      <Contact className="w-6 h-6" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold leading-none whitespace-nowrap">연락처 열람</span>
                    </button>
                  ) : app.status === 'rejected' ? (
                    mailState === 'none' ? (
                      // 대화가 아예 없던 지원 건은 거절 이후 더 이상 협의할 수 없다
                      <div
                        title="거절된 지원 건은 더 이상 협의할 수 없습니다"
                        className="flex items-center justify-center w-16 h-14"
                      >
                        <X className="w-6 h-6 text-text-muted" strokeWidth={2.5} />
                      </div>
                    ) : (
                      // 이미 나눈 대화가 있으면 새 메시지는 못 보내도 히스토리는 열람할 수 있게 한다
                      <button
                        onClick={() => {
                          setMessagingApp(app)
                          if (ownerUserId) markMessageSeen(ownerUserId)
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
                  ) : mailState === 'none' ? (
                    // 지원자는 담당자가 먼저 연락하기 전까지 대화를 시작할 수 없다
                    <div
                      title="담당자가 먼저 메시지를 보내야 대화를 시작할 수 있습니다"
                      className="inline-flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl bg-bg-card border border-line text-text-muted opacity-50 cursor-not-allowed"
                    >
                      <Clock className="w-6 h-6" strokeWidth={2.5} />
                      <span className="text-[10px] font-bold leading-none whitespace-nowrap">대기 중</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setMessagingApp(app)
                        if (ownerUserId) markMessageSeen(ownerUserId)
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
                  <button
                    onClick={() => setCancelTarget(app)}
                    disabled={app.status === 'confirmed'}
                    title={app.status === 'confirmed' ? '확정된 지원 건은 취소할 수 없습니다' : undefined}
                    className="text-xs px-2.5 py-1 rounded border border-line text-text-secondary hover:text-danger hover:border-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-text-secondary disabled:hover:border-line"
                  >
                    취소
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

    <ConfirmModal
      isOpen={!!cancelTarget}
      title="지원 취소"
      message="정말 지원을 취소하시겠습니까? 취소하면 지원서가 삭제되며, 이후 같은 프로젝트에 다시 지원할 수 있습니다."
      confirmLabel="취소하기"
      danger
      onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget._id)}
      onCancel={() => setCancelTarget(null)}
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
              <p className="text-text-primary font-semibold">
                {(typeof contactInfoApp.projectId === 'object' && (contactInfoApp.projectId.ownerId?.companyInfo?.companyName || contactInfoApp.projectId.ownerId?.username)) || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">이메일</p>
              <p className="text-text-primary font-semibold">
                {(typeof contactInfoApp.projectId === 'object' && contactInfoApp.projectId.ownerId?.email) || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">연락처</p>
              <p className="text-text-primary font-semibold">
                {(typeof contactInfoApp.projectId === 'object' && (contactInfoApp.projectId.ownerId?.companyInfo?.phone || contactInfoApp.projectId.ownerId?.contactPerson?.phone)) || '-'}
              </p>
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
      recipientName={
        (typeof messagingApp?.projectId === 'object' && (messagingApp.projectId.ownerId?.companyInfo?.companyName || messagingApp.projectId.ownerId?.username))
        || '프로젝트 담당자'
      }
      counterpartId={
        typeof messagingApp?.projectId === 'object'
          ? (messagingApp.projectId.ownerId?._id || (typeof messagingApp.projectId.ownerId === 'string' ? messagingApp.projectId.ownerId : null))
          : null
      }
      applicationId={messagingApp?._id}
      historyOnly={messagingHistoryOnly}
      onSend={async (content) => {
        const result = await partnerService.sendApplicationMessage(messagingApp._id, content)
        queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
        // 첫 메시지 발신 시 지원서 상태가 서버에서 pending -> approved로 자동 전환되므로,
        // 내가 한 지원의 "상태" 컬럼도 새로 받아와야 한다
        queryClient.invalidateQueries({ queryKey: ['partnerMyApplications'] })
        return result
      }}
      onClose={() => setMessagingApp(null)}
    />
    </>
  )
}
