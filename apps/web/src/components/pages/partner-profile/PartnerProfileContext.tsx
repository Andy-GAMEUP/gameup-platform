'use client'

import { createContext, useContext } from 'react'
import { UseMutationResult } from '@tanstack/react-query'
import { PartnerData } from './constants'

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
  applicantStatusMutation: UseMutationResult<any, any, { projectId: string; appId: string; status: string }>
}

export const PartnerProfileContext = createContext<PartnerProfileCtxValue | null>(null)

export function usePartnerProfileCtx() {
  const ctx = useContext(PartnerProfileContext)
  if (!ctx) throw new Error('usePartnerProfileCtx must be used within PartnerProfileShell')
  return ctx
}
