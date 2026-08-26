'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService, { PostSummary } from '@/services/communityService'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuth } from '@/lib/useAuth'
import Avatar from '@/components/community/Avatar'
import CommentSection from '@/components/community/CommentSection'
import {
  ThumbsUp, Eye, ArrowLeft,
  Trash2, Pencil, Loader2,
  AlertTriangle, CheckCircle,
  Share2, Gamepad2,
  Twitter, Facebook, Link as LinkIcon
} from 'lucide-react'

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromLabel = searchParams.get('from') || '커뮤니티'
  const fromHref = searchParams.get('fromHref')
  const { user, isAuthenticated } = useAuth()

  const [post, setPost] = useState<PostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const [reportModal, setReportModal] = useState<{ type: 'post'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShareMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showToast = (msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const p = await communityService.getPost(id)
      setPost(p)
      setLikeCount(p.likeCount)
      if (user) {
        setLiked(p.likes.includes(user.id))
      }
    } catch {
      showToast('게시글을 불러올 수 없습니다', false)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id, user?.id])

  const handleLike = async () => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await communityService.toggleLike(id!)
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch { showToast('좋아요 처리 실패', false) }
  }

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('링크가 복사되었습니다')
    } catch {
      showToast('링크 복사 실패', false)
    }
  }

  const shareToX = () => {
    const url = window.location.href
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post?.title || '')}`,
      '_blank', 'noopener,noreferrer,width=550,height=420')
    setShareMenuOpen(false)
  }

  const shareToFacebook = () => {
    const url = window.location.href
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank', 'noopener,noreferrer,width=550,height=420')
    setShareMenuOpen(false)
  }

  const handleCopyLink = () => {
    copyLink(window.location.href)
    setShareMenuOpen(false)
  }

  const handleDeletePost = async () => {
    try {
      await communityService.deletePost(id!)
      router.back()
    } catch { showToast('삭제 실패', false) }
  }

  const handleReport = async () => {
    if (!reportReason.trim() || !reportModal) return
    try {
      await communityService.reportPost(reportModal.id, reportReason)
      showToast('신고가 접수되었습니다')
      setReportModal(null)
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
  if (!post) return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="text-center py-24"><p className="text-text-secondary">게시글을 찾을 수 없습니다</p></div>
    </div>
  )

  const isOwner = user?.id === post.author?._id

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 text-text-primary ${toast.ok?'bg-green-600':'bg-red-600'}`}>
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      {/* 신고 모달 */}
      {reportModal && (
        <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-line rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-text-primary font-bold">게시글 신고</h3>
            </div>
            <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)}
              placeholder="신고 사유를 입력해주세요 (필수)"
              rows={3}
              className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setReportModal(null);setReportReason('')}} className="px-4 py-2 text-base text-text-muted border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="px-4 py-2 text-base text-text-primary bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">신고하기</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeletePostConfirm}
        title="게시글 삭제"
        message="게시글을 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          setShowDeletePostConfirm(false)
          handleDeletePost()
        }}
        onCancel={() => setShowDeletePostConfirm(false)}
      />

      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        <button onClick={() => fromHref ? router.push(fromHref) : router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-base mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {fromLabel}
        </button>

        {/* 게시글 본문 */}
        <article className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8 mb-4">
          {/* 제목 */}
          <h1 className="text-text-primary text-xl sm:text-2xl lg:text-3xl font-bold mb-4">{post.title}</h1>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
            <Avatar username={post.author?.username||'?'} role={post.author?.role||''} profileImage={post.author?.profileImage} size={9} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${post.author?.role==='admin'?'text-violet-700 dark:text-violet-300':post.author?.role==='developer'?'text-cyan-700 dark:text-cyan-300':'text-text-primary'}`}>
                  {post.author?.username}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-text-secondary text-xs">{new Date(post.createdAt).toLocaleString('ko-KR')}</p>
                <span className="flex items-center gap-1 text-text-secondary text-xs flex-shrink-0"><Eye className="w-3 h-3"/>{post.views.toLocaleString()}</span>
              </div>
            </div>
            {post.gameId && (
              <Link href={`/games/${post.gameId._id}`}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white text-sm font-semibold pl-2 pr-3.5 py-1.5 rounded-full shadow-sm shadow-violet-600/30 hover:shadow-md hover:shadow-violet-600/40 hover:-translate-y-0.5 transition-all duration-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                  <Gamepad2 className="w-3 h-3"/>
                </span>
                {post.gameId.title}
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
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 태그 */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {post.tags.map((t) => (
                <span key={t} className="bg-bg-tertiary text-text-secondary text-xs px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
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
              {(isOwner || user?.role === 'admin') && (
                <Link href={`/community/edit/${id}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-accent border border-accent-muted hover:border-accent transition-colors">
                  <Pencil className="w-3 h-3"/> 수정
                </Link>
              )}
              {(isOwner || user?.role === 'admin') && (
                <button onClick={() => setShowDeletePostConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-red-500 border border-red-200 dark:border-red-800/40 hover:border-red-400 transition-colors">
                  <Trash2 className="w-3 h-3"/> 삭제
                </button>
              )}
              {!isOwner && isAuthenticated && (
                <button onClick={()=>setReportModal({type:'post',id:id!})}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-text-secondary hover:text-red-500 transition-colors">
                  <AlertTriangle className="w-3 h-3"/> 신고
                </button>
              )}
            </div>
          </div>
        </article>

        {/* 댓글 섹션 */}
        <section className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8">
          <CommentSection
            postId={id!}
            isPostAuthor={isOwner}
            currentUser={user}
            isAuthenticated={isAuthenticated}
            onRequireLogin={() => router.push('/login')}
            showToast={showToast}
          />
        </section>
      </div>
    </div>
  )
}
