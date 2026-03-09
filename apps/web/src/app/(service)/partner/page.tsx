import type { Metadata } from 'next'
import { Suspense } from 'react'
import PartnerDirectoryPage from '@/components/pages/PartnerDirectoryPage'

export const metadata: Metadata = {
  title: '파트너 채널',
  description: '파트너 개발사의 최신 소식',
}

function Loading() {
  return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerDirectoryPage />
    </Suspense>
  )
}
