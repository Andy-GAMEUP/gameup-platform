'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { gameService, RecentGameAnnouncement } from '@/services/gameService'
import NoticeTypeBadge from '@/components/NoticeTypeBadge'
import { useAuth } from '@/lib/useAuth'
import { ArrowLeft, Loader2, Gamepad2, User, Eye, ThumbsUp, AlertTriangle, CheckCircle } from 'lucide-react'

export default function GameAnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromLabel = searchParams.get('from') || '커뮤니티'
  const fromHref = searchParams.get('fromHref')
  const { user, isAuthenticated } = useAuth()
  const [announcement, setAnnouncement] = useState<RecentGameAnnouncement | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
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
    gameService.getGameAnnouncementById(id)
      .then(d => {
        setAnnouncement(d.announcement)
        setLikeCount(d.announcement.likes?.length ?? 0)
        if (user) {
          setLiked((d.announcement.likes ?? []).includes(user.id))
        }
      })
      .catch(() => setAnnouncement(null))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  const handleLike = async () => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await gameService.toggleGameAnnouncementLike(id!)
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch { showToast('좋아요 처리 실패', false) }
  }


  const handleReport = async () => {
    if (!reportReason.trim()) return
    try {
      await gameService.reportGameAnnouncement(id!, reportReason)
      showToast('신고가 접수되었습니다')
      setReportOpen(false)
      setReportReason('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast(err?.response?.data?.message || '신고 실패', false)
    }
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


  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      {/* 신고 모달 */}
      {reportOpen && (
        <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-line rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-text-primary font-bold">공지 신고</h3>
            </div>
            <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)}
              placeholder="신고 사유를 입력해주세요 (필수)"
              rows={3}
              className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setReportOpen(false);setReportReason('')}} className="px-4 py-2 text-base text-text-muted border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="px-4 py-2 text-base text-text-primary bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">신고하기</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => fromHref ? router.push(fromHref) : router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-base mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {fromLabel}
        </button>

        <article className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8 mb-4">
          {/* 제목 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <h1 className="text-text-primary text-xl sm:text-2xl lg:text-3xl font-bold">{announcement.title}</h1>
            <NoticeTypeBadge type={announcement.type} className="flex-shrink-0" />
          </div>

          {/* 작성자 */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
            <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {announcement.developer?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={announcement.developer.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-cyan-700 dark:text-cyan-300 text-sm font-semibold">
                  {announcement.developer?.username ?? '알 수 없는 개발사'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-text-secondary text-xs">{new Date(announcement.createdAt).toLocaleString('ko-KR')}</p>
                <span className="flex items-center gap-1 text-text-secondary text-xs flex-shrink-0"><Eye className="w-3 h-3"/>{announcement.views.toLocaleString()}</span>
              </div>
            </div>
            {announcement.game && (
              <Link href={`/games/${announcement.game._id}`}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white text-sm font-semibold pl-2 pr-3.5 py-1.5 rounded-full shadow-sm shadow-violet-600/30 hover:shadow-md hover:shadow-violet-600/40 hover:-translate-y-0.5 transition-all duration-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                  <Gamepad2 className="w-3 h-3"/>
                </span>
                {announcement.game.title}
              </Link>
            )}
          </div>

          {/* 본문 */}
          <div className="text-text-secondary text-sm sm:text-base leading-relaxed sm:leading-7 break-words mb-5
            [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
            [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:list-none [&_ul]:pl-0 [&_ul]:mb-3 [&_ul]:space-y-1
            [&_li>p]:pl-[1.4em] [&_li>p]:[text-indent:-1.4em]
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
            [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:text-text-muted [&_blockquote]:italic [&_blockquote]:my-3
            [&_code]:bg-bg-tertiary [&_code]:text-accent [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-bg-tertiary [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent
            [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-line
            [&_strong]:text-text-primary [&_strong]:font-semibold
            [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: announcement.content }}
          />

          {/* 액션 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 border-t border-line">
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-base font-medium border transition-colors ${
                liked
                  ? 'bg-accent-light border-accent-muted text-accent'
                  : 'border-line text-text-secondary hover:border-accent-muted hover:text-accent'
              }`}>
              <ThumbsUp className="w-4 h-4" /> <span className="hidden sm:inline">좋아요</span> {likeCount}
            </button>
            <div className="ml-auto flex items-center gap-2">
              {isAuthenticated && (
                <button onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-text-secondary hover:text-red-500 transition-colors">
                  <AlertTriangle className="w-3 h-3"/> 신고
                </button>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
