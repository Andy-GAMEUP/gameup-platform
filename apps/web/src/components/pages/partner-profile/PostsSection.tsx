'use client'

import Link from 'next/link'
import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function PostsSection() {
  const { id, posts } = usePartnerProfileCtx()
  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-text-primary font-semibold text-lg">채널 게시글</h2>
      </div>
      {posts.length
        ? posts.map((post: any) => (
            <Link key={post._id} href={`/partner/${id}/${post._id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-bg-tertiary transition-colors border-b border-line/40 last:border-b-0">
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{post.title}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {post.topic && <span>{post.topic} · </span>}
                  {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <span className="text-text-muted text-xs ml-4 flex-shrink-0">조회 {post.views || 0}</span>
            </Link>
          ))
        : <div className="px-5 py-14 text-center text-text-muted text-sm">작성된 게시글이 없습니다.</div>}
    </div>
  )
}
