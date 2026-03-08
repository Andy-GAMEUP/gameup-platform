'use client'
import { useState } from 'react'
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> 파트너 채널
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            게임업 공식 파트너들의 채널을 만나보세요 · 총 {data?.total ?? 0}명의 파트너
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">등록된 파트너가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((partner) => (
                <PartnerCard key={partner._id} partner={partner} onClick={() => router.push(`/partner/${partner._id}`)} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
  const avatarBg = role === 'admin' ? 'bg-purple-600' : role === 'developer' ? 'bg-cyan-600' : 'bg-slate-600'

  return (
    <button onClick={onClick}
      className="block w-full text-left bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-5 transition-all group">
      <div className="flex items-start gap-4 mb-3">
        {partner.profileImage ? (
          <img src={partner.profileImage} alt={username}
            className="w-14 h-14 rounded-full object-cover border border-slate-700 flex-shrink-0" />
        ) : (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${avatarBg}`}>
            {username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm group-hover:text-cyan-300 transition-colors truncate">{username}</p>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-2 leading-relaxed">
            {partner.slogan || '파트너 채널'}
          </p>
        </div>
      </div>

      {partner.selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {partner.selectedTopics.slice(0, 3).map(topic => (
            <span key={topic} className="bg-cyan-600/20 text-cyan-400 text-xs px-1.5 py-0.5 rounded">{topic}</span>
          ))}
          {partner.selectedTopics.length > 3 && (
            <span className="text-slate-500 text-xs">+{partner.selectedTopics.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 text-slate-500 text-xs">
        <FileText className="w-3 h-3" />
        <span>{partner.postCount}개 게시글</span>
      </div>
    </button>
  )
}
