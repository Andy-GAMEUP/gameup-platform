'use client'
import { useCallback, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { DeletedArchiveTab, Toast } from '@/components/pages/AdminCommunityPage'

export default function Page() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AdminLayout>
      {toast && <Toast {...toast} />}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-text-primary">삭제 게시물 관리</h2>
        <p className="text-text-muted text-sm mt-1">커뮤니티에서 관리자에 의해 삭제된 게시물과 댓글을 보관합니다</p>
      </div>
      <DeletedArchiveTab showToast={showToast} />
    </AdminLayout>
  )
}
