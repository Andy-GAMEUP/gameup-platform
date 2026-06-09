'use client'
import { useCallback, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { ReportedCommentsTab, Toast } from '@/components/pages/AdminCommunityPage'

export default function Page() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AdminLayout>
      {toast && <Toast {...toast} />}
      <ReportedCommentsTab showToast={showToast} />
    </AdminLayout>
  )
}
