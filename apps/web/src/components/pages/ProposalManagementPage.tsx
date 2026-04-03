'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Handshake, Inbox, Send, Check, X, Clock, Loader2, ChevronDown } from 'lucide-react'
import minihomeService from '@/services/minihomeService'
import type { Proposal } from '@/services/minihomeService'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  accepted: { label: '수락됨', className: 'bg-accent-light text-accent border-accent-muted' },
  rejected: { label: '거절됨', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
}

const TYPE_LABEL: Record<string, string> = {
  investment: '투자 제안',
  publishing: '퍼블리싱 제안',
}

type Direction = 'received' | 'sent'

export default function ProposalManagementPage() {
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState<Direction>('received')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', direction],
    queryFn: () => minihomeService.getMyProposals({ direction }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      minihomeService.updateProposalStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })

  const proposals: Proposal[] = data?.proposals || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">제안 관리</h2>
        <p className="text-text-secondary">받은 제안과 보낸 제안을 관리하세요</p>
      </div>

      {/* Direction Tabs */}
      <div className="flex gap-2 border-b border-line pb-3">
        {([
          { key: 'received' as Direction, label: '받은 제안', icon: <Inbox className="w-4 h-4" /> },
          { key: 'sent' as Direction, label: '보낸 제안', icon: <Send className="w-4 h-4" /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDirection(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              direction === tab.key
                ? 'bg-accent text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Handshake className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>{direction === 'received' ? '받은 제안이 없습니다' : '보낸 제안이 없습니다'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => {
            const badge = STATUS_BADGE[proposal.status] || STATUS_BADGE.pending
            const isExpanded = expandedId === proposal._id

            return (
              <div key={proposal._id} className="bg-bg-secondary border border-line rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : proposal._id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-bg-tertiary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">
                        {TYPE_LABEL[proposal.type] || proposal.type}
                      </span>
                    </div>
                    <h4 className="text-text-primary font-medium text-sm truncate">{proposal.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                      {direction === 'received' ? (
                        <span>보낸 사람: {proposal.fromUserId?.username || '알 수 없음'}</span>
                      ) : (
                        <span>받는 곳: {proposal.toMinihomeId?.companyName || '알 수 없음'}</span>
                      )}
                      <span>{relativeTime(proposal.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-line">
                    <div className="mt-4">
                      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{proposal.content}</p>
                    </div>

                    {proposal.gameId && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary bg-bg-tertiary/50 px-3 py-2 rounded-lg">
                        <span>관련 게임:</span>
                        <span className="text-text-primary font-medium">{typeof proposal.gameId === 'object' ? (proposal.gameId as any).title : proposal.gameId}</span>
                      </div>
                    )}

                    {direction === 'received' && proposal.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => statusMutation.mutate({ id: proposal._id, status: 'accepted' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" /> 수락
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: proposal._id, status: 'rejected' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-400 hover:bg-red-950 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> 거절
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
