'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import notificationService, { AppNotification } from '@/services/notificationService'

const TYPES = ['system', 'notice', 'publishing', 'comment', 'follow', 'proposal']

const TYPE_LABELS: Record<string, string> = {
  system: '시스템', notice: '공지', publishing: '퍼블리싱', comment: '댓글', follow: '팔로우', proposal: '제안'
}

const TYPE_COLORS: Record<string, string> = {
  system: 'bg-bg-tertiary text-text-secondary', notice: 'bg-blue-700/30 text-blue-300',
  publishing: 'bg-purple-700/30 text-purple-300', comment: 'bg-green-700/30 text-accent',
  follow: 'bg-yellow-700/30 text-yellow-300', proposal: 'bg-orange-700/30 text-orange-300'
}

export default function AdminNotificationsPage() {
  const [type, setType] = useState('system')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [broadcast, setBroadcast] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const [history, setHistory] = useState<AppNotification[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchHistory = (p: number) => {
    setLoading(true)
    notificationService.admin.getNotifications({ page: p, limit: 20 })
      .then((data) => {
        setHistory(data.notifications ?? data)
        setTotalPages(data.totalPages ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHistory(page) }, [page])

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return
    setSending(true)
    setSendResult(null)
    try {
      await notificationService.admin.sendNotification({ type, title, content, linkUrl: linkUrl || undefined, broadcast })
      setSendResult('success')
      setTitle(''); setContent(''); setLinkUrl('')
      fetchHistory(1); setPage(1)
    } catch {
      setSendResult('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminLayout>
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-text-primary text-2xl font-bold">알림 관리</h1>

      <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-4">
        <h2 className="text-text-primary font-semibold text-lg">알림 발송</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-text-secondary text-sm block mb-1">타입</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-muted"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={broadcast}
                onChange={(e) => setBroadcast(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-text-secondary text-sm">전체 발송</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="알림 제목"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-accent-muted"
          />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="알림 내용"
            rows={3}
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-accent-muted resize-none"
          />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">링크 URL (선택)</label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-accent-muted"
          />
        </div>

        {sendResult === 'success' && <p className="text-accent text-sm">알림이 발송되었습니다.</p>}
        {sendResult === 'error' && <p className="text-accent-text text-sm">발송 실패. 다시 시도해주세요.</p>}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !content.trim()}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-text-primary text-sm font-medium rounded-lg transition-colors"
        >
          {sending ? '발송 중...' : '발송'}
        </button>
      </div>

      <div className="bg-bg-secondary border border-line rounded-xl p-6 space-y-4">
        <h2 className="text-text-primary font-semibold text-lg">발송 이력</h2>

        {loading ? (
          <p className="text-text-secondary text-sm">로딩 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-text-secondary font-medium py-2 pr-4 w-24">타입</th>
                  <th className="text-left text-text-secondary font-medium py-2 pr-4">제목</th>
                  <th className="text-left text-text-secondary font-medium py-2 pr-4">내용</th>
                  <th className="text-left text-text-secondary font-medium py-2 w-32">날짜</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="text-text-muted py-6 text-center">발송 이력이 없습니다</td></tr>
                ) : (
                  history.map((n) => (
                    <tr key={n._id} className="border-b border-line hover:bg-bg-tertiary/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[n.type] ?? 'bg-bg-tertiary text-text-secondary'}`}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-primary max-w-[200px] truncate">{n.title}</td>
                      <td className="py-3 pr-4 text-text-secondary max-w-[250px] truncate">{n.content}</td>
                      <td className="py-3 text-text-muted text-xs whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-2 pt-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-line-light disabled:opacity-40 text-text-secondary text-sm rounded-lg transition-colors"
            >
              이전
            </button>
            <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-line-light disabled:opacity-40 text-text-secondary text-sm rounded-lg transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  )
}
