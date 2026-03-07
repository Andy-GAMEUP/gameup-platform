'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService, { PostSummary } from '@/services/communityService'
import { useAuth } from '@/lib/useAuth'
import {
  Flame, TrendingUp, Clock, ThumbsUp, MessageSquare, Eye,
  Bookmark, Plus, Search, ChevronLeft, ChevronRight,
  Loader2, Star
} from 'lucide-react'

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  general:    { label: '자유',     color: 'bg-slate-600/50 text-slate-300' },
  bug:        { label: '버그',     color: 'bg-red-600/30 text-red-300' },
  suggestion: { label: '건의',     color: 'bg-blue-600/30 text-blue-300' },
  review:     { label: '리뷰',     color: 'bg-yellow-600/30 text-yellow-300' },
  notice:     { label: '공지',     color: 'bg-purple-600/30 text-purple-300' },
}

const SORT_OPTIONS = [
  { value: 'latest',    label: '최신순',   icon: Clock },
  { value: 'popular',   label: '인기순',   icon: ThumbsUp },
  { value: 'trending',  label: '트렌딩',   icon: TrendingUp },
]

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const sort = searchParams.get('sort') || 'latest'
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const page = Number(searchParams.get('page') || 1)
  const [searchInput, setSearchInput] = useState(search)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    router.push('?' + next.toString())
  }

  const load = useCallback(() => {
    setLoading(true)
    communityService.getPosts({ page, limit: 15, sort, category: category || undefined, search: search || undefined })
      .then(({ posts: p, total: t, totalPages: tp }) => { setPosts(p); setTotal(t); setTotalPages(tp) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, sort, category, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    communityService.getStats().then(setStats).catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setParam('search', searchInput)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold">커뮤니티</h1>
            <p className="text-slate-400 text-sm mt-1">
              베타테스터들의 자유로운 공간 · 총 {total.toLocaleString()}개 게시글
            </p>
          </div>
          {isAuthenticated && (
            <button onClick={() => router.push('/community/write')}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> 글쓰기
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 왼쪽 사이드바 */}
          <aside className="lg:col-span-1 space-y-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="검색..."
                className="flex-1 bg-slate-900 border border-slate-800 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500"
              />
              <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* 정렬 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">정렬</p>
              <div className="space-y-1">
                {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setParam('sort', value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${sort===value ? 'bg-cyan-600/20 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">카테고리</p>
              <div className="space-y-1">
                <button onClick={() => setParam('category', '')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  전체
                </button>
                {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                  <button key={key} onClick={() => setParam('category', key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category===key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 트렌딩 */}
            {stats?.hotPosts?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" /> 인기 급상승
                </p>
                <div className="space-y-2">
                  {stats.hotPosts.map((p: any, i: number) => (
                    <Link key={p._id} href={`/community/${p._id}`}
                      className="flex items-start gap-2 text-slate-400 hover:text-white text-xs transition-colors group">
                      <span className={`font-bold flex-shrink-0 mt-0.5 ${i===0?'text-orange-400':i===1?'text-slate-300':''}`}>{i+1}</span>
                      <span className="line-clamp-2 group-hover:text-cyan-300">{p.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 내 즐겨찾기 링크 */}
            {isAuthenticated && (
              <Link href="/community/bookmarks"
                className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 text-slate-400 hover:text-cyan-300 text-sm transition-colors">
                <Bookmark className="w-4 h-4" /> 내 즐겨찾기
              </Link>
            )}
          </aside>

          {/* 게시글 목록 */}
          <main className="lg:col-span-3 space-y-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">게시글이 없습니다</p>
                {isAuthenticated && (
                  <button onClick={() => router.push('/community/write')}
                    className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm">
                    첫 글 작성하기
                  </button>
                )}
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} currentUserId={user?.id} />
                ))}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button disabled={page<=1}
                      onClick={() => { const n=new URLSearchParams(searchParams); n.set('page',String(page-1)); router.push('?' + n.toString()) }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({length: Math.min(totalPages, 7)}, (_, i) => {
                      const p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i
                      return (
                        <button key={p} onClick={() => { const n=new URLSearchParams(searchParams); n.set('page',String(p)); router.push('?' + n.toString()) }}
                          className={`w-8 h-8 rounded-lg text-sm transition-colors ${p===page?'bg-cyan-600 text-white':'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                          {p}
                        </button>
                      )
                    })}
                    <button disabled={page>=totalPages}
                      onClick={() => { const n=new URLSearchParams(searchParams); n.set('page',String(page+1)); router.push('?' + n.toString()) }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post, currentUserId }: { post: PostSummary; currentUserId?: string }) {
  const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.general
  const isMyPost = currentUserId && post.author?._id === currentUserId

  return (
    <Link href={`/community/${post._id}`}
      className={`block bg-slate-900 border rounded-xl p-4 hover:border-cyan-500/30 transition-all group ${post.isPinned ? 'border-purple-500/40' : 'border-slate-800'} ${post.isHot ? 'ring-1 ring-orange-500/20' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {post.isPinned && <span className="bg-purple-600/30 text-purple-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-1"><Star className="w-3 h-3" />고정</span>}
            {post.isHot && <span className="bg-orange-600/30 text-orange-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-1"><Flame className="w-3 h-3" />HOT</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded ${cat.color}`}>{cat.label}</span>
            {post.gameId && <span className="bg-cyan-600/20 text-cyan-400 text-xs px-1.5 py-0.5 rounded">{post.gameId.title}</span>}
          </div>
          <h3 className="text-white font-semibold text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">{post.title}</h3>
          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{post.content}</p>
          {post.images?.length > 0 && (
            <div className="flex gap-1 mt-2">
              {post.images.slice(0,3).map((img, i) => (
                <img key={i} src={img} alt="" className="w-12 h-12 rounded object-cover border border-slate-700" />
              ))}
              {post.images.length > 3 && <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">+{post.images.length-3}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            post.author?.role==='admin' ? 'bg-purple-600 text-white' :
            post.author?.role==='developer' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-white'
          }`}>
            {(post.author?.username||'?')[0].toUpperCase()}
          </div>
          <span className={post.author?.role==='admin'?'text-purple-400':post.author?.role==='developer'?'text-cyan-400':''}>
            {post.author?.username}
            {post.author?.role==='admin' && <span className="ml-1 text-purple-400">[관리자]</span>}
            {post.author?.role==='developer' && <span className="ml-1 text-cyan-400">[개발사]</span>}
          </span>
          {isMyPost && <span className="text-cyan-500">· 내글</span>}
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{post.bookmarkCount}</span>
          <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
        </span>
      </div>
    </Link>
  )
}
