'use client'
import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import Navbar from '@/components/Navbar'
import messageService, { ChatRoom, ChatMessage } from '@/services/messageService'
import { useAuth } from '@/lib/useAuth'

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

export default function MessagesPage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    } catch {}
  }

  const getOtherParticipant = (room: ChatRoom) =>
    room.participants.find((p) => p._id !== user?.id) ?? room.participants[0]

  return (
    <>
    <Navbar />
    <div className="flex h-[calc(100vh-64px)] bg-bg-primary">
      <div className="w-80 flex-shrink-0 border-r border-line flex flex-col">
        <div className="px-4 py-4 border-b border-line">
          <h2 className="text-text-primary font-bold text-lg">메시지</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              대화가 없습니다
            </div>
          ) : (
            rooms.map((room) => {
              const other = getOtherParticipant(room)
              const isActive = activeRoom?._id === room._id
              return (
                <button
                  key={room._id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors text-left border-b border-line/50 ${isActive ? 'bg-red-500/10 border-l-2 border-l-red-500/30' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-text-primary text-sm font-bold flex-shrink-0">
                    {other?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-text-primary text-sm font-medium truncate">{other?.username ?? '알 수 없음'}</span>
                      {room.lastMessageAt && (
                        <span className="text-text-muted text-xs ml-1 flex-shrink-0">{relativeTime(room.lastMessageAt)}</span>
                      )}
                    </div>
                    <p className="text-text-secondary text-xs truncate mt-0.5">
                      {room.lastMessage ? room.lastMessage.slice(0, 30) : ''}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-line flex items-center gap-3 bg-bg-secondary/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-text-primary text-sm font-bold">
              {getOtherParticipant(activeRoom)?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-text-primary font-medium">{getOtherParticipant(activeRoom)?.username ?? '알 수 없음'}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => {
              const isMine = msg.senderId._id === user?.id
              return (
                <div key={msg._id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-text-primary text-xs font-bold flex-shrink-0">
                      {msg.senderId.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className={`max-w-[60%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 text-sm ${isMine ? 'bg-red-600 text-text-primary rounded-2xl rounded-br-sm' : 'bg-bg-tertiary text-text-primary rounded-2xl rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                    <span className="text-text-muted text-xs mt-1">{relativeTime(msg.createdAt)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-line bg-bg-secondary/50 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-bg-tertiary border border-line rounded-xl px-4 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-red-500/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-10 h-10 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-text-primary" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          대화를 선택하세요
        </div>
      )}
    </div>
    </>
  )
}
