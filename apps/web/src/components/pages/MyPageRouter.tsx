'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Loader2 } from 'lucide-react'
import PlayerMyPage from './PlayerMyPage'
import PartnerMyPage from './PartnerMyPage'
import DeveloperMyPage from './DeveloperMyPage'
import AdminMyPage from './AdminMyPage'

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

  if (user.role === 'admin') return <AdminMyPage />

  if (user.role === 'developer' && user.memberType === 'corporate') {
    const companyType: string[] = (user as any)?.companyInfo?.companyType || []
    if (companyType.includes('developer')) return <DeveloperMyPage />
    return <PartnerMyPage />
  }

  return <PlayerMyPage />
}
