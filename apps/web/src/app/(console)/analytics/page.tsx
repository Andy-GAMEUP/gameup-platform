'use client'
import { Suspense } from 'react'
import AnalyticsPage from '@/components/pages/AnalyticsPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-text-secondary">Loading...</div>}>
      <AnalyticsPage />
    </Suspense>
  )
}
