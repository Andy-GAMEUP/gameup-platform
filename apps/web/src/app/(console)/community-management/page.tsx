'use client'
import { Suspense } from 'react'
import DeveloperCommunityManagementPage from '@/components/pages/DeveloperCommunityManagementPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-text-secondary">Loading...</div>}>
      <DeveloperCommunityManagementPage />
    </Suspense>
  )
}
