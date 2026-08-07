'use client'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Send, Mail, X, History } from 'lucide-react'
import { partnerService } from '@/services/partnerService'

interface Props {
  isOpen: boolean
  recipientName: string
  counterpartId: string | null | undefined
  // 이 지원 건의 히스토리만 가져오기 위한 id — 같은 회사와 다른 프로젝트에서 나눈 무관한
  // 대화가 섞여 보이지 않도록, 상대방 기준이 아니라 지원 건 기준으로 스레드를 조회한다
  applicationId: string | null | undefined
  onSend: (content: string) => Promise<unknown>
  onClose: () => void
  // 프로젝트 등록한 사람(파트너) 쪽에서만 전달됨 — 지원자 쪽 화면에서는 이 prop 자체를 넘기지 않아
  // 확정 버튼이 뜨지 않는다
  confirmMatch?: { canConfirm: boolean; onConfirm: () => void }
  // 거절/마감/확정 등 더 이상 새로 메시지를 보낼 수 없는 지원 건에서 쓰는 모드 — 작성 화면 없이
  // 히스토리만 읽기 전용으로 보여준다
  historyOnly?: boolean
}

// 지원자 목록/내가 한 지원의 "협의 하기" 버튼에서 쓰는 공용 모달 — 새 메시지 작성과 그 상대와의
// 히스토리 열람을 한 곳에서 처리한다. 답장/대화 상태는 여기서 다루지 않고, 매번 새 메시지를
// 보내는 방식(sendApplicationMessage)만 지원한다.
export default function MessageComposeModal({ isOpen, recipientName, counterpartId, applicationId, onSend, onClose, confirmMatch, historyOnly }: Props) {
  const [content, setContent] = useState('')
  const [view, setView] = useState<'compose' | 'history'>(historyOnly ? 'history' : 'compose')
  const [expandedHistoryMap, setExpandedHistoryMap] = useState<Record<string, boolean>>({})
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const displayView = historyOnly ? 'history' : view

  // 히스토리 탭을 눌러야만 로딩되던 것을 모달을 열자마자 미리 받아와서, 작성 화면에서도
  // 이 지원 건에서 오간 직전 메시지(발신자 무관)를 바로 보여줄 수 있게 한다
  const { data: threadData, isLoading: threadLoading } = useQuery({
    queryKey: ['partnerMessageThreadByApplication', applicationId],
    queryFn: () => partnerService.getMessageThreadByApplication(applicationId!),
    enabled: isOpen && !!applicationId,
  })
  const thread = threadData?.messages || []
  // thread는 오래된순 정렬이므로 마지막 항목이 방향과 무관한 가장 최근 메시지
  const latestMessage = thread.length > 0 ? thread[thread.length - 1] : null
  const isLatestFromCounterpart = latestMessage?.senderId?._id === counterpartId
  const isPreviewLong = !!latestMessage &&
    ((latestMessage.content?.length || 0) > 80 || (latestMessage.content?.match(/\n/g)?.length || 0) >= 3)

  const sendMutation = useMutation({
    mutationFn: () => onSend(content),
    onSuccess: () => handleClose(),
  })

  const handleClose = () => {
    setContent('')
    setView('compose')
    setIsPreviewExpanded(false)
    sendMutation.reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-lg max-h-[85vh] bg-bg-card border border-line rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-line bg-bg-tertiary/40">
          <div className="flex items-center gap-2 min-w-0">
            {historyOnly ? <History className="w-4 h-4 text-accent flex-shrink-0" /> : <Mail className="w-4 h-4 text-accent flex-shrink-0" />}
            <p className="text-text-primary font-semibold truncate">
              {historyOnly ? `${recipientName}님과의 대화 히스토리` : `${recipientName}님에게 메시지`}
            </p>
          </div>
          <button type="button" onClick={handleClose} className="text-text-muted hover:text-text-primary flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {displayView === 'history' ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {threadLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : thread.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-8">주고받은 메시지가 없습니다.</p>
              ) : thread.map((msg) => {
                const isFromCounterpart = msg.senderId?._id === counterpartId
                const isHistoryExpanded = !!expandedHistoryMap[msg._id]
                const isHistoryLong = (msg.content?.length || 0) > 80 || (msg.content?.match(/\n/g)?.length || 0) >= 3
                return (
                  <div key={msg._id} className="border border-line rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary/50 border-b border-line/60">
                      <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-text-muted" />
                        보낸사람: {isFromCounterpart ? recipientName : '나'}
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
            {!historyOnly && (
              <div className="px-5 py-4 border-t border-line flex items-center justify-end">
                <button
                  onClick={() => setView('compose')}
                  className="px-3 py-1.5 border border-line text-text-secondary rounded-lg text-xs hover:bg-bg-tertiary"
                >
                  메시지 작성으로
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-5 py-4 space-y-2">
            {threadLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
              </div>
            ) : latestMessage && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1.5">이전 메시지</p>
                <div className="border border-line rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary/50 border-b border-line/60">
                    <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-text-muted" />
                      {isLatestFromCounterpart ? recipientName : '나'}
                    </span>
                    <span className="text-[0.65rem] text-text-muted flex-shrink-0">
                      {new Date(latestMessage.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className={`text-sm text-text-secondary whitespace-pre-wrap break-words ${!isPreviewExpanded ? 'line-clamp-3' : ''}`}>
                      {latestMessage.content}
                    </p>
                    {isPreviewLong && (
                      <button
                        type="button"
                        onClick={() => setIsPreviewExpanded((v) => !v)}
                        className="mt-1 text-xs text-accent hover:text-accent-hover font-medium"
                      >
                        {isPreviewExpanded ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setView('history')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-line text-text-secondary rounded-lg text-xs hover:bg-bg-tertiary"
              >
                <History className="w-3.5 h-3.5" /> 히스토리 보기
              </button>
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1.5">메시지 보내기</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder={
                (!threadLoading && thread.length === 0 ? '프로젝트 협업을 위한 첫 대화를 시작해보세요' : '전달할 메시지를 입력해주세요')
                + '\n이메일 주소, 전화 번호 등을 보내지 못할 수 있습니다.'
              }
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            />
            {sendMutation.isError && (
              <p className="text-danger text-xs">
                {(sendMutation.error as any)?.response?.data?.message || '메시지 전송에 실패했습니다'}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              {confirmMatch ? (
                <button
                  type="button"
                  onClick={confirmMatch.onConfirm}
                  disabled={!confirmMatch.canConfirm}
                  title={!confirmMatch.canConfirm ? '대화가 있는 지원자만 확정할 수 있습니다' : undefined}
                  className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-line disabled:text-text-muted disabled:cursor-not-allowed text-white rounded-lg text-base font-bold transition-colors"
                >
                  매칭 확정
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={handleClose} className="px-4 py-2 border border-line text-text-secondary rounded-lg text-sm hover:bg-bg-tertiary">취소</button>
                <button
                  onClick={() => content.trim() && sendMutation.mutate()}
                  disabled={sendMutation.isPending || !content.trim()}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary rounded-lg text-sm font-medium"
                >
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 보내기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
