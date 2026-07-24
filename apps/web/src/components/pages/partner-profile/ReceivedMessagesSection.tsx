'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, Mail, X, History, User, Archive, Lock, Trash2 } from 'lucide-react'
import { partnerService, PartnerMessageItem } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import ConfirmModal from '@/components/ConfirmModal'

interface MessageGroup {
  rootId: string
  counterpartId: string
  senderId: PartnerMessageItem['senderId']
  latest: PartnerMessageItem
}

// shared with PartnerProfileShell's sidebar badge via the same localStorage key + event
function persistSeenMap(id: string, next: Record<string, string>) {
  try { localStorage.setItem(`partnerMessageCardSeen:${id}`, JSON.stringify(next)) } catch {}
  window.dispatchEvent(new Event('partnerMessageSeenChange'))
}

export default function ReceivedMessagesSection() {
  const { id, isOwnProfile, receivedMessages } = usePartnerProfileCtx()
  const queryClient = useQueryClient()
  const [mailModal, setMailModal] = useState<MessageGroup | null>(null)
  const [mailModalView, setMailModalView] = useState<'compose' | 'history'>('compose')
  const [replyContent, setReplyContent] = useState('')
  const [seenMap, setSeenMap] = useState<Record<string, string>>({})
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [expandedHistoryMap, setExpandedHistoryMap] = useState<Record<string, boolean>>({})
  const [closeConfirmGroup, setCloseConfirmGroup] = useState<MessageGroup | null>(null)
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<MessageGroup | null>(null)

  useEffect(() => {
    if (!id) return
    try {
      const raw = localStorage.getItem(`partnerMessageCardSeen:${id}`)
      if (raw) setSeenMap(JSON.parse(raw))
    } catch {}
  }, [id])

  const { data: threadData, isLoading: threadLoading } = useQuery({
    queryKey: ['partnerMessageThread', mailModal?.rootId],
    queryFn: () => partnerService.getMessageThread(mailModal!.rootId),
    enabled: !!mailModal,
  })
  const thread = threadData?.messages || []

  const replyMutation = useMutation({
    mutationFn: (messageId: string) => partnerService.replyToMessage(messageId, replyContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
      queryClient.invalidateQueries({ queryKey: ['partnerMessageThread', mailModal?.rootId] })
      setReplyContent('')
      setMailModal(null)
      setMailModalView('compose')
    },
  })

  const closeThreadMutation = useMutation({
    mutationFn: (rootId: string) => partnerService.closeMessageThread(rootId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
    },
  })

  const deleteThreadMutation = useMutation({
    mutationFn: (rootId: string) => partnerService.deleteMessageThread(rootId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerReceivedMessages', id] })
    },
  })

  // one card per conversation ("연락하기" inquiry), not per counterpart — the same company
  // contacting again starts a separate card instead of folding into the existing one
  const groups: MessageGroup[] = []
  const seenRoots = new Set<string>()
  for (const m of receivedMessages) {
    const rootId = m.rootId || m._id
    const cid = m.senderId?._id
    if (!rootId || !cid || seenRoots.has(rootId)) continue
    seenRoots.add(rootId)
    groups.push({ rootId, counterpartId: cid, senderId: m.senderId, latest: m })
  }

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  const closeModal = () => {
    setMailModal(null)
    setMailModalView('compose')
    setReplyContent('')
  }

  const modalSenderName = mailModal ? (mailModal.senderId?.companyName || mailModal.senderId?.username || '알 수 없음') : ''

  const markSeen = (g: MessageGroup) => {
    if (seenMap[g.rootId] === g.latest._id) return
    const next = { ...seenMap, [g.rootId]: g.latest._id }
    setSeenMap(next)
    persistSeenMap(id, next)
  }

  // a conversation I closed lives in my own trash, not here; a conversation the OTHER party
  // closed still shows up here (read-only) so I can see why replying is blocked, unless I've
  // personally erased my own copy of it
  const visibleGroups = groups.filter((g) =>
    !(g.latest.threadStatus && g.latest.threadStatus !== 'open' && g.latest.threadClosedByMe) &&
    !g.latest.permanentlyDeletedByMe
  )

  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-text-primary font-semibold">받은 메시지 ({visibleGroups.length})</h2>
      </div>
      {visibleGroups.length === 0 ? (
        <div className="px-5 py-12 text-center text-text-muted text-sm">받은 메시지가 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
          {visibleGroups.map((g) => {
            const senderName = g.senderId?.companyName || g.senderId?.username || '알 수 없음'
            // no entry yet (never opened) counts as unseen too, so a brand-new counterpart's
            // very first message is flagged NEW just like any other unread conversation
            const isNew = seenMap[g.rootId] !== g.latest._id
            const isExpanded = !!expandedMap[g.rootId]
            const isLongContent = (g.latest.content?.length || 0) > 80 || (g.latest.content?.match(/\n/g)?.length || 0) >= 3
            const isClosedByOther = !!g.latest.threadStatus && g.latest.threadStatus !== 'open'
            return (
              <div
                key={g.rootId}
                className="group relative bg-bg-card border border-line rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5"
              >
                {isNew && (
                  <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    NEW
                  </span>
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-accent/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden ring-2 ring-accent/20 group-hover:ring-accent/40 transition-all">
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

                {isClosedByOther ? (
                  <div className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-bg-tertiary text-text-muted rounded-xl text-xs font-medium">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" /> 상대방이 대화를 종료하여 답장할 수 없습니다
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyContent('')
                      setMailModalView('compose')
                      setMailModal(g)
                      markSeen(g)
                    }}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> 답장하기
                  </button>
                )}

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-line/50">
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
                    onClick={() => {
                      setReplyContent('')
                      setMailModalView('history')
                      setMailModal(g)
                      markSeen(g)
                    }}
                    className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors text-[0.65rem] font-medium"
                  >
                    <History className="w-4 h-4" /> 히스토리
                  </button>
                  {isClosedByOther ? (
                    // the other party already closed it, so I can never reopen/reply here —
                    // this just permanently erases my own copy, without touching their state
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmGroup(g)}
                      className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-[0.65rem] font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> 메시지 삭제하기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCloseConfirmGroup(g)}
                      className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors text-[0.65rem] font-medium"
                    >
                      <Archive className="w-4 h-4" /> 종료
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={closeModal}>
          <div
            className="w-full max-w-lg max-h-[85vh] bg-bg-card border border-line rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-line bg-bg-tertiary/40">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-text-primary font-semibold truncate">{modalSenderName}님에게 답장</p>
              </div>
              <button type="button" onClick={closeModal} className="text-text-muted hover:text-text-primary flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {mailModalView === 'history' ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {threadLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    </div>
                  ) : thread.map((msg) => {
                    const isFromCounterpart = msg.senderId?._id === mailModal.counterpartId
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
                <div className="px-5 py-4 border-t border-line flex items-center justify-between gap-2">
                  {mailModal.latest.threadStatus && mailModal.latest.threadStatus !== 'open' ? (
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 flex-shrink-0" /> 상대방이 대화를 종료하여 답장할 수 없습니다
                    </p>
                  ) : (
                    <button
                      onClick={() => setMailModalView('compose')}
                      className="px-3 py-1.5 border border-line text-text-secondary rounded-lg text-xs hover:bg-bg-tertiary ml-auto"
                    >
                      답장 작성으로
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="px-5 py-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setMailModalView('history')}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-line text-text-secondary rounded-lg text-xs hover:bg-bg-tertiary"
                >
                  <History className="w-3.5 h-3.5" /> 히스토리 보기
                </button>
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="답장을 입력해주세요"
                  className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
                />
                {replyMutation.isError && (
                  <p className="text-danger text-xs">
                    {(replyMutation.error as any)?.response?.data?.message || '답장 전송에 실패했습니다'}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="px-3 py-1.5 border border-line text-text-secondary rounded-lg text-xs hover:bg-bg-tertiary"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => replyContent.trim() && replyMutation.mutate(mailModal.latest._id)}
                    disabled={replyMutation.isPending || !replyContent.trim()}
                    className="flex items-center justify-center gap-1.5 px-6 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary rounded-lg text-base font-medium"
                  >
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 전송
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!closeConfirmGroup}
        title="대화 종료"
        message="이 대화를 종료하시겠습니까? 종료한 대화는 휴지통으로 이동하며, 상대방은 답장을 보낼 수 없게 됩니다."
        confirmLabel="종료"
        danger
        onConfirm={() => {
          if (!closeConfirmGroup) return
          closeThreadMutation.mutate(closeConfirmGroup.rootId)
          markSeen(closeConfirmGroup)
          setCloseConfirmGroup(null)
        }}
        onCancel={() => setCloseConfirmGroup(null)}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmGroup}
        title="메시지 완전 삭제"
        message="메시지를 완전히 삭제하시겠습니까? 삭제하면 복원할 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          if (!deleteConfirmGroup) return
          deleteThreadMutation.mutate(deleteConfirmGroup.rootId)
          markSeen(deleteConfirmGroup)
          setDeleteConfirmGroup(null)
        }}
        onCancel={() => setDeleteConfirmGroup(null)}
      />
    </div>
  )
}
