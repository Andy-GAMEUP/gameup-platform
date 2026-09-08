'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, ChevronLeft, ChevronRight, Plus, ImagePlus, X } from 'lucide-react'
import messageService, { ChatRoom, ChatMessage } from '@/services/messageService'
import { useAuth } from '@/lib/useAuth'
import { formatDate } from '@/lib/formatDate'
import { INQUIRY_CATEGORY_OPTIONS, inquiryCategoryLabel } from '@/constants/inquiry'
import InquiryStatusBadge from '@/components/InquiryStatusBadge'

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

type View = 'loading' | 'list' | 'compose' | 'chat'

export default function MyInquiryTab() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('loading')
  const [rooms, setRooms] = useState<ChatRoom[]>([])

  const [composeCategory, setComposeCategory] = useState('other')
  const [composeTitle, setComposeTitle] = useState('')
  const [composeContent, setComposeContent] = useState('')
  const [composeImage, setComposeImage] = useState<File | null>(null)
  const [composeImagePreview, setComposeImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const composeImageInputRef = useRef<HTMLInputElement>(null)

  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadRooms = () => {
    return messageService.getRooms()
      .then((data) => setRooms(data.rooms ?? data))
      .catch(() => {})
  }

  useEffect(() => {
    loadRooms().finally(() => setView('list'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openRoom = async (room: ChatRoom) => {
    setActiveRoom(room)
    setMessages([])
    setView('chat')
    try {
      const data = await messageService.getRoomMessages(room._id)
      const msgs: ChatMessage[] = data.messages ?? data
      setMessages([...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      messageService.markAsRead(room._id).catch(() => {})
    } catch {
      // 메시지 로드 실패 시 빈 대화로 유지
    }
  }

  const openCompose = () => {
    setComposeCategory('other')
    setComposeTitle('')
    setComposeContent('')
    setComposeImage(null)
    setComposeImagePreview(null)
    setView('compose')
  }

  const handleComposeImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setComposeImage(file)
    setComposeImagePreview(URL.createObjectURL(file))
  }

  const handleSubmitCompose = async () => {
    if (!composeTitle.trim() || !composeContent.trim() || submitting) return
    setSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (composeImage) {
        const uploaded = await messageService.uploadImage(composeImage)
        imageUrl = uploaded.url
      }
      const roomData = await messageService.getOrCreateRoom({
        category: composeCategory,
        title: composeTitle.trim(),
        content: composeContent.trim(),
        imageUrl,
      })
      await openRoom(roomData.room)
    } catch {
      // 생성 실패 시 작성 화면 유지
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    setView('list')
    setActiveRoom(null)
    setMessages([])
    loadRooms()
  }

  const handleSend = async () => {
    if (!input.trim() || !activeRoom || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    try {
      const data = await messageService.sendMessage({ roomId: activeRoom._id, type: 'text', content })
      setMessages((prev) => [...prev, data.message ?? data])
    } catch {
      setInput(content)
    } finally {
      setSending(false)
    }
  }

  if (view === 'loading') {
    return (
      <div className="bg-bg-secondary border border-line rounded-2xl p-6 flex items-center justify-center h-64 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> 불러오는 중...
      </div>
    )
  }

  if (view === 'compose') {
    return (
      <div className="bg-bg-secondary border border-line rounded-2xl">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2">
          <button onClick={() => setView('list')} className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-text-primary font-medium text-sm">새 문의 작성</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {INQUIRY_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setComposeCategory(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    composeCategory === opt.value
                      ? 'bg-accent text-text-inverse'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-line-light hover:text-text-primary border border-line'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">제목</label>
            <input
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              maxLength={60}
              placeholder="문의 제목을 입력하세요"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">내용</label>
            <textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              rows={6}
              placeholder="문의 내용을 자세히 입력해주세요"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">스크린샷 (선택)</label>
            <input ref={composeImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleComposeImageSelect} />
            {composeImagePreview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={composeImagePreview} alt="" className="max-h-40 rounded-lg border border-line" />
                <button
                  onClick={() => { setComposeImage(null); setComposeImagePreview(null) }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-primary border border-line flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => composeImageInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-line-light text-sm transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                이미지 첨부
              </button>
            )}
          </div>
          <button
            onClick={handleSubmitCompose}
            disabled={!composeTitle.trim() || !composeContent.trim() || submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-inverse font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            문의 보내기
          </button>
        </div>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="bg-bg-secondary border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-text-primary font-semibold">문의 내역</h2>
          <button
            onClick={openCompose}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-text-inverse text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            새 문의
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-muted text-sm text-center px-6">
            아직 문의 내역이 없습니다. &quot;새 문의&quot;를 눌러 시작해보세요.
          </div>
        ) : (
          <div>
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => openRoom(room)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-bg-tertiary/50 transition-colors text-left border-b border-line/50 last:border-b-0 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <InquiryStatusBadge status={room.status} />
                    <span className="text-text-primary font-medium truncate">{room.title || '(제목 없음)'}</span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">문의일 : {formatDate(room.createdAt)}</p>
                </div>
                <span className="text-text-muted text-xs flex-shrink-0">{relativeTime(room.lastMessageAt)}</span>
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary border border-line rounded-2xl flex flex-col h-[60vh]">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2">
        <button onClick={handleBack} className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <InquiryStatusBadge status={activeRoom?.status} />
        <span className="text-text-primary font-medium text-sm truncate">{activeRoom?.title || '관리자에게 문의하기'}</span>
      </div>

      {activeRoom?.content && (
        <div className="px-4 py-3 border-b border-line bg-bg-tertiary/30 flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-text-secondary text-xs font-medium mb-1">문의 내용 · {inquiryCategoryLabel(activeRoom.category)}</p>
            <p className="text-text-secondary text-sm whitespace-pre-wrap">{activeRoom.content}</p>
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
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm text-center px-6">
            문의 내용을 입력해주세요. 관리자가 확인 후 답변드립니다.
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId._id === user?.id
            return (
              <div key={msg._id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && <span className="text-text-muted text-xs mb-0.5">관리자</span>}
                  {msg.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.content} alt={msg.fileName || '첨부 이미지'} className="max-w-full max-h-64 rounded-2xl border border-line" />
                  ) : (
                    <div className={`px-4 py-2 text-sm ${isMine ? 'bg-accent text-text-inverse rounded-2xl rounded-br-sm' : 'bg-bg-tertiary text-text-primary rounded-2xl rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                  )}
                  <span className="text-text-muted text-xs mt-1">{relativeTime(msg.createdAt)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      {activeRoom?.status === 'closed' ? (
        <div className="px-4 py-3 border-t border-line text-center text-text-muted text-sm">
          종료된 문의입니다
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-line flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-bg-tertiary border border-line rounded-xl px-4 py-2 text-text-primary text-sm placeholder-text-muted outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-text-inverse" />
          </button>
        </div>
      )}

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
    </div>
  )
}
