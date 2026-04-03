import type { Metadata } from 'next'
import { Suspense } from 'react'
import PartnerMatchingProjectsPage from '@/components/pages/PartnerMatchingProjectsPage'

export const metadata: Metadata = {
  title: '프로젝트 마켓플레이스',
  description: '다양한 프로젝트를 탐색하고 지원하세요',
}

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerMatchingProjectsPage />
    </Suspense>
  )
}
