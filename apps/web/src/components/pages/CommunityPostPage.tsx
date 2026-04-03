'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService, { PostSummary, CommentItem } from '@/services/communityService'
import playerService from '@/services/playerService'
import FollowModal from '@/components/FollowModal'
import { useAuth } from '@/lib/useAuth'
import { getRelativeTime } from '@/lib/relativeTime'
import LevelBadge from '@/components/LevelBadge'
import {
  ThumbsUp, MessageSquare, Bookmark, Flag, Eye, ArrowLeft,
  Send, Trash2, Pencil, CornerDownRight, Loader2, ExternalLink,
  Shield, Wrench, AlertTriangle, Star, Flame, CheckCircle,
  Share2, Film
} from 'lucide-react'

const CHANNEL_MAP: Record<string, { label: string; className: string }> = {
  notice:            { label: '공지사항',    className: 'bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-300' },
  'new-game-intro':  { label: '신작게임소개', className: 'bg-rose-100 text-rose-700 dark:bg-rose-600/30 dark:text-rose-300' },
  free:              { label: '자유게시판',  className: 'bg-bg-tertiary text-text-secondary dark:bg-bg-muted/50 dark:text-text-secondary' },
  'beta-game':       { label: '베타게임',    className: 'bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300' },
  'live-game':       { label: '라이브게임',  className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-300' },
  general:           { label: '일반 질문',   className: 'bg-bg-tertiary text-text-secondary dark:bg-bg-muted/50 dark:text-text-secondary' },
  dev:               { label: '개발 질문',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-300' },
  daily:             { label: '일상 이야기', className: 'bg-green-100 text-green-700 dark:bg-green-600/30 dark:text-green-300' },
  'game-talk':       { label: '게임 이야기', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600/30 dark:text-yellow-300' },
  'info-share':      { label: '정보공유',    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-600/30 dark:text-cyan-300' },
  'new-game':        { label: '게임 신작',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-300' },
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin')     return <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 text-xs font-semibold"><Shield className="w-3 h-3" />관리자</span>
  if (role === 'developer') return <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 text-xs font-semibold"><Wrench className="w-3 h-3" />개발사</span>
  return null
}

function Avatar({ username, role, size = 8 }: { username: string; role: string; size?: number }) {
  const bg = role==='admin'?'bg-violet-600':role==='developer'?'bg-cyan-600':'bg-bg-tertiary'
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-text-primary flex-shrink-0 ${bg}`}
      style={{ width: size*4, height: size*4, fontSize: size*1.5 }}>
      {username[0].toUpperCase()}
    </div>
  )
}

export default function CommunityPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [post, setPost] = useState<PostSummary | null>(null)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [selectedImage, setSelectedImage] = useState(0)

  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null)

  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reportModal, setReportModal] = useState<{ type: 'post' | 'comment'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

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
      setBookmarkCount(p.bookmarkCount)
      if (user) {
        setLiked(p.likes.includes(user.id))
        setBookmarked(p.bookmarks.includes(user.id))
      }
    } catch {
      showToast('게시글을 불러올 수 없습니다', false)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id, user?.id])

  useEffect(() => {
    if (post?.author?._id && user && post.author._id !== user.id) {
      playerService.checkFollowStatus(post.author._id)
        .then(data => {
          setIsFollowing(data.isFollowing)
          setFollowerCount(data.followerCount)
          setFollowingCount(data.followingCount)
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.author?._id, user?.id])

  const handleFollow = async () => {
    if (!post?.author?._id) return
    try {
      const data = await playerService.toggleFollow(post.author._id)
      setIsFollowing(data.following)
      setFollowerCount(data.followerCount)
    } catch { showToast('팔로우 처리 실패', false) }
  }

  const handleLike = async () => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await communityService.toggleLike(id!)
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch { showToast('좋아요 처리 실패', false) }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await communityService.toggleBookmark(id!)
      setBookmarked(r.bookmarked)
      setBookmarkCount(r.bookmarkCount)
      showToast(r.bookmarked ? '즐겨찾기에 추가되었습니다' : '즐겨찾기가 해제되었습니다')
    } catch { showToast('즐겨찾기 처리 실패', false) }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      showToast('링크가 복사되었습니다')
    } catch {
      showToast('링크 복사 실패', false)
    }
  }

  const handleDeletePost = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return
    try {
      await communityService.deletePost(id!)
      router.push('/community')
    } catch { showToast('삭제 실패', false) }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const newComment = editingComment
        ? await communityService.updateComment(editingComment.id, commentText)
        : await communityService.createComment(id!, commentText, replyTo?.id)
      if (editingComment) {
        setComments(prev => prev.map(c => {
          if (c._id === editingComment.id) return { ...c, ...newComment }
          return { ...c, replies: c.replies?.map(r => r._id === editingComment.id ? { ...r, ...newComment } : r) }
        }))
      } else if (replyTo) {
        setComments(prev => prev.map(c => c._id === replyTo.id ? { ...c, replies: [...(c.replies||[]), newComment] } : c))
        setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p)
      } else {
        setComments(prev => [...prev, { ...newComment, replies: [] }])
        setPost(p => p ? { ...p, commentCount: p.commentCount + 1 } : p)
      }
      setCommentText('')
      setReplyTo(null)
      setEditingComment(null)
    } catch { showToast('댓글 작성 실패', false) }
    finally { setSubmitting(false) }
  }

  const handleDeleteComment = async (cid: string) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    try {
      await communityService.deleteComment(cid)
      setComments(prev => prev.map(c => {
        if (c._id === cid) return { ...c, status: 'deleted' }
        return { ...c, replies: c.replies?.filter(r => r._id !== cid) }
      }).filter(c => c.status !== 'deleted'))
      setPost(p => p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)
    } catch { showToast('삭제 실패', false) }
  }

  const handleCommentLike = async (cid: string) => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await communityService.toggleCommentLike(cid)
      setComments(prev => prev.map(c => {
        if (c._id === cid) return { ...c, likeCount: r.likeCount }
        return { ...c, replies: c.replies?.map(rep => rep._id === cid ? { ...rep, likeCount: r.likeCount } : rep) }
      }))
    } catch {}
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
  const isAdminOrDev = user?.role === 'admin' || user?.role === 'developer'
  const cat = CHANNEL_MAP[post.channel] || CHANNEL_MAP.free

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
              <button onClick={()=>{setReportModal(null);setReportReason('')}} className="px-4 py-2 text-sm text-text-muted border border-line rounded-lg hover:bg-bg-tertiary">취소</button>
              <button onClick={handleReport} disabled={!reportReason.trim()} className="px-4 py-2 text-sm text-text-primary bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">신고하기</button>
            </div>
          </div>
        </div>
      )}

      {showFollowModal && post?.author?._id && (
        <FollowModal userId={post.author._id} type={showFollowModal} isOpen={true} onClose={() => setShowFollowModal(null)} />
      )}

      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 py-8">
        {/* 뒤로가기 */}
        <Link href="/community" className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 목록으로
        </Link>

        {/* 게시글 본문 */}
        <article className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8 mb-4">
          {/* 배지 */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {post.isPinned && <span className="bg-accent-light text-accent text-xs px-2 py-0.5 rounded flex items-center gap-1"><Star className="w-3 h-3"/>고정</span>}
            {post.isHot && <span className="bg-orange-100 dark:bg-orange-600/30 text-orange-700 dark:text-orange-300 text-xs px-2 py-0.5 rounded flex items-center gap-1"><Flame className="w-3 h-3"/>HOT</span>}
            <span className={`text-xs px-2 py-0.5 rounded ${cat.className}`}>{cat.label}</span>
            {post.gameId && <Link href={`/games/${post.gameId._id}`} className="bg-accent-light text-accent text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity">{post.gameId.title}</Link>}
          </div>

          {/* 제목 */}
          <h1 className="text-text-primary text-xl sm:text-2xl lg:text-3xl font-bold mb-4">{post.title}</h1>

          {/* 작성자 정보 */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-line">
            <Avatar username={post.author?.username||'?'} role={post.author?.role||''} size={9} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${post.author?.role==='admin'?'text-violet-700 dark:text-violet-300':post.author?.role==='developer'?'text-cyan-700 dark:text-cyan-300':'text-text-primary'}`}>
                  {post.author?.username}
                </span>
                <LevelBadge level={post.author?.level} />
                <RoleBadge role={post.author?.role||''} />
                {isAuthenticated && !isOwner && (
                  <button onClick={handleFollow}
                    className={`ml-1 text-xs px-3 py-1 rounded-lg border transition-colors ${
                      isFollowing
                        ? 'border-line text-text-secondary hover:border-red-400 hover:text-red-500'
                        : 'border-accent-muted text-accent hover:bg-accent-light'
                    }`}>
                    {isFollowing ? '팔로잉' : '팔로우'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-text-secondary text-xs">{getRelativeTime(post.createdAt)} · {new Date(post.createdAt).toLocaleString('ko-KR')}</p>
                {post.author?._id && (
                  <>
                    <span onClick={() => setShowFollowModal('followers')} className="text-text-secondary text-xs cursor-pointer hover:text-accent transition-colors">팔로워 {followerCount}</span>
                    <span onClick={() => setShowFollowModal('following')} className="text-text-secondary text-xs cursor-pointer hover:text-accent transition-colors">팔로잉 {followingCount}</span>
                  </>
                )}
              </div>
            </div>
            <span className="flex items-center gap-1 text-text-secondary text-xs flex-shrink-0"><Eye className="w-3 h-3"/>{post.views.toLocaleString()}</span>
          </div>

          {/* 본문 */}
          <div className="text-text-secondary text-sm sm:text-base leading-relaxed sm:leading-7 break-words mb-5
            [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
            [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
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

          {/* 이미지 갤러리 (메인 + 썸네일 리스트) */}
          {post.images?.length > 0 && (
            <div className="mb-5">
              {/* 메인 이미지 */}
              <div className="relative aspect-video bg-bg-tertiary rounded-xl overflow-hidden mb-2">
                <Image src={post.images[selectedImage]} alt={`이미지 ${selectedImage+1}`} fill className="object-contain" unoptimized priority />
              </div>
              {/* 썸네일 리스트 */}
              {post.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === selectedImage ? 'border-accent-muted' : 'border-transparent hover:border-line'
                      }`}>
                      <Image src={img} alt="" width={80} height={56} className="w-full h-full object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 동영상 링크 */}
          {post.videoUrl && (
            <a href={post.videoUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-accent-light border border-accent-muted rounded-xl px-4 py-3 mb-5 hover:border-accent transition-colors group">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="w-5 h-5 text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-accent group-hover:text-accent">동영상 보기</p>
                <p className="text-xs text-text-muted truncate">{post.videoUrl}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-accent flex-shrink-0" />
            </a>
          )}

          {/* 링크 */}
          {post.links?.length > 0 && (
            <div className="space-y-2 mb-5">
              {post.links.map((l, i) => (
                <a key={i} href={/^https?:\/\//i.test(l.url) ? l.url : '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-lg px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  {l.label || l.url}
                </a>
              ))}
            </div>
          )}

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
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                liked
                  ? 'bg-accent-light border-accent-muted text-accent'
                  : 'border-line text-text-secondary hover:border-accent-muted hover:text-accent'
              }`}>
              <ThumbsUp className="w-4 h-4" /> <span className="hidden sm:inline">좋아요</span> {likeCount}
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border border-line text-text-secondary hover:border-accent-muted hover:text-accent transition-colors">
              <Share2 className="w-4 h-4" /> 공유
            </button>
            <button onClick={handleBookmark}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                bookmarked
                  ? 'bg-amber-50 dark:bg-yellow-600/20 border-amber-400 dark:border-yellow-500/40 text-amber-600 dark:text-yellow-300'
                  : 'border-line text-text-secondary hover:border-amber-400 hover:text-amber-600'
              }`}>
              <Bookmark className="w-4 h-4" /> {bookmarkCount}
            </button>
            <span className="flex items-center gap-1 text-text-secondary text-sm"><MessageSquare className="w-4 h-4"/>{post.commentCount}</span>
            <div className="ml-auto flex items-center gap-2">
              {(isOwner || isAdminOrDev) && (
                <>
                  <Link href={`/community/edit/${id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted border border-line hover:text-text-primary transition-colors">
                    <Pencil className="w-3 h-3"/> 수정
                  </Link>
                  <button onClick={handleDeletePost}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 dark:border-red-800/40 hover:border-red-400 transition-colors">
                    <Trash2 className="w-3 h-3"/> 삭제
                  </button>
                </>
              )}
              {!isOwner && isAuthenticated && (
                <button onClick={()=>setReportModal({type:'post',id:id!})}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-red-500 transition-colors">
                  <Flag className="w-3 h-3"/> 신고
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
              {(replyTo || editingComment) && (
                <div className="flex items-center gap-2 mb-2 text-xs text-text-muted bg-bg-tertiary rounded-lg px-3 py-2">
                  <CornerDownRight className="w-3.5 h-3.5 text-accent" />
                  {replyTo ? `@${replyTo.username}에게 답글` : '댓글 수정 중'}
                  <button onClick={() => { setReplyTo(null); setEditingComment(null); setCommentText('') }}
                    className="ml-auto text-text-secondary hover:text-text-primary">✕</button>
                </div>
              )}
              <div className="flex gap-3">
                <Avatar username={user?.username||'?'} role={user?.role||''} size={9} />
                <div className="flex-1">
                  <textarea ref={commentInputRef} value={commentText} onChange={e=>setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) handleSubmitComment() }}
                    placeholder={replyTo?`@${replyTo.username}에게 답글 작성...`:'댓글을 입력하세요...'}
                    rows={3}
                    className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-xl resize-none focus:outline-none focus:border-accent transition-colors"
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={handleSubmitComment} disabled={!commentText.trim() || submitting}
                      className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary text-sm px-4 py-2 rounded-xl transition-colors">
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
            {comments.map((c) => (
              <CommentBlock key={c._id} comment={c} currentUser={user}
                onReply={(cid, username) => { setReplyTo({id: cid, username}); setEditingComment(null); setCommentText(''); commentInputRef.current?.focus() }}
                onEdit={(cid, content) => { setEditingComment({id: cid, content}); setReplyTo(null); setCommentText(content); commentInputRef.current?.focus() }}
                onDelete={handleDeleteComment}
                onLike={handleCommentLike}
                onReport={(cid) => setReportModal({type:'comment', id: cid})}
              />
            ))}
            {comments.length === 0 && <p className="text-text-secondary text-sm text-center py-6">첫 댓글을 남겨보세요</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function CommentBlock({
  comment, currentUser, onReply, onEdit, onDelete, onLike, onReport, depth = 0
}: {
  comment: CommentItem; currentUser: { id: string; username: string; role: string } | null
  onReply: (id: string, username: string) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onLike: (id: string) => void
  onReport: (id: string) => void
  depth?: number
}) {
  const isOwner = currentUser?.id === comment.author?._id
  const isAdminOrDev = currentUser?.role==='admin' || currentUser?.role==='developer'

  return (
    <div className={`${depth>0?'ml-8 border-l-2 border-line pl-4':''}`}>
      <div className={`${comment.isOfficial ? 'bg-accent-light border border-accent-muted rounded-xl p-4' : 'py-3'}`}>
        <div className="flex items-start gap-3">
          <Avatar username={comment.author?.username||'?'} role={comment.author?.role||''} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm font-semibold ${comment.author?.role==='admin'?'text-violet-700 dark:text-violet-300':comment.author?.role==='developer'?'text-cyan-700 dark:text-cyan-300':'text-text-primary'}`}>
                {comment.author?.username}
              </span>
              <LevelBadge level={comment.author?.level} />
              <RoleBadge role={comment.author?.role||''} />
              {comment.isOfficial && <span className="bg-accent-light text-accent text-xs px-1.5 py-0.5 rounded border border-accent-muted">공식 답변</span>}
              <span className="text-text-secondary text-xs">{getRelativeTime(comment.createdAt)}</span>
            </div>
            <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">{comment.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => onLike(comment._id)}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors">
                <ThumbsUp className="w-3 h-3"/> {comment.likeCount}
              </button>
              {currentUser && depth===0 && (
                <button onClick={() => onReply(comment._id, comment.author?.username)}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors">
                  <CornerDownRight className="w-3 h-3"/> 답글
                </button>
              )}
              {(isOwner || isAdminOrDev) && (
                <>
                  <button onClick={() => onEdit(comment._id, comment.content)}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
                    <Pencil className="w-3 h-3"/> 수정
                  </button>
                  <button onClick={() => onDelete(comment._id)}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3"/> 삭제
                  </button>
                </>
              )}
              {!isOwner && currentUser && (
                <button onClick={() => onReport(comment._id)}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors">
                  <Flag className="w-3 h-3"/> 신고
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {comment.replies?.map(r => (
        <CommentBlock key={r._id} comment={r} currentUser={currentUser}
          onReply={onReply} onEdit={onEdit} onDelete={onDelete} onLike={onLike} onReport={onReport} depth={1} />
      ))}
    </div>
  )
}
