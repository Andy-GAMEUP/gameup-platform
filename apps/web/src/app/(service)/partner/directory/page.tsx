import type { Metadata } from 'next'
import { Suspense } from 'react'
import PartnerMatchingDirectoryPage from '@/components/pages/PartnerMatchingDirectoryPage'

export const metadata: Metadata = {
  title: '파트너 디렉토리',
  description: '검증된 전문가와 개발사를 찾아보세요',
}

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerMatchingDirectoryPage />
    </Suspense>
  )
}
