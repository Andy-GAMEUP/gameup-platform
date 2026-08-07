'use client'

import { createContext, useContext } from 'react'
import { UseMutationResult } from '@tanstack/react-query'
import { PartnerData } from './constants'
import { PartnerMessageItem } from '@/services/partnerService'

export interface PartnerProfileCtxValue {
  id: string
  partner: PartnerData
  isOwnProfile: boolean
  isTeamMember: boolean
  canEdit: boolean
  posts: any[]
  userProjects: any[]
  myApplications: any[]
  myProjectApplicants: any[]
  participatingProjectCount: number
  completedParticipatingProjectCount: number
  isDeveloperCompany: boolean
  developerGames: any[]
  receivedMessages: PartnerMessageItem[]
  hasUnreadMessage: boolean
  // hasUnreadMessage를 상대 역할별로 쪼갠 것 — 지원자 목록 탭은 지원자가 보낸 안읽음만,
  // 내가 한 지원 탭은 프로젝트 소유자가 보낸 안읽음만 봐야 하므로 구분해서 내려준다
  hasUnreadFromApplicants: boolean
  hasUnreadFromOwners: boolean
  // counterpartId -> latest *incoming* (non-outgoing, still-visible) message id — used to tell
  // whether that counterpart's latest message has been seen yet (messageSeenMap[counterpartId]
  // matches it or not). Shared by ReceivedMessagesSection and the 협의 하기 mail icon/badge.
  latestMessageIdByCounterpart: Map<string, string>
  messageSeenMap: Record<string, string>
  markMessageSeen: (counterpartId: string) => void
  applicantStatusMutation: UseMutationResult<any, any, { projectId: string; appId: string; status: string }>
}

export const PartnerProfileContext = createContext<PartnerProfileCtxValue | null>(null)

export function usePartnerProfileCtx() {
  const ctx = useContext(PartnerProfileContext)
  if (!ctx) throw new Error('usePartnerProfileCtx must be used within PartnerProfileShell')
  return ctx
}
