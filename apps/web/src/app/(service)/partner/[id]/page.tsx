'use client'
import { Suspense } from 'react'
import PartnerMatchingProfilePage from '@/components/pages/PartnerMatchingProfilePage'

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerMatchingProfilePage />
    </Suspense>
  )
}
