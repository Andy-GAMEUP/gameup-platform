'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, X, History, User, RotateCcw, Trash2 } from 'lucide-react'
import { partnerService, PartnerMessageItem } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import ConfirmModal from '@/components/ConfirmModal'

interface MessageGroup {
  rootId: string
  counterpartId: string
  senderId: PartnerMessageItem['senderId']
  latest: PartnerMessageItem
}

export default function MessageTrashSection() {
  const { id, isOwnProfile, receivedMessages } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const [historyModal, setHistoryModal] = useState<MessageGroup | null>(null)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [expandedHistoryMap, setExpandedHistoryMap] = useState<Record<string, boolean>>({})
  const [restoreConfirmGroup, setRestoreConfirmGroup] = useState<MessageGroup | null>(null)
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<MessageGroup | null>(null)

  const { data: threadData, isLoading: threadLoading } = useQuery({
    queryKey: ['partnerMessageThread', historyModal?.rootId],
    queryFn: () => partnerService.getMessageThread(historyModal!.rootId),
    enabled: !!historyModal,
  })
  const thread = threadData?.messages || []

  const restoreMutation = useMutation({
    mutationFn: (rootId: string) => partnerService.restoreMessageThread(rootId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (rootId: string) => partnerService.deleteMessageThread(rootId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
    },
  })

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  // one card per conversation ("연락하기" inquiry), matching ReceivedMessagesSection's grouping
  const groups: MessageGroup[] = []
  const seenRoots = new Set<string>()
  for (const m of receivedMessages) {
    const rootId = m.rootId || m._id
    const cid = m.senderId?._id
    if (!rootId || !cid || seenRoots.has(rootId)) continue
    seenRoots.add(rootId)
    groups.push({ rootId, counterpartId: cid, senderId: m.senderId, latest: m })
  }

  // only conversations I closed (not permanently deleted) sit in my trash — a permanently
  // deleted conversation has no restore path, so it never appears anywhere again
  const trashedGroups = groups.filter((g) => g.latest.threadStatus === 'closed' && g.latest.threadClosedByMe && !g.latest.permanentlyDeletedByMe)

  const modalSenderName = historyModal ? (historyModal.senderId?.companyName || historyModal.senderId?.username || '알 수 없음') : ''

  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-text-primary font-semibold">메시지 휴지통 ({trashedGroups.length})</h2>
      </div>
      {trashedGroups.length === 0 ? (
        <div className="px-5 py-12 text-center text-text-muted text-sm">휴지통이 비어있습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
          {trashedGroups.map((g) => {
            const senderName = g.senderId?.companyName || g.senderId?.username || '알 수 없음'
            const isExpanded = !!expandedMap[g.rootId]
            const isLongContent = (g.latest.content?.length || 0) > 80 || (g.latest.content?.match(/\n/g)?.length || 0) >= 3
            return (
              <div
                key={g.rootId}
                className="bg-bg-card border border-line rounded-2xl p-4 flex flex-col gap-3 opacity-80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-text-muted/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                    {g.senderId?.profileImage
                      ? <img src={g.senderId.profileImage} alt="" className="w-full h-full object-cover" />
                      : senderName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary font-semibold truncate">{senderName}</p>
                    <p className="text-text-muted text-xs">{new Date(g.latest.createdAt).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>

                <div className="bg-bg-tertiary/50 border border-line/60 rounded-xl px-3 py-2.5">
                  <p className={`text-sm text-text-secondary whitespace-pre-wrap break-words ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {g.latest.content}
                  </p>
                  {isLongContent && (
                    <button
                      type="button"
                      onClick={() => setExpandedMap((prev) => ({ ...prev, [g.rootId]: !prev[g.rootId] }))}
                      className="mt-1 text-xs text-accent hover:text-accent-hover font-medium"
                    >
                      {isExpanded ? '접기' : '더보기'}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={g.latest.counterpartPermanentlyDeleted}
                    onClick={() => setRestoreConfirmGroup(g)}
                    title={g.latest.counterpartPermanentlyDeleted ? '상대방이 메시지를 삭제하여 복원할 수 없습니다' : undefined}
                    className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent text-text-primary rounded-xl text-sm font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 복원하기
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmGroup(g)}
                    className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 border border-danger/40 text-danger hover:bg-danger/10 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 완전 삭제
                  </button>
                </div>
                {g.latest.counterpartPermanentlyDeleted && (
                  <p className="text-[0.65rem] text-text-muted -mt-1">상대방이 메시지를 삭제하여 복원할 수 없습니다</p>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-line/50">
                  {g.senderId?.partnerChannelId ? (
                    <Link
                      href={`/partner/${g.senderId.partnerChannelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors text-[0.65rem] font-medium"
                    >
                      <User className="w-4 h-4" /> 프로필
                    </Link>
                  ) : <div />}
                  <button
                    type="button"
                    onClick={() => setHistoryModal(g)}
                    className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors text-[0.65rem] font-medium"
                  >
                    <History className="w-4 h-4" /> 히스토리
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setHistoryModal(null)}>
          <div
            className="w-full max-w-lg max-h-[85vh] bg-bg-card border border-line rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-line bg-bg-tertiary/40">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-text-primary font-semibold truncate">{modalSenderName}님과의 히스토리</p>
              </div>
              <button type="button" onClick={() => setHistoryModal(null)} className="text-text-muted hover:text-text-primary flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {threadLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : thread.map((msg) => {
                const isFromCounterpart = msg.senderId?._id === historyModal.counterpartId
                const isHistoryExpanded = !!expandedHistoryMap[msg._id]
                const isHistoryLong = (msg.content?.length || 0) > 80 || (msg.content?.match(/\n/g)?.length || 0) >= 3
                return (
                  <div key={msg._id} className="border border-line rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary/50 border-b border-line/60">
                      <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-text-muted" />
                        보낸사람: {isFromCounterpart ? modalSenderName : '나'}
                      </span>
                      <span className="text-[0.65rem] text-text-muted flex-shrink-0">
                        {new Date(msg.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className={`text-sm text-text-secondary whitespace-pre-wrap break-words ${!isHistoryExpanded ? 'line-clamp-3' : ''}`}>
                        {msg.content}
                      </p>
                      {isHistoryLong && (
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryMap((prev) => ({ ...prev, [msg._id]: !prev[msg._id] }))}
                          className="mt-1 text-xs text-accent hover:text-accent-hover font-medium"
                        >
                          {isHistoryExpanded ? '접기' : '더보기'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!restoreConfirmGroup}
        title="대화 복원"
        message="이 대화를 복원하시겠습니까? 복원하면 다시 받은 메시지 목록에 표시되고 답장을 주고받을 수 있습니다."
        confirmLabel="복원"
        onConfirm={() => {
          if (!restoreConfirmGroup) return
          restoreMutation.mutate(restoreConfirmGroup.rootId)
          setRestoreConfirmGroup(null)
        }}
        onCancel={() => setRestoreConfirmGroup(null)}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmGroup}
        title="메시지 완전 삭제"
        message="메시지를 완전히 삭제하시겠습니까? 삭제하면 복원할 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          if (!deleteConfirmGroup) return
          deleteMutation.mutate(deleteConfirmGroup.rootId)
          setDeleteConfirmGroup(null)
        }}
        onCancel={() => setDeleteConfirmGroup(null)}
      />
    </div>
  )
}
