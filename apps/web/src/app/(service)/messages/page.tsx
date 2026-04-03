import type { Metadata } from 'next'
import { Suspense } from 'react'
import MessagesPage from '@/components/pages/MessagesPage'

export const metadata: Metadata = {
  title: '메시지',
  description: '메시지함',
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-text-secondary">로딩 중...</div>}>
      <MessagesPage />
    </Suspense>
  )
}
