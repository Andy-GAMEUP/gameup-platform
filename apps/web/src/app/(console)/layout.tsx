'use client'
import React from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import DeveloperLayout from '@/components/DeveloperLayout'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const adminView = searchParams.get('adminView') === '1'

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.replace('/login'); return }
    if (user?.role === 'admin' && !adminView) { router.replace('/admin/games'); return }
  }, [isAuthenticated, isLoading, user, router, adminView])

  if (isLoading || !isAuthenticated) return null
  if (user?.role === 'admin' && !adminView) return null
  if (user?.role === 'admin' && adminView) return <>{children}</>
  return <DeveloperLayout>{children}</DeveloperLayout>
}
