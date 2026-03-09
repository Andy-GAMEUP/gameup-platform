import type { Metadata } from 'next'
import { Suspense } from 'react'
import MiniHomeDirectoryPage from '@/components/pages/MiniHomeDirectoryPage'

export const metadata: Metadata = {
  title: '미니홈',
  description: '게임 회사 포트폴리오',
}

function Loading() {
  return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MiniHomeDirectoryPage />
    </Suspense>
  )
}
