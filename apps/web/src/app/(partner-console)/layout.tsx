'use client'
import React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import PartnerLayout from '@/components/PartnerLayout'

export default function PartnerConsoleLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    // 기업회원 + 승인 완료만 접근 가능
    if (user?.memberType !== 'corporate' || user?.companyInfo?.approvalStatus !== 'approved') {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading || !isAuthenticated) return null
  if (user?.memberType !== 'corporate' || user?.companyInfo?.approvalStatus !== 'approved') return null

  return <PartnerLayout>{children}</PartnerLayout>
}
