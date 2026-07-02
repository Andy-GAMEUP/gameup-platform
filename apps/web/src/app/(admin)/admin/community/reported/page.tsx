'use client'
import { useCallback, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { ReportedPostsTab, ReportedCommentsTab, Toast } from '@/components/pages/AdminCommunityPage'
import { ReportedUsersTab } from '@/app/(admin)/admin/community/reported/blacklist/page'

type Tab = 'posts' | 'comments' | 'users'

export default function Page() {
  const [tab, setTab] = useState<Tab>('posts')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AdminLayout>
      {toast && <Toast {...toast} />}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-text-primary">신고 게시물 관리</h2>
        <p className="text-text-muted text-sm mt-1">커뮤니티에서 신고 접수된 게시글과 댓글을 검토하고 처리합니다</p>
      </div>
      <div className="flex gap-1 mb-4 border-b border-line">
        <button
          onClick={() => setTab('posts')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'posts'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          게시글
        </button>
        <button
          onClick={() => setTab('comments')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'comments'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          댓글
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'users'
              ? 'border-accent text-accent-text'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          블랙리스트
        </button>
      </div>
      {tab === 'posts' && <ReportedPostsTab showToast={showToast} />}
      {tab === 'comments' && <ReportedCommentsTab showToast={showToast} />}
      {tab === 'users' && <ReportedUsersTab />}
    </AdminLayout>
  )
}
