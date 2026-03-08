'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import partnerService, { PartnerPostItem } from '@/services/partnerService'
import { useAuth } from '@/lib/useAuth'
import { useQuery } from '@tanstack/react-query'
import { Clock, ThumbsUp, Eye, MessageSquare, Plus, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react'

export default function PartnerChannelPage() {
  const { id: partnerId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const sort = searchParams.get('sort') || 'latest'
  const topic = searchParams.get('topic') || ''
  const page = Number(searchParams.get('page') || 1)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    router.push('?' + next.toString())
  }

  const { data: channelData, isLoading: channelLoading } = useQuery({
    queryKey: ['partnerChannel', partnerId],
    queryFn: () => partnerService.getPartnerChannel(partnerId),
    enabled: !!partnerId,
  })

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['partnerPosts', partnerId, page, sort, topic],
    queryFn: () => partnerService.getPartnerPosts(partnerId, { page, limit: 15, sort, topic: topic || undefined }),
    enabled: !!partnerId,
  })

  const partner = channelData?.partner
  const posts = postsData?.posts ?? []
  const total = postsData?.total ?? 0
  const totalPages = postsData?.totalPages ?? 1

  const isMyChannel = partner && user && String((partner.userId as { _id: string })._id) === user.id

  if (channelLoading) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    </div>
  )

  if (!partner) return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="text-center py-24">
        <p className="text-slate-400">파트너 채널을 찾을 수 없습니다</p>
        <Link href="/partner" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 text-sm">파트너 목록으로</Link>
      </div>
    </div>
  )

  const username = partner.userId?.username ?? '?'
  const role = partner.userId?.role ?? ''
  const avatarBg = role === 'admin' ? 'bg-purple-600' : role === 'developer' ? 'bg-cyan-600' : 'bg-slate-600'

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/partner" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 파트너 목록
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-5">
            {partner.profileImage ? (
              <img src={partner.profileImage} alt={username}
                className="w-20 h-20 rounded-full object-cover border border-slate-700 flex-shrink-0" />
            ) : (
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 ${avatarBg}`}>
                {username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white text-xl font-bold">{username}</h1>
                <span className="bg-cyan-600/20 text-cyan-400 text-xs px-2 py-0.5 rounded border border-cyan-500/30">파트너</span>
              </div>
              {partner.slogan && (
                <p className="text-slate-300 text-sm mt-1">{partner.slogan}</p>
              )}
              {partner.selectedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {partner.selectedTopics.map(t => (
                    <span key={t} className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-slate-500 text-xs mt-2">게시글 {partner.postCount}개 · 총 {total}개 게시글</p>
            </div>
            {isMyChannel && (
              <Link href="/partner/write"
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0">
                <Plus className="w-4 h-4" /> 글쓰기
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">정렬</p>
              <div className="space-y-1">
                {[{ value: 'latest', label: '최신순', icon: Clock }, { value: 'popular', label: '인기순', icon: ThumbsUp }].map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setParam('sort', value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${sort === value ? 'bg-cyan-600/20 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {partner.selectedTopics.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">주제</p>
                <div className="space-y-1">
                  <button onClick={() => setParam('topic', '')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!topic ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                    전체
                  </button>
                  {partner.selectedTopics.map(t => (
                    <button key={t} onClick={() => setParam('topic', t)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${topic === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <main className="lg:col-span-3 space-y-3">
            {postsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : posts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">게시글이 없습니다</p>
                {isMyChannel && (
                  <Link href="/partner/write"
                    className="mt-4 inline-block bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm">
                    첫 글 작성하기
                  </Link>
                )}
              </div>
            ) : (
              <>
                {posts.map(post => (
                  <PostCard key={post._id} post={post} partnerId={partnerId} />
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button disabled={page <= 1}
                      onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page - 1)); router.push('?' + n.toString()) }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                      return (
                        <button key={p} onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(p)); router.push('?' + n.toString()) }}
                          className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                          {p}
                        </button>
                      )
                    })}
                    <button disabled={page >= totalPages}
                      onClick={() => { const n = new URLSearchParams(searchParams); n.set('page', String(page + 1)); router.push('?' + n.toString()) }}
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

function PostCard({ post, partnerId }: { post: PartnerPostItem; partnerId: string }) {
  const textPreview = post.content.replace(/<[^>]*>/g, '').slice(0, 150)

  return (
    <Link href={`/partner/${partnerId}/${post._id}`}
      className="block bg-slate-900 border border-slate-800 hover:border-cyan-500/30 rounded-xl p-4 transition-all group">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.topic && <span className="bg-cyan-600/20 text-cyan-400 text-xs px-1.5 py-0.5 rounded">{post.topic}</span>}
          </div>
          <h3 className="text-white font-semibold text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">{post.title}</h3>
          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{textPreview}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.commentCount}</span>
        <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
    </Link>
  )
}
