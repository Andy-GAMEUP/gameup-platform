'use client'
import { Suspense } from 'react'
import AdminSupportSeasonsPage from '@/components/pages/AdminSupportSeasonsPage'

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminSupportSeasonsPage />
    </Suspense>
  )
}
