'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Lock, X } from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'
import messageService, { ChatRoom, ChatMessage } from '@/services/messageService'
import { formatDate } from '@/lib/formatDate'
import { inquiryCategoryLabel, INQUIRY_CATEGORY_OPTIONS, INQUIRY_STATUS_LABELS } from '@/constants/inquiry'
import InquiryStatusBadge from '@/components/InquiryStatusBadge'

type UserType = 'developer' | 'partner' | 'player' | 'other'

const USER_TYPE_OPTIONS: { value: UserType; label: string }[] = [
  { value: 'developer', label: '개발사' },
  { value: 'partner', label: '파트너' },
  { value: 'player', label: '플레이어' },
]

const getUserType = (p?: ChatRoom['participants'][number]): UserType => {
  if (!p) return 'other'
  if (p.role === 'player') return 'player'
  if (p.role === 'developer') {
    const category = p.companyInfo?.companyCategory
    if (category === 'developer') return 'developer'
    if (category === 'partner') return 'partner'
    return (p.companyInfo?.companyType || []).includes('developer') ? 'developer' : 'partner'
  }
  return 'other'
}

const USER_TYPE_LABELS: Record<UserType, string> = { developer: '개발사', partner: '파트너', player: '플레이어', other: '알 수 없음' }

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return `${d}일 전`
}

const getInquirer = (room: ChatRoom) =>
  room.participants.find((p) => p.role !== 'admin') ?? room.participants[0]

