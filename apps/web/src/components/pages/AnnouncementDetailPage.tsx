'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import adminService, { PublicAnnouncement } from '@/services/adminService'
import { ArrowLeft, Loader2, Pin, Shield, Eye, Share2, CheckCircle } from 'lucide-react'

const TYPE_MAP: Record<string, { label: string; cls: string }> = {
  notice:      { label: '공지',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' },
  event:       { label: '이벤트',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-600/30 dark:text-purple-300' },
  maintenance: { label: '점검',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-300' },
  update:      { label: '업데이트', cls: 'bg-green-100 text-green-700 dark:bg-green-600/30 dark:text-green-300' },
}

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromLabel = searchParams.get('from') || '커뮤니티'
  const [announcement, setAnnouncement] = useState<PublicAnnouncement | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const showToast = (msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!id) return
    adminService.getPublicAnnouncementById(id)
      .then(d => setAnnouncement(d.announcement))
      .catch(() => setAnnouncement(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); showToast('링크가 복사되었습니다') }
    catch { showToast('링크 복사 실패', false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
    </div>
  )
  if (!announcement) return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="text-center py-24"><p className="text-text-secondary">공지사항을 찾을 수 없습니다</p></div>
    </div>
  )

  const typeInfo = TYPE_MAP[announcement.type] ?? TYPE_MAP.notice

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-base mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {fromLabel}
        </button>

        <article className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8 mb-4">
          {/* 배지 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {announcement.isPinned && (
              <span className="bg-accent-light text-accent text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <Pin className="w-3 h-3" /> 고정
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.cls}`}>{typeInfo.label}</span>
          </div>

          {/* 제목 */}
          <h1 className="text-text-primary text-xl sm:text-2xl lg:text-3xl font-bold mb-4">{announcement.title}</h1>

          {/* 작성자 */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-violet-700 dark:text-violet-300 text-sm font-semibold">
                  {announcement.authorId?.username ?? '관리자'}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-violet-600/10 text-violet-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 관리자
                </span>
              </div>
              <p className="text-text-secondary text-xs mt-0.5">
                {new Date(announcement.publishedAt ?? announcement.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>

          {/* 본문 */}
          <div className="text-text-secondary text-sm sm:text-base leading-relaxed sm:leading-7 break-words mb-5 whitespace-pre-wrap">
            {announcement.content}
          </div>

          {/* 액션 */}
          <div className="flex items-center gap-2 pt-4 border-t border-line">
            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-medium border border-line text-text-secondary hover:border-accent-muted hover:text-accent transition-colors">
              <Share2 className="w-4 h-4" /> 공유
            </button>
            <button onClick={() => router.back()}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-base font-medium border border-line text-text-secondary hover:bg-bg-tertiary transition-colors">
              <ArrowLeft className="w-4 h-4" /> {fromLabel}
            </button>
          </div>
        </article>
      </div>
    </div>
  )
}
