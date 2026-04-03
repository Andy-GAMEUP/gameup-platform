'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/community/PostCard'
import communityService, { PostSummary } from '@/services/communityService'
import { useAuth } from '@/lib/useAuth'
import { Bookmark, ArrowLeft, Loader2 } from 'lucide-react'

export default function CommunityBookmarksPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    communityService.getMyBookmarks(1, 50)
      .then(({ posts: p, total: t }) => { setPosts(p); setTotal(t) })
      .finally(() => setLoading(false))
  }, [isAuthenticated, authLoading])

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => router.push('/community')} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 커뮤니티로
        </button>
        <h1 className="text-text-primary text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-accent" /> 내 즐겨찾기
        </h1>
        <p className="text-text-secondary text-sm mb-6">총 {total}개의 게시글</p>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : posts.length === 0 ? (
          <div className="bg-bg-card border border-line rounded-2xl p-16 text-center">
            <Bookmark className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-4">즐겨찾기한 게시글이 없습니다</p>
            <Link href="/community" className="bg-accent hover:bg-accent-hover text-text-primary text-sm px-4 py-2 rounded-xl transition-colors">커뮤니티 둘러보기</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(post => (
              <PostCard key={post._id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
