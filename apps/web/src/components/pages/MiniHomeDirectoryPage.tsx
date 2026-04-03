'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import minihomeService, { MiniHome, KeywordGroup } from '@/services/minihomeService'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/useAuth'
import { Home, ChevronLeft, ChevronRight, Loader2, Plus, Building2 } from 'lucide-react'
import MiniHomeCreateModal from '@/components/MiniHomeCreateModal'

const SORT_OPTIONS = [
  { value: 'updated', label: '업데이트순' },
  { value: 'newest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
]

export default function MiniHomeDirectoryPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')
  const [sort, setSort] = useState('updated')
  const [showCreate, setShowCreate] = useState(false)

  const { data: keywordData } = useQuery({
    queryKey: ['minihomeKeywords'],
    queryFn: () => minihomeService.getKeywords(),
  })

  const { data: recommendedData, isLoading: loadingRec } = useQuery({
    queryKey: ['minihomeRecommended'],
    queryFn: () => minihomeService.getList({ limit: 10, sort: 'updated' }),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['minihomeDirectory', page, selectedKeyword, sort],
    queryFn: () => minihomeService.getList({ page, limit: 12, keyword: selectedKeyword || undefined, sort }),
  })

  const allKeywords = (keywordData?.groups ?? []).flatMap(g =>
    g.keywords.filter(k => k.isActive).map(k => k.name)
  )
  const recommended = recommendedData?.minihomes?.filter(m => m.isRecommended) ?? []
  const minihomes = data?.minihomes ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
              <Home className="w-6 h-6 text-red-400" /> 미니홈
            </h1>
            <p className="text-text-secondary text-sm mt-1">게임 개발사들의 포트폴리오 공간 · 총 {data?.total ?? 0}개</p>
          </div>
          {user?.role === 'developer' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-text-primary px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> 미니홈 만들기
            </button>
          )}
        </div>

        {recommended.length > 0 && (
          <div className="mb-10">
            <h2 className="text-text-primary font-semibold text-base mb-4">추천 미니홈</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {loadingRec ? (
                <div className="flex items-center justify-center w-full py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                </div>
              ) : (
                recommended.map(mh => (
                  <RecommendedCard key={mh._id} minihome={mh} />
                ))
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-text-primary font-semibold text-base mb-4">전체 미니홈</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => { setSelectedKeyword(''); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedKeyword === '' ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}
              >
                전체
              </button>
              {allKeywords.map(kw => (
                <button
                  key={kw}
                  onClick={() => { setSelectedKeyword(kw); setPage(1) }}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors ${selectedKeyword === kw ? 'bg-red-600 text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'}`}
                >
                  {kw}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1) }}
              className="bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-line flex-shrink-0"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
            </div>
          ) : minihomes.length === 0 ? (
            <div className="bg-bg-secondary border border-line rounded-xl p-16 text-center">
              <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">등록된 미니홈이 없습니다</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {minihomes.map(mh => (
                  <MiniHomeCard key={mh._id} minihome={mh} />
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
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-red-600 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}>
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

      {showCreate && (
        <MiniHomeCreateModal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch() }}
        />
      )}
    </div>
  )
}

function RecommendedCard({ minihome }: { minihome: MiniHome }) {
  return (
    <Link href={`/minihome/${minihome._id}`}
      className="flex-shrink-0 w-48 bg-bg-secondary border border-line hover:border-red-500/40 rounded-xl overflow-hidden transition-all group">
      {minihome.coverImage ? (
        <Image src={minihome.coverImage} alt={minihome.companyName} width={400} height={96} className="w-full h-24 object-cover" unoptimized />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-text-muted" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {minihome.profileImage ? (
            <Image src={minihome.profileImage} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-line" unoptimized />
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
            </div>
          )}
          <p className="text-text-primary text-xs font-semibold truncate group-hover:text-red-300 transition-colors">{minihome.companyName}</p>
        </div>
        <p className="text-text-muted text-xs line-clamp-2">{minihome.introduction}</p>
      </div>
    </Link>
  )
}

function MiniHomeCard({ minihome }: { minihome: MiniHome }) {
  const repGame = minihome.representativeGameId

  return (
    <Link href={`/minihome/${minihome._id}`}
      className="block bg-bg-secondary border border-line hover:border-red-500/40 rounded-xl overflow-hidden transition-all group">
      {repGame?.coverUrl ? (
        <Image src={repGame.coverUrl} alt={repGame.title} width={400} height={144} className="w-full h-36 object-cover" unoptimized />
      ) : minihome.coverImage ? (
        <Image src={minihome.coverImage} alt={minihome.companyName} width={400} height={144} className="w-full h-36 object-cover" unoptimized />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-text-muted" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          {minihome.profileImage ? (
            <Image src={minihome.profileImage} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-line flex-shrink-0" unoptimized />
          ) : (
            <div className="w-9 h-9 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-red-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-sm group-hover:text-red-300 transition-colors truncate">{minihome.companyName}</p>
            <p className="text-text-muted text-xs truncate">{minihome.userId?.username}</p>
          </div>
        </div>

        <p className="text-text-secondary text-xs line-clamp-2 mb-3 leading-relaxed">{minihome.introduction}</p>

        {minihome.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {minihome.tags.map(tag => (
              <span key={tag} className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {minihome.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {minihome.keywords.slice(0, 3).map(kw => (
              <span key={kw} className="bg-bg-tertiary text-text-secondary text-xs px-2 py-0.5 rounded border border-line">{kw}</span>
            ))}
            {minihome.keywords.length > 3 && (
              <span className="text-text-muted text-xs">+{minihome.keywords.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
