'use client'
import { Suspense } from 'react'
import PaymentFailPage from '@/components/pages/PaymentFailPage'

function Loading() {
  return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><div className="text-text-secondary">Loading...</div></div>
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentFailPage />
    </Suspense>
  )
}
