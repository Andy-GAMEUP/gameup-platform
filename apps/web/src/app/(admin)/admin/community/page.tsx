'use client'
import { Suspense } from 'react'
import AdminCommunityPage from '@/components/pages/AdminCommunityPage'

function Loading() {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminCommunityPage />
    </Suspense>
  )
}
