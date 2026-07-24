'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Bell, Megaphone, BookOpen, MessageCircle, Users, Handshake, Settings } from 'lucide-react'
import notificationService, { AppNotification } from '@/services/notificationService'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  all: '전체', notice: '공지', publishing: '퍼블리싱', comment: '댓글', follow: '팔로우', proposal: '제안', system: '시스템'
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  notice: Megaphone, publishing: BookOpen, comment: MessageCircle, follow: Users, proposal: Handshake, system: Settings
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function AppealModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await notificationService.submitAppeal(content.trim())
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-5 shadow-2xl">
        {done ? (
          <>
            <p className="text-text-primary text-sm mb-4">이의 신청이 접수되었습니다.</p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-3 py-1.5 text-base text-white bg-accent rounded-lg">확인</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-text-primary font-semibold mb-3">이의 신청</h3>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="이의 신청 내용을 입력해주세요"
              rows={4}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none resize-none mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-base text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
              <button onClick={submit} disabled={loading || !content.trim()}
                className="px-3 py-1.5 text-base text-white bg-accent rounded-lg disabled:opacity-50">
                {loading ? '전송 중...' : '보내기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState('all')
  const [appealOpen, setAppealOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    notificationService.getNotifications({ limit: 50 })
      .then((data) => setNotifications(data.notifications ?? data))
      .catch(() => {})
  }, [isOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  if (appealOpen) return <AppealModal onClose={() => setAppealOpen(false)} />

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleRead = async (n: AppNotification) => {
    if (!n.isRead) {
      await notificationService.markAsRead(n._id).catch(() => {})
      setNotifications((prev) => prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item))
    }
    if (n.linkUrl) window.location.href = n.linkUrl
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
      <div ref={panelRef} className="w-96 max-w-full h-full bg-bg-secondary border-l border-line flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            <span className="text-text-primary font-bold">알림</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleMarkAll} className="text-base text-text-secondary hover:text-text-primary transition-colors">
              모두 읽음
            </button>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-line flex gap-1 flex-wrap flex-shrink-0">
          {Object.keys(TYPE_LABELS).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-base font-medium transition-colors ${filter === key ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
            >
              {TYPE_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              알림이 없습니다
            </div>
          ) : (
            filtered.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell
              return (
                <div
                  key={n._id}
                  onClick={() => handleRead(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-line hover:bg-bg-tertiary/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-bg-tertiary/30' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.isRead ? 'bg-red-600/20' : 'bg-bg-tertiary'}`}>
                    <Icon className={`w-4 h-4 ${!n.isRead ? 'text-red-400' : 'text-text-secondary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* 1줄: 제목 */}
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</p>
                    {/* 2줄: 내용 */}
                    {n.content && (
                      <p className="text-text-secondary text-xs mt-1 leading-relaxed break-words whitespace-pre-wrap">{n.content}</p>
                    )}
                    {/* 3줄: 시간 + 이의신청 */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-text-muted text-xs">{relativeTime(n.createdAt)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAppealOpen(true) }}
                        className="text-base text-text-muted hover:text-accent transition-colors border border-line rounded px-2 py-0.5"
                      >
                        이의 신청
                      </button>
                    </div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
