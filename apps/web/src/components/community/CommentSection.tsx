'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import communityService, { CommentItem } from '@/services/communityService'
import ConfirmModal from '@/components/ConfirmModal'
import { getRelativeTime } from '@/lib/relativeTime'
import { wilsonScore } from '@/lib/wilsonScore'
import {
  ThumbsUp, ThumbsDown, MessageSquare, Send, Trash2, Pencil, CornerDownRight, Loader2,
  AlertTriangle, RotateCcw, Award,
} from 'lucide-react'
import Avatar from './Avatar'

export interface CommentSectionUser {
  id: string
  username: string
  role: string
  profileImage?: string | null
}

interface CommentSectionProps {
  postId: string
  isPostAuthor: boolean
  currentUser: CommentSectionUser | null
  isAuthenticated: boolean
  onRequireLogin?: () => void
  onCommentCountChange?: (delta: number) => void
  showToast?: (msg: string, ok?: boolean) => void
  showHeader?: boolean
}

export default function CommentSection({
  postId, isPostAuthor, currentUser, isAuthenticated, onRequireLogin, onCommentCountChange, showToast, showHeader = true,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'latest' | 'best'>('latest')
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    setLoading(true)
    try { setComments(await communityService.getComments(postId)) }
    catch { showToast?.('댓글을 불러올 수 없습니다', false) }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [postId])

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const newComment = editingComment
        ? await communityService.updateComment(editingComment.id, commentText)
        : await communityService.createComment(postId, commentText)
      if (editingComment) {
        setComments(prev => prev.map(c => c._id === editingComment.id ? { ...c, ...newComment } : c))
      } else {
        setComments(prev => [...prev, newComment])
        onCommentCountChange?.(1)
      }
      setCommentText('')
      setEditingComment(null)
    } catch { showToast?.('댓글 작성 실패', false) }
    finally { setSubmitting(false) }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      const newComment = await communityService.createComment(postId, replyText, parentId)
      setComments(prev => [...prev, newComment])
      onCommentCountChange?.(1)
      setReplyText('')
      setReplyingId(null)
    } catch { showToast?.('댓글 작성 실패', false) }
    finally { setSubmitting(false) }
  }

  const handleDeleteComment = async (cid: string) => {
    try {
      await communityService.deleteComment(cid)
      setComments(prev => prev.map(c => c._id === cid
        ? { ...c, status: 'deleted', isDeleted: true, author: null, content: '[삭제된 댓글입니다]', deletedBy: currentUser?.id }
        : c
      ))
      onCommentCountChange?.(-1)
    } catch { showToast?.('삭제 실패', false) }
  }

  const handleRestoreComment = async (cid: string) => {
    try {
      await communityService.restoreComment(cid)
      const fresh = await communityService.getComments(postId)
      setComments(fresh)
      onCommentCountChange?.(1)
    } catch { showToast?.('복구 실패', false) }
  }

  const handleCommentLike = async (cid: string) => {
    if (!isAuthenticated) { onRequireLogin?.(); return }
    try {
      const r = await communityService.toggleCommentLike(cid)
      const myId = currentUser!.id
      setComments(prev => prev.map(c => c._id === cid
        ? {
            ...c, likeCount: r.likeCount, dislikeCount: r.dislikeCount,
            likes: r.liked ? [...c.likes, myId] : c.likes.filter(id => id !== myId),
            dislikes: c.dislikes.filter(id => id !== myId),
          }
        : c
      ))
    } catch { /* noop */ }
  }

  const handleCommentDislike = async (cid: string) => {
    if (!isAuthenticated) { onRequireLogin?.(); return }
    try {
      const r = await communityService.toggleCommentDislike(cid)
      const myId = currentUser!.id
      setComments(prev => prev.map(c => c._id === cid
        ? {
            ...c, likeCount: r.likeCount, dislikeCount: r.dislikeCount,
            dislikes: r.disliked ? [...c.dislikes, myId] : c.dislikes.filter(id => id !== myId),
            likes: c.likes.filter(id => id !== myId),
          }
        : c
      ))
    } catch { /* noop */ }
  }

  const handleReport = async () => {
    if (!reportReason.trim() || !reportingId) return
    try {
      await communityService.reportComment(reportingId, reportReason)
      showToast?.('신고가 접수되었습니다')
      setReportingId(null)
      setReportReason('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      showToast?.(err?.response?.data?.message || '신고 실패', false)
    }
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

  const activeCommentCount = comments.filter(c => !c.isDeleted).length

  const roots = comments.filter(c => !c.parentId || isOrphan(c))
  const sortedRoots = sortMode === 'best'
    ? [...roots].sort((a, b) => wilsonScore(b.likeCount, b.dislikeCount) - wilsonScore(a.likeCount, a.dislikeCount))
    : roots

  // "베스트 댓글": 표가 거의 없는데 우연히 1등인 경우를 막기 위해 최소 투표 수를 요구하고, 게시글당 최대 3개까지 — 최상위 댓글/답글 구분 없이 전체에서 뽑는다
  const MIN_VOTES_FOR_BEST = 5
  const MAX_BEST_COMMENTS = 3
  const bestComments = comments
    .filter(c => !c.isDeleted)
    .filter(c => (c.likeCount - c.dislikeCount) > 0 && (c.likeCount + c.dislikeCount) >= MIN_VOTES_FOR_BEST)
    .sort((a, b) => wilsonScore(b.likeCount, b.dislikeCount) - wilsonScore(a.likeCount, a.dislikeCount))
    .slice(0, MAX_BEST_COMMENTS)
  const bestCommentIds = new Set(bestComments.map(c => c._id))
  const parentAuthorOf = (c: CommentItem) => comments.find(p => p._id === c.parentId)?.author

  return (
    <div>
      {reportingId && (
        <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-line rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-text-primary font-bold">댓글 신고</h3>
            </div>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)}
              placeholder="신고 사유를 입력해주세요 (필수)"
              rows={3}
              className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setReportingId(null); setReportReason('') }} className="px-4 py-2 text-base text-text-muted border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="px-4 py-2 text-base text-text-primary bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">신고하기</button>
            </div>
          </div>
        </div>
      )}

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

      {showHeader && (
        <h2 className="text-text-primary font-bold mb-5 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" /> 댓글 {activeCommentCount}개
        </h2>
      )}

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
            <Avatar username={currentUser?.username || '?'} role={currentUser?.role || ''} profileImage={currentUser?.profileImage || undefined} size={9} />
            <div className="flex-1">
              <textarea ref={commentInputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmitComment() }}
                placeholder="댓글을 입력하세요..."
                rows={3}
                className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-xl resize-none focus:outline-none focus:border-accent transition-colors"
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary text-base px-4 py-2 rounded-xl transition-colors">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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

      {bestComments.length > 0 && (
        <div className="mb-6">
          <p className="flex items-center gap-1.5 text-sm font-bold text-orange-500 mb-3">
            <Award className="w-4 h-4" /> 베스트 댓글
          </p>
          <div className="space-y-3">
            {bestComments.map(c => (
              <CommentBlock key={`pinned-${c._id}`} comment={c} currentUser={currentUser}
                isReply={!!c.parentId} parentAuthorName={parentAuthorOf(c)?.username}
                isPostAuthor={isPostAuthor} isBest pinned
                replyingId={replyingId} replyText={replyText} onReplyTextChange={setReplyText}
                onSubmitReply={handleSubmitReply} submittingReply={submitting}
                onReply={(cid) => { setReplyingId(prev => prev === cid ? null : cid); setReplyText('') }}
                onEdit={(cid, content) => { setEditingComment({ id: cid, content }); setReplyingId(null); setCommentText(content); commentInputRef.current?.focus() }}
                onDelete={(cid) => setDeleteCommentId(cid)}
                onLike={handleCommentLike}
                onDislike={handleCommentDislike}
                onReport={(cid) => setReportingId(cid)}
                onRestore={handleRestoreComment}
              />
            ))}
          </div>
        </div>
      )}

      {roots.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {([
            { key: 'latest' as const, label: '최신순' },
            { key: 'best' as const, label: '베스트순' },
          ]).map(opt => (
            <button key={opt.key} onClick={() => setSortMode(opt.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                sortMode === opt.key ? 'bg-accent-light text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          {sortedRoots.map((root) => (
            <div key={root._id}>
              <CommentBlock comment={root} currentUser={currentUser} isReply={false} isPostAuthor={isPostAuthor} isBest={bestCommentIds.has(root._id)}
                replyingId={replyingId} replyText={replyText} onReplyTextChange={setReplyText}
                onSubmitReply={handleSubmitReply} submittingReply={submitting}
                onReply={(cid) => { setReplyingId(prev => prev === cid ? null : cid); setReplyText('') }}
                onEdit={(cid, content) => { setEditingComment({ id: cid, content }); setReplyingId(null); setCommentText(content); commentInputRef.current?.focus() }}
                onDelete={(cid) => setDeleteCommentId(cid)}
                onLike={handleCommentLike}
                onDislike={handleCommentDislike}
                onReport={(cid) => setReportingId(cid)}
                onRestore={handleRestoreComment}
              />
              {flattenReplies(root._id).map(({ item, parentAuthor }) => (
                <CommentBlock key={item._id} comment={item} currentUser={currentUser} isReply parentAuthorName={parentAuthor?.username} isPostAuthor={isPostAuthor} isBest={bestCommentIds.has(item._id)}
                  replyingId={replyingId} replyText={replyText} onReplyTextChange={setReplyText}
                  onSubmitReply={handleSubmitReply} submittingReply={submitting}
                  onReply={(cid) => { setReplyingId(prev => prev === cid ? null : cid); setReplyText('') }}
                  onEdit={(cid, content) => { setEditingComment({ id: cid, content }); setReplyingId(null); setCommentText(content); commentInputRef.current?.focus() }}
                  onDelete={(cid) => setDeleteCommentId(cid)}
                  onLike={handleCommentLike}
                  onDislike={handleCommentDislike}
                  onReport={(cid) => setReportingId(cid)}
                  onRestore={handleRestoreComment}
                />
              ))}
            </div>
          ))}
          {comments.length === 0 && <p className="text-text-secondary text-sm text-center py-6">첫 댓글을 남겨보세요</p>}
        </div>
      )}
    </div>
  )
}