export default function AdminInquiriesPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredRooms = rooms.filter((room) => {
    if (categoryFilter !== 'all' && (room.category || 'other') !== categoryFilter) return false
    if (statusFilter !== 'all' && (room.status || 'open') !== statusFilter) return false
    if (userTypeFilter !== 'all' && getUserType(getInquirer(room)) !== userTypeFilter) return false
    return true
  })

  useEffect(() => {
    messageService.getRooms()
      .then((data) => setRooms(data.rooms ?? data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeRoom) return
    messageService.getRoomMessages(activeRoom._id)
      .then((data) => {
        const msgs: ChatMessage[] = data.messages ?? data
        setMessages([...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
        messageService.markAsRead(activeRoom._id).catch(() => {})
      })
      .catch(() => {})
  }, [activeRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !activeRoom) return
    const content = input.trim()
    setInput('')
    try {
      const data = await messageService.sendMessage({ roomId: activeRoom._id, type: 'text', content })
      setMessages((prev) => [...prev, data.message ?? data])
      // 관리자가 처음 답장하면 서버에서 진행중으로 전환된다 — 화면에도 즉시 반영
      if (activeRoom.status === 'open' || !activeRoom.status) {
        setActiveRoom((prev) => prev && { ...prev, status: 'in_progress' })
        setRooms((prev) => prev.map((r) => (r._id === activeRoom._id ? { ...r, status: 'in_progress' } : r)))
      }
    } catch {}
  }

  const handleClose = async () => {
    if (!activeRoom) return
    try {
      await messageService.closeRoom(activeRoom._id)
      setActiveRoom((prev) => prev && { ...prev, status: 'closed' })
      setRooms((prev) => prev.map((r) => (r._id === activeRoom._id ? { ...r, status: 'closed' } : r)))
    } catch {}
  }

  return (
    <AdminLayout>
      <div className="space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">문의하기 관리</h1>
          <p className="text-text-muted text-sm mt-1">각 계정이 보낸 1:1 문의를 한 화면에서 확인하고 답변합니다</p>
        </div>

        <div className="flex items-center gap-2 flex-nowrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-bg-tertiary border border-line rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent flex-shrink-0"
          >
            <option value="all">전체 상태</option>
            {Object.entries(INQUIRY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-bg-tertiary border border-line rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent flex-shrink-0"
          >
            <option value="all">전체 카테고리</option>
            {INQUIRY_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            className="bg-bg-tertiary border border-line rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent flex-shrink-0"
          >
            <option value="all">전체 유저</option>
            {USER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-h-0 bg-bg-secondary border border-line rounded-xl overflow-hidden flex">
          <div className="w-80 flex-shrink-0 border-r border-line flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {filteredRooms.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                  들어온 문의가 없습니다
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const inquirer = getInquirer(room)
                  const isActive = activeRoom?._id === room._id
                  return (
                    <button
                      key={room._id}
                      onClick={() => setActiveRoom(room)}
                      className={`w-full flex flex-col gap-2 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors text-left border-b border-line/50 ${isActive ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-600' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-text-inverse text-lg font-bold overflow-hidden flex-shrink-0">
                          {inquirer?.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={inquirer.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            inquirer?.username?.[0]?.toUpperCase() ?? '?'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-primary text-sm font-medium truncate">{room.title || '(제목 없음)'}</span>
                            <InquiryStatusBadge status={room.status} />
                          </div>
                          <span className="text-text-secondary text-xs font-medium truncate block mt-0.5">
                            {inquirer?.username ?? '알 수 없음'} · {USER_TYPE_LABELS[getUserType(inquirer)]}
                          </span>
                          <p className="text-text-secondary text-[11px] font-medium mt-1">카테고리 : {inquiryCategoryLabel(room.category)}</p>
                          <p className="text-text-secondary text-[11px] font-medium mt-1">문의일 : {formatDate(room.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {activeRoom ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-3 border-b border-line bg-bg-tertiary/30">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary font-medium truncate">{activeRoom.title || '(제목 없음)'}</span>
                  {activeRoom.status !== 'closed' && (
                    <button
                      onClick={handleClose}
                      className="ml-auto flex items-center gap-2 text-sm font-semibold text-text-inverse bg-danger hover:bg-danger/80 px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Lock className="w-4 h-4" />
                      문의 닫기
                    </button>
                  )}
                </div>
              </div>

              {activeRoom.content && (
                <div className="px-4 py-3 border-b border-line bg-bg-tertiary/30 flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary text-sm font-semibold truncate">{activeRoom.title || '(제목 없음)'}</p>
                    <p className="text-text-secondary text-sm whitespace-pre-wrap mt-1">{activeRoom.content}</p>
                    <p className="text-text-secondary text-[11px] font-medium mt-1">카테고리 : {inquiryCategoryLabel(activeRoom.category)}</p>
                  </div>
                  {activeRoom.imageUrl && (
                    <button onClick={() => setLightboxImage(activeRoom.imageUrl!)} className="flex-shrink-0 ml-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeRoom.imageUrl} alt="참조 이미지" className="w-16 h-16 rounded-lg border border-line object-cover hover:opacity-80 transition-opacity" />
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg) => {
                  const isAdminMsg = msg.senderId.role === 'admin'
                  return (
                    <div key={msg._id} className={`flex items-end gap-2 ${isAdminMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`max-w-[60%] flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                        {msg.type === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={msg.content} alt={msg.fileName || '첨부 이미지'} className="max-w-full max-h-64 rounded-2xl border border-line" />
                        ) : (
                          <div className={`px-4 py-2 text-sm ${isAdminMsg ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-bg-tertiary text-text-primary rounded-2xl rounded-bl-sm'}`}>
                            {msg.content}
                          </div>
                        )}
                        <span className="text-text-muted text-xs mt-1">{relativeTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {activeRoom.status === 'closed' ? (
                <div className="px-4 py-3 border-t border-line bg-bg-tertiary/30 text-center text-text-muted text-sm">
                  종료된 문의입니다
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-line bg-bg-tertiary/30 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="답변을 입력하세요..."
                    className="flex-1 bg-bg-tertiary border border-line rounded-xl px-4 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted">
              문의를 선택하세요
            </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImage} alt="참조 이미지" className="max-w-full max-h-full rounded-lg" />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-bg-primary/80 border border-line flex items-center justify-center text-text-primary hover:text-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
