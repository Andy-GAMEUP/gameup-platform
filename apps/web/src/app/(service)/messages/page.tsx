import { Suspense } from 'react'
import MessagesPage from '@/components/pages/MessagesPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">로딩 중...</div>}>
      <MessagesPage />
    </Suspense>
  )
}
