import type { Metadata } from 'next'
import { Suspense } from 'react'
import PartnerMatchingMainPage from '@/components/pages/PartnerMatchingMainPage'

export const metadata: Metadata = {
  title: '파트너 매칭',
  description: '최적의 프로젝트와 파트너를 연결하는 스마트 매칭 서비스',
}

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerMatchingMainPage />
    </Suspense>
  )
}
