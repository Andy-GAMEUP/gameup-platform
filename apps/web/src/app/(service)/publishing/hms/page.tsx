import type { Metadata } from 'next'
import { Suspense } from 'react'
import PublishingLandingPage from '@/components/pages/PublishingLandingPage'

export const metadata: Metadata = {
  title: 'HMS 퍼블리싱',
  description: 'HMS 퍼블리싱 프로그램',
}

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PublishingLandingPage type="hms" />
    </Suspense>
  )
}
