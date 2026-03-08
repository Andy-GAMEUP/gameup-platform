'use client'
import { Suspense } from 'react'
import AdminPartnerTopicsPage from '@/components/pages/AdminPartnerTopicsPage'

function Loading() {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPartnerTopicsPage />
    </Suspense>
  )
}
