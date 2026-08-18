'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService, { PostSummary, CommentItem } from '@/services/communityService'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuth } from '@/lib/useAuth'
import { getRelativeTime } from '@/lib/relativeTime'
import {
  ThumbsUp, MessageSquare, Eye, ArrowLeft,
  Send, Trash2, Pencil, CornerDownRight, Loader2,
  AlertTriangle, CheckCircle,
  Share2, RotateCcw, Gamepad2,
  Twitter, Facebook, Link as LinkIcon
} from 'lucide-react'

function Avatar({ username, role, profileImage, size = 8 }: { username: string; role: string; profileImage?: string; size?: number }) {
  if (profileImage) {
    return (
      <img src={profileImage} alt={username}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size*4, height: size*4 }} />
    )
  }
  const bg = role==='admin'?'bg-violet-600':role==='developer'?'bg-cyan-600':'bg-accent'
  const textColor = role==='admin'||role==='developer' ? 'text-text-primary' : 'text-text-inverse'
  return (
    <div className={`rounded-full flex items-center justify-center font-bold ${textColor} flex-shrink-0 ${bg}`}
      style={{ width: size*4, height: size*4, fontSize: size*1.5 }}>
      {username[0].toUpperCase()}
    </div>
  )
}

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromLabel = searchParams.get('from') || '커뮤니티'
  const fromHref = searchParams.get('fromHref')
  const { user, isAuthenticated } = useAuth()

  const [post, setPost] = useState<PostSummary | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const [commentText, setCommentText] = useState('')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reportModal, setReportModal] = useState<{ type: 'post' | 'comment'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
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
      const [p, c] = await Promise.all([communityService.getPost(id), communityService.getComments(id)])
      setPost(p)
      setComments(c)
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

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const newComment = editingComment
        ? await communityService.updateComment(editingComment.id, commentText)
        : await communityService.createComment(id!, commentText)
      if (editingComment) {
        setComments(prev => prev.map(c => c._id === editingComment.id ? { ...c, ...newComment } : c))
      } else {
        setComments(prev => [...prev, newComment])
        setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p)
      }
      setCommentText('')
      setEditingComment(null)
    } catch { showToast('댓글 작성 실패', false) }
    finally { setSubmitting(false) }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      const newComment = await communityService.createComment(id!, replyText, parentId)
      setComments(prev => [...prev, newComment])
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p)
      setReplyText('')
      setReplyingId(null)
    } catch { showToast('댓글 작성 실패', false) }
    finally { setSubmitting(false) }
  }

  const handleDeleteComment = async (cid: string) => {
    try {
      await communityService.deleteComment(cid)
      setComments(prev => prev.map(c => c._id === cid
        ? { ...c, status: 'deleted', isDeleted: true, author: null, content: '[삭제된 댓글입니다]', deletedBy: user?.id }
        : c
      ))
      setPost(p => p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)
    } catch { showToast('삭제 실패', false) }
  }

  const handleRestoreComment = async (cid: string) => {
    try {
      await communityService.restoreComment(cid)
      const fresh = await communityService.getComments(id!)
      setComments(fresh)
      setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p)
    } catch { showToast('복구 실패', false) }
  }

  const handleCommentLike = async (cid: string) => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await communityService.toggleCommentLike(cid)
      setComments(prev => prev.map(c => c._id === cid ? { ...c, likeCount: r.likeCount } : c))
    } catch {}
  }

  // 부모 댓글이 보존기간 만료로 완전삭제되어 사라진 경우, 답글이 화면에서 통째로 안 보이지 않도록 최상위처럼 취급한다
  const isOrphan = (c: CommentItem) => !!c.parentId && !comments.some(p => p._id === c.parentId)

  const flattenReplies = (parentId: string): { item: CommentItem; parentAuthor?: CommentItem['author'] }[] => {
    const parent = comments.find(c => c._id === parentId)
    const result: { item: CommentItem; parentAuthor?: CommentItem['author'] }[] = []
    for (const child of comments.filter(c => c.parentId === parentId)) {
      result.push({ item: child, parentAuthor: parent?.author })
      result.push(...flattenReplies(child._id))
    }
    return result
  }

  const handleReport = async () => {
    if (!reportReason.trim()) return
    try {
      if (reportModal?.type === 'post') await communityService.reportPost(reportModal.id, reportReason)
      else if (reportModal?.type === 'comment') await communityService.reportComment(reportModal!.id, reportReason)
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
              <h3 className="text-text-primary font-bold">{reportModal.type==='post'?'게시글':'댓글'} 신고</h3>
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

      <ConfirmModal
        isOpen={!!deleteCommentId}
        title="댓글 삭제"
        message="댓글을 삭제하시겠습니까?"
        confirmLabel="삭제"
        danger
        onConfirm={() => {
          if (!deleteCommentId) return
          handleDeleteComment(deleteCommentId)
          setDeleteCommentId(null)
        }}
        onCancel={() => setDeleteCommentId(null)}
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
          <h2 className="text-text-primary font-bold mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" /> 댓글 {post.commentCount}개
          </h2>

          {/* 댓글 입력 (상단) */}
          {isAuthenticated ? (
            <div className="mb-6 pb-5 border-b border-line">
              {editingComment && (
                <div className="flex items-center gap-2 mb-2 text-xs text-text-muted bg-bg-tertiary rounded-lg px-3 py-2">
                  <Pencil className="w-3.5 h-3.5 text-accent" />
                  댓글 수정 중
                  <button onClick={() => { setEditingComment(null); setCommentText('') }}
                    className="ml-auto text-text-secondary hover:text-text-primary">✕</button>
                </div>
              )}
              <div className="flex gap-3">
                <Avatar username={user?.username||'?'} role={user?.role||''} profileImage={user?.profileImage||undefined} size={9} />
                <div className="flex-1">
                  <textarea ref={commentInputRef} value={commentText} onChange={e=>setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) handleSubmitComment() }}
                    placeholder="댓글을 입력하세요..."
                    rows={3}
                    className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-xl resize-none focus:outline-none focus:border-accent transition-colors"
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                      className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary text-base px-4 py-2 rounded-xl transition-colors">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                      {editingComment ? '수정' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 pb-5 border-b border-line text-center">
              <p className="text-text-secondary text-sm mb-3">댓글을 작성하려면 로그인이 필요합니다</p>
              <Link href="/login" className="bg-accent hover:bg-accent-hover text-text-primary text-sm px-4 py-2 rounded-xl transition-colors inline-block">로그인</Link>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.filter(c => !c.parentId || isOrphan(c)).map((root) => (
              <div key={root._id}>
                <CommentBlock comment={root} currentUser={user} isReply={false} isPostAuthor={isOwner}
                  replyingId={replyingId} replyText={replyText} onReplyTextChange={setReplyText}
                  onSubmitReply={handleSubmitReply} submittingReply={submitting}
                  onReply={(cid) => { setReplyingId(prev => prev === cid ? null : cid); setReplyText('') }}
                  onEdit={(cid, content) => { setEditingComment({id: cid, content}); setReplyingId(null); setCommentText(content); commentInputRef.current?.focus() }}
                  onDelete={(cid) => setDeleteCommentId(cid)}
                  onLike={handleCommentLike}
                  onReport={(cid) => setReportModal({type:'comment', id: cid})}
                  onRestore={handleRestoreComment}
                />
                {flattenReplies(root._id).map(({ item, parentAuthor }) => (
                  <CommentBlock key={item._id} comment={item} currentUser={user} isReply parentAuthorName={parentAuthor?.username} isPostAuthor={isOwner}
                    replyingId={replyingId} replyText={replyText} onReplyTextChange={setReplyText}
                    onSubmitReply={handleSubmitReply} submittingReply={submitting}
                    onReply={(cid) => { setReplyingId(prev => prev === cid ? null : cid); setReplyText('') }}
                    onEdit={(cid, content) => { setEditingComment({id: cid, content}); setReplyingId(null); setCommentText(content); commentInputRef.current?.focus() }}
                    onDelete={(cid) => setDeleteCommentId(cid)}
                    onLike={handleCommentLike}
                    onReport={(cid) => setReportModal({type:'comment', id: cid})}
                    onRestore={handleRestoreComment}
                  />
                ))}
              </div>
            ))}
            {comments.length === 0 && <p className="text-text-secondary text-sm text-center py-6">첫 댓글을 남겨보세요</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function CommentBlock({
  comment, currentUser, onReply, onEdit, onDelete, onLike, onReport, onRestore, isReply = false, parentAuthorName, isPostAuthor = false,
  replyingId, replyText, onReplyTextChange, onSubmitReply, submittingReply
}: {
  comment: CommentItem; currentUser: { id: string; username: string; role: string } | null
  onReply: (id: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onLike: (id: string) => void
  onReport: (id: string) => void
  onRestore: (id: string) => void
  isReply?: boolean
  parentAuthorName?: string
  isPostAuthor?: boolean
  replyingId: string | null
  replyText: string
  onReplyTextChange: (v: string) => void
  onSubmitReply: (parentId: string) => void
  submittingReply: boolean
}) {
  const isOwner = currentUser?.id === comment.author?._id
  const isAdmin = currentUser?.role==='admin'

  if (comment.isDeleted) {
    const canRestore = !!currentUser && currentUser.id === comment.deletedBy
    return (
      <div className={isReply ? 'ml-8 border-l-2 border-line pl-4' : ''}>
        <div className="py-3">
          <div className="flex items-start gap-3">
            <Avatar username="?" role="" size={8} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-text-muted">알 수 없음</span>
                <span className="text-text-secondary text-xs">{getRelativeTime(comment.createdAt)}</span>
              </div>
              <p className="text-text-muted text-sm italic">
                {isReply && parentAuthorName && <span className="text-accent font-medium mr-1 not-italic">@{parentAuthorName}</span>}
                {comment.content}
              </p>
              {canRestore && (
                <>
                  <p className="text-text-muted text-xs mt-0.5">삭제 후 7일이 지나면 완전히 삭제됩니다</p>
                  <button onClick={() => onRestore(comment._id)}
                    className="flex items-center gap-1 text-base text-accent hover:text-accent-hover transition-colors mt-2">
                    <RotateCcw className="w-3 h-3"/> 복구
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={isReply ? 'ml-8 border-l-2 border-line pl-4' : ''}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          <Avatar username={comment.author?.username||'?'} role={comment.author?.role||''} profileImage={comment.author?.profileImage} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm font-semibold ${comment.author?.role==='admin'?'text-violet-700 dark:text-violet-300':comment.author?.role==='developer'?'text-cyan-700 dark:text-cyan-300':'text-text-primary'}`}>
                {comment.author?.username}
              </span>
              <span className="text-text-secondary text-xs">{getRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">
              {isReply && parentAuthorName && <span className="text-accent font-medium mr-1">@{parentAuthorName}</span>}
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => onLike(comment._id)}
                className="flex items-center gap-1 text-base text-text-secondary hover:text-accent transition-colors">
                <ThumbsUp className="w-3 h-3"/> {comment.likeCount}
              </button>
              {currentUser && (
                <button onClick={() => onReply(comment._id)}
                  className="flex items-center gap-1 text-base text-text-secondary hover:text-accent transition-colors">
                  <CornerDownRight className="w-3 h-3"/> 답글
                </button>
              )}
              {(isOwner || isAdmin) && (
                <button onClick={() => onEdit(comment._id, comment.content)}
                  className="flex items-center gap-1 text-base text-text-secondary hover:text-text-primary transition-colors">
                  <Pencil className="w-3 h-3"/> 수정
                </button>
              )}
              {(isOwner || isPostAuthor || isAdmin) && (
                <button onClick={() => onDelete(comment._id)}
                  className="flex items-center gap-1 text-base text-text-secondary hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3"/> 삭제
                </button>
              )}
              {!isOwner && currentUser && (
                <button onClick={() => onReport(comment._id)}
                  className="flex items-center gap-1 text-base text-text-secondary hover:text-red-500 transition-colors">
                  <AlertTriangle className="w-3 h-3"/> 신고
                </button>
              )}
            </div>
            {replyingId === comment._id && (
              <div className="flex gap-2 mt-3">
                <input value={replyText} onChange={e => onReplyTextChange(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') onSubmitReply(comment._id) }}
                  placeholder="답글을 입력하세요"
                  autoFocus
                  className="flex-1 bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
                <button onClick={() => onSubmitReply(comment._id)} disabled={!replyText.trim() || submittingReply}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary text-base px-3 py-2 rounded-lg transition-colors">
                  {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
                  등록
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
