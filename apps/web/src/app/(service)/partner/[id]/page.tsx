'use client'
import { Suspense } from 'react'
import PartnerChannelPage from '@/components/pages/PartnerChannelPage'

function Loading() {
  return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PartnerChannelPage />
    </Suspense>
  )
}
