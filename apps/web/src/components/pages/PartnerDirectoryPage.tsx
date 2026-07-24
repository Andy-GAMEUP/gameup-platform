'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import partnerService, { PartnerProfile } from '@/services/partnerService'
import { useQuery } from '@tanstack/react-query'
import { Users, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react'

export default function PartnerDirectoryPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['partnerDirectory', page],
    queryFn: () => partnerService.getPartners({ page, limit: 12 }),
  })

  const partners = data?.partners ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> 파트너 채널
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            게임업 공식 파트너들의 채널을 만나보세요 · 총 {data?.total ?? 0}명의 파트너
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-bg-secondary border border-line rounded-xl p-16 text-center">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">등록된 파트너가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {partners.map((partner) => (
                <PartnerCard key={partner._id} partner={partner} onClick={() => router.push(`/partner/${partner._id}`)} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-base transition-colors ${p === page ? 'bg-cyan-600 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PartnerCard({ partner, onClick }: { partner: PartnerProfile; onClick: () => void }) {
  const username = partner.userId?.username ?? '?'
  const role = partner.userId?.role ?? ''
  const avatarBg = role === 'admin' ? 'bg-purple-600' : role === 'developer' ? 'bg-cyan-600' : 'bg-bg-muted'

  return (
    <div className="w-full bg-bg-secondary border border-line hover:border-cyan-500/40 rounded-xl p-5 transition-all group flex items-center gap-6">
      {/* 아바타 */}
      <div className="flex-shrink-0">
        {partner.profileImage ? (
          <Image src={partner.profileImage} alt={username} width={64} height={64} className="w-16 h-16 rounded-full object-cover border border-line" unoptimized />
        ) : (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-text-primary font-bold text-2xl ${avatarBg}`}>
            {username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* 이름 + 슬로건 + 태그 */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-semibold text-base group-hover:text-cyan-300 transition-colors truncate">{username}</p>
        <p className="text-text-secondary text-sm mt-0.5 truncate">{partner.slogan || '파트너 채널'}</p>
        {partner.selectedTopics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {partner.selectedTopics.slice(0, 4).map(topic => (
              <span key={topic} className="bg-cyan-600/20 text-cyan-400 text-xs px-1.5 py-0.5 rounded">{topic}</span>
            ))}
            {partner.selectedTopics.length > 4 && (
              <span className="text-text-muted text-xs self-center">+{partner.selectedTopics.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* 게시글 수 */}
      <div className="flex-shrink-0 flex items-center gap-1 text-text-muted text-sm">
        <FileText className="w-4 h-4" />
        <span>{partner.postCount}개 게시글</span>
      </div>

      {/* 버튼 */}
      <div className="flex-shrink-0">
        <button
          onClick={onClick}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-base font-medium px-5 py-2 rounded-lg transition-colors"
        >
          프로필 보기
        </button>
      </div>
    </div>
  )
}