function CommentBlock({
  comment, currentUser, onReply, onEdit, onDelete, onLike, onDislike, onReport, onRestore, isReply = false, parentAuthorName, isPostAuthor = false, isBest = false, pinned = false,
  replyingId, replyText, onReplyTextChange, onSubmitReply, submittingReply
}: {
  comment: CommentItem; currentUser: CommentSectionUser | null
  onReply: (id: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onLike: (id: string) => void
  onDislike: (id: string) => void
  onReport: (id: string) => void
  onRestore: (id: string) => void
  isReply?: boolean
  parentAuthorName?: string
  isPostAuthor?: boolean
  isBest?: boolean
  pinned?: boolean
  replyingId: string | null
  replyText: string
  onReplyTextChange: (v: string) => void
  onSubmitReply: (parentId: string) => void
  submittingReply: boolean
}) {
  const isOwner = currentUser?.id === comment.author?._id
  const isAdmin = currentUser?.role === 'admin'
  const isLiked = !!currentUser && comment.likes.includes(currentUser.id)
  const isDisliked = !!currentUser && comment.dislikes.includes(currentUser.id)

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
    <div className={pinned ? 'bg-orange-500/[0.06] border border-orange-500/25 rounded-xl px-3' : isReply ? 'ml-8 border-l-2 border-line pl-4' : ''}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          <Avatar username={comment.author?.username||'?'} role={comment.author?.role||''} profileImage={comment.author?.profileImage} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm font-semibold ${comment.author?.role==='admin'?'text-violet-700 dark:text-violet-300':comment.author?.role==='developer'?'text-cyan-700 dark:text-cyan-300':'text-text-primary'}`}>
                {comment.author?.username}
              </span>
              <span className="text-text-secondary text-xs">{getRelativeTime(comment.createdAt)}</span>
              {isBest && (
                <span className="flex items-center gap-0.5 text-[11px] font-semibold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                  <Award className="w-3 h-3" /> 베스트
                </span>
              )}
              {(isOwner || isPostAuthor || isAdmin) && (
                <div className="ml-auto flex items-center gap-4 flex-shrink-0">
                  {(isOwner || isAdmin) && (
                    <button onClick={() => onEdit(comment._id, comment.content)}
                      className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors">
                      <Pencil className="w-3.5 h-3.5"/> 수정
                    </button>
                  )}
                  {(isOwner || isPostAuthor || isAdmin) && (
                    <button onClick={() => onDelete(comment._id)}
                      className="flex items-center gap-1 text-sm text-text-secondary hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/> 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">
              {isReply && parentAuthorName && <span className="text-accent font-medium mr-1">@{parentAuthorName}</span>}
              {comment.content}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {currentUser && !pinned && (
                <button onClick={() => onReply(comment._id)}
                  className="flex items-center gap-1 text-base text-text-secondary hover:text-accent transition-colors">
                  <CornerDownRight className="w-3 h-3"/> 답글
                </button>
              )}
              <div className="flex items-center gap-1.5">
                <button onClick={() => onLike(comment._id)}
                  className={`transition-colors ${isLiked ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}>
                  <ThumbsUp className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} />
                </button>
                <span className="text-xs font-medium text-text-secondary min-w-[1rem] text-center">
                  {comment.likeCount - comment.dislikeCount}
                </span>
                <button onClick={() => onDislike(comment._id)}
                  className={`transition-colors ${isDisliked ? 'text-blue-500' : 'text-text-secondary hover:text-blue-500'}`}>
                  <ThumbsDown className="w-3.5 h-3.5" fill={isDisliked ? 'currentColor' : 'none'} />
                </button>
              </div>
              {!isOwner && currentUser && (
                <button onClick={() => onReport(comment._id)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-red-500 transition-colors">
                  <AlertTriangle className="w-3 h-3"/> 신고
                </button>
              )}
            </div>
            {!pinned && replyingId === comment._id && (
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
