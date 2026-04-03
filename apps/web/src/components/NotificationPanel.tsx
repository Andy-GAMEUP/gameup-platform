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

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState('all')
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

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleClick = async (n: AppNotification) => {
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
            <button onClick={handleMarkAll} className="text-xs text-text-secondary hover:text-text-primary transition-colors">
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === key ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
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
                <button
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-line hover:bg-bg-tertiary/50 transition-colors text-left ${!n.isRead ? 'bg-bg-tertiary/30' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-red-600/20' : 'bg-bg-tertiary'}`}>
                    <Icon className={`w-4 h-4 ${!n.isRead ? 'text-red-400' : 'text-text-secondary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.isRead ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>{n.title}</p>
                    <p className="text-text-secondary text-xs mt-0.5 truncate">{n.content}</p>
                    <p className="text-text-muted text-xs mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
