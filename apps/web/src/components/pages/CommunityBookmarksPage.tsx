'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService, { PostSummary } from '@/services/communityService'
import { useAuth } from '@/contexts/AuthContext'
import { Bookmark, ArrowLeft, ThumbsUp, MessageSquare, Eye, Loader2 } from 'lucide-react'

export default function CommunityBookmarksPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    communityService.getMyBookmarks(1, 50)
      .then(({ posts: p, total: t }) => { setPosts(p); setTotal(t) })
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.push('/community')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 커뮤니티로
        </button>
        <h1 className="text-white text-xl font-bold mb-2 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-yellow-400" /> 내 즐겨찾기
        </h1>
        <p className="text-slate-500 text-sm mb-6">총 {total}개의 게시글</p>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">즐겨찾기한 게시글이 없습니다</p>
            <Link href="/community" className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">커뮤니티 둘러보기</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <Link key={post._id} href={`/community/${post._id}`}
                className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-yellow-500/30 transition-all group">
                <h3 className="text-white font-semibold text-sm group-hover:text-yellow-300 transition-colors line-clamp-1 mb-1">{post.title}</h3>
                <p className="text-slate-500 text-xs line-clamp-2 mb-3">{post.content}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{post.author?.username}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3"/>{post.likeCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3"/>{post.commentCount}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{post.views}</span>
                  <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
