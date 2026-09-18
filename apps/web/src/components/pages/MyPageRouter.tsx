'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Loader2 } from 'lucide-react'
import PlayerMyPage from './PlayerMyPage'
import CorporateMyPage from './CorporateMyPage'

export default function MyPageRouter() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isAuthenticated, isLoading, router])

  if (isLoading) return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-text-muted" />
    </div>
  )
  if (!isAuthenticated || !user) return null

  // 관리자 전용 마이페이지는 없음 — role/adminLevel과 무관하게 원래 회원 유형(게임회원/기업회원)에 맞는
  // 마이페이지를 그대로 보여준다. 최고 관리자 계정도 예외 없이 동일하게 적용.
  if (user.memberType === 'corporate') return <CorporateMyPage />

  return <PlayerMyPage />
}
