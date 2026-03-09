'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import partnerService, { PartnerPostItem } from '@/services/partnerService'
import { useAuth } from '@/lib/useAuth'
import { ThumbsUp, Eye, ArrowLeft, Pencil, Trash2, Loader2, CheckCircle, MessageSquare } from 'lucide-react'

export default function PartnerPostDetailPage() {
  const { id: partnerId, postId } = useParams<{ id: string; postId: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [post, setPost] = useState<PartnerPostItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current) }, [])

  const showToast = (msg: string, ok = true) => {
    if (toastRef.current) clearTimeout(toastRef.current)
    setToast({ msg, ok })
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    partnerService.getPartnerPost(postId)
      .then(({ post: p }) => {
        setPost(p)
        setLikeCount(p.likeCount)
        if (user) setLiked(p.likes.includes(user.id))
      })
      .catch(() => showToast('게시글을 불러올 수 없습니다', false))
      .finally(() => setLoading(false))
  }, [postId, user])

  const handleLike = async () => {
    if (!isAuthenticated) return router.push('/login')
    try {
      const r = await partnerService.togglePartnerPostLike(postId)
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch { showToast('좋아요 처리 실패', false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('게시글을 삭제하시겠습니까?')) return
    try {
      await partnerService.deletePartnerPost(postId)
      router.push(`/partner/${partnerId}`)
    } catch { showToast('삭제 실패', false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    </div>
  )

  if (!post) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="text-center py-24">
        <p className="text-slate-400">게시글을 찾을 수 없습니다</p>
        <Link href={`/partner/${partnerId}`} className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 text-sm">채널로 돌아가기</Link>
      </div>
    </div>
  )

  const isOwner = user?.id === post.author?._id

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/partner/${partnerId}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 채널로 돌아가기
        </Link>

        <article className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {post.topicGroup && <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">{post.topicGroup}</span>}
            {post.topic && <span className="bg-cyan-600/20 text-cyan-400 text-xs px-2 py-0.5 rounded">{post.topic}</span>}
          </div>

          <h1 className="text-white text-xl font-bold mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(post.author?.username ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{post.author?.username}</p>
              <p className="text-slate-500 text-xs">{new Date(post.createdAt).toLocaleString('ko-KR')}</p>
            </div>
            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Eye className="w-3 h-3" />{post.views}
            </span>
          </div>

          <div className="text-slate-300 text-sm leading-relaxed break-words mb-5
            [&_h2]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
            [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
            [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
            [&_blockquote]:border-l-2 [&_blockquote]:border-slate-600 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3
            [&_code]:bg-slate-800 [&_code]:text-cyan-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-slate-800 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_a]:text-cyan-400 [&_a]:underline [&_a:hover]:text-cyan-300
            [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-slate-700
            [&_strong]:text-white [&_strong]:font-semibold
            [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.images?.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {post.images.map((img, i) => (
                <Image key={i} src={img} alt={`이미지 ${i + 1}`} width={800} height={256} className="w-full rounded-lg border border-slate-700 object-cover max-h-64" unoptimized />
              ))}
            </div>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {post.tags.map(t => (
                <span key={t} className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${liked ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300' : 'border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300'}`}>
              <ThumbsUp className="w-4 h-4" /> {likeCount}
            </button>
            <span className="flex items-center gap-1 text-slate-500 text-sm"><MessageSquare className="w-4 h-4" />{post.commentCount}</span>
            {isOwner && (
              <div className="ml-auto flex items-center gap-2">
                <Link href={`/partner/edit/${postId}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white transition-colors">
                  <Pencil className="w-3 h-3" /> 수정
                </Link>
                <button onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-800/40 hover:border-red-600/60 transition-colors">
                  <Trash2 className="w-3 h-3" /> 삭제
                </button>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
