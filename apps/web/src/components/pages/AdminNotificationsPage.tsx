'use client'
import { useState, useEffect } from 'react'
import notificationService, { AppNotification } from '@/services/notificationService'

const TYPES = ['system', 'notice', 'publishing', 'comment', 'follow', 'proposal']

const TYPE_LABELS: Record<string, string> = {
  system: '시스템', notice: '공지', publishing: '퍼블리싱', comment: '댓글', follow: '팔로우', proposal: '제안'
}

const TYPE_COLORS: Record<string, string> = {
  system: 'bg-slate-700 text-slate-300', notice: 'bg-blue-700/30 text-blue-300',
  publishing: 'bg-purple-700/30 text-purple-300', comment: 'bg-green-700/30 text-green-300',
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
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-white text-2xl font-bold">알림 관리</h1>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">알림 발송</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm block mb-1">타입</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-red-500/50"
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
              <span className="text-slate-300 text-sm">전체 발송</span>
            </label>
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="알림 제목"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-red-500/50"
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="알림 내용"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-red-500/50 resize-none"
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1">링크 URL (선택)</label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-red-500/50"
          />
        </div>

        {sendResult === 'success' && <p className="text-green-400 text-sm">알림이 발송되었습니다.</p>}
        {sendResult === 'error' && <p className="text-red-400 text-sm">발송 실패. 다시 시도해주세요.</p>}

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !content.trim()}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {sending ? '발송 중...' : '발송'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold text-lg">발송 이력</h2>

        {loading ? (
          <p className="text-slate-400 text-sm">로딩 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-2 pr-4 w-24">타입</th>
                  <th className="text-left text-slate-400 font-medium py-2 pr-4">제목</th>
                  <th className="text-left text-slate-400 font-medium py-2 pr-4">내용</th>
                  <th className="text-left text-slate-400 font-medium py-2 w-32">날짜</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="text-slate-500 py-6 text-center">발송 이력이 없습니다</td></tr>
                ) : (
                  history.map((n) => (
                    <tr key={n._id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[n.type] ?? 'bg-slate-700 text-slate-300'}`}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white max-w-[200px] truncate">{n.title}</td>
                      <td className="py-3 pr-4 text-slate-400 max-w-[250px] truncate">{n.content}</td>
                      <td className="py-3 text-slate-500 text-xs whitespace-nowrap">
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
            >
              이전
            </button>
            <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm rounded-lg transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
