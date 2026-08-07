import { Mail, Send, Inbox, LucideIcon } from 'lucide-react'
import { PartnerMessageItem } from '@/services/partnerService'

export type MailIconState = 'none' | 'sent' | 'received'

// 색으로 상태를 구분하지 않고(흰 배경 통일), 아이콘 모양과 굵은 라벨 텍스트만으로 구분한다.
const NEUTRAL_CLASSNAME = 'bg-bg-card border border-line text-text-primary hover:border-accent hover:text-accent'

export const MAIL_BUTTON_CONFIG: Record<MailIconState, { icon: LucideIcon; label: string; className: string }> = {
  none: { icon: Mail, label: '협의 시작', className: NEUTRAL_CLASSNAME },
  sent: { icon: Send, label: '보냄', className: NEUTRAL_CLASSNAME },
  received: { icon: Inbox, label: '받음', className: NEUTRAL_CLASSNAME },
}

// 협의 하기 버튼의 우편 아이콘 상태 — 이 상대와 주고받은 메시지 중 가장 최근 것의 방향으로 결정한다.
// 배찌(안읽음 표시)는 상대가 마지막으로 보낸 메시지가 아직 "본 것"으로 표시되지 않았을 때만 뜬다.
export function getMailButtonState(
  receivedMessages: PartnerMessageItem[],
  counterpartId: string | undefined | null,
  latestMessageIdByCounterpart: Map<string, string>,
  messageSeenMap: Record<string, string>
): { state: MailIconState; isUnread: boolean } {
  if (!counterpartId) return { state: 'none', isUnread: false }

  const conversation = receivedMessages.filter((m) => m.senderId?._id === counterpartId)
  const latest = conversation.length > 0
    ? conversation.reduce((a, b) => (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b))
    : null
  const state: MailIconState = !latest ? 'none' : latest.isOutgoing ? 'sent' : 'received'

  const latestIncomingId = latestMessageIdByCounterpart.get(counterpartId)
  const isUnread = state === 'received' && !!latestIncomingId && messageSeenMap[counterpartId] !== latestIncomingId

  return { state, isUnread }
}
