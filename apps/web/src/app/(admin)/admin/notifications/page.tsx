import { Suspense } from 'react'
import AdminNotificationsPage from '@/components/pages/AdminNotificationsPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-text-secondary">로딩 중...</div>}>
      <AdminNotificationsPage />
    </Suspense>
  )
}
