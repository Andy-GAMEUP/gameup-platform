'use client'
import React, { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import DeveloperLayout from '@/components/DeveloperLayout'

function ConsoleLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const adminView = searchParams.get('adminView') === '1'

  const _companyCategory = (user as any)?.companyInfo?.companyCategory || ''
  const _companyType: string[] = (user as any)?.companyInfo?.companyType ?? []
  const _isDeveloperCompany = _companyCategory === 'developer' || (!_companyCategory && _companyType.includes('developer'))
  const isPartner = user?.memberType === 'corporate'
    && user?.role !== 'developer'
    && !_isDeveloperCompany

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.replace('/login'); return }
    if (user?.role === 'admin' && !adminView) { router.replace('/admin/games'); return }
    if (isPartner) { router.replace('/'); return }
  }, [isAuthenticated, isLoading, user, router, adminView, isPartner])

  if (isLoading || !isAuthenticated) return null
  if (user?.role === 'admin' && !adminView) return null
  if (isPartner) return null
  if (user?.role === 'admin' && adminView) return <>{children}</>
  return <DeveloperLayout>{children}</DeveloperLayout>
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ConsoleLayoutInner>{children}</ConsoleLayoutInner>
    </Suspense>
  )
}
