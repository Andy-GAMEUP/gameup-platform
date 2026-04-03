import type { Metadata } from 'next'
import { Suspense } from 'react'
import CommunityPage from '@/components/pages/CommunityPage'

export const metadata: Metadata = {
  title: '커뮤니티',
  description: '게임 커뮤니티에서 소통하세요',
}

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CommunityPage />
    </Suspense>
  )
}
