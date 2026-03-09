import type { Metadata } from 'next'
import { Suspense } from 'react'
import SupportIntroPage from '@/components/pages/SupportIntroPage'

export const metadata: Metadata = {
  title: '지원 프로그램',
  description: '인디 게임 지원 프로그램',
}

function Loading() {
  return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SupportIntroPage />
    </Suspense>
  )
}
