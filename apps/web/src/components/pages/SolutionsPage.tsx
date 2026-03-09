'use client'
import { useState, useEffect } from 'react'
import { Shield, Zap, HeadphonesIcon, ArrowRight } from 'lucide-react'
import solutionService, { Solution } from '@/services/solutionService'
import SolutionDetailModal from '@/components/SolutionDetailModal'

const categoryColors: Record<string, string> = {
  QA: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  보안: 'bg-red-500/20 text-red-300 border-red-500/30',
  음성: 'bg-green-500/20 text-green-300 border-green-500/30',
  분석: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  결제: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  기타: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

function SolutionCard({ solution, onClick }: { solution: Solution; onClick: () => void }) {
  const catColor = categoryColors[solution.category] ?? categoryColors['기타']
  return (
    <button
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 group"
    >
      <div className="h-44 overflow-hidden bg-slate-800">
        {solution.imageUrl ? (
          <img src={solution.imageUrl} alt={solution.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-4xl font-bold">
            {solution.name[0]}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded border ${catColor}`}>{solution.category}</span>
          {solution.isRecommended && (
            <span className="text-xs px-2 py-0.5 rounded border bg-orange-500/20 text-orange-300 border-orange-500/30">추천</span>
          )}
        </div>
        <h3 className="text-white font-bold text-base mb-1">{solution.name}</h3>
        <p className="text-slate-400 text-sm line-clamp-2">{solution.description}</p>
      </div>
    </button>
  )
}

export default function SolutionsPage() {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    solutionService.getSolutions()
      .then(({ solutions: s }) => setSolutions(s))
      .finally(() => setLoading(false))
  }, [])

  const recommended = solutions.filter(s => s.isRecommended)
  const all = solutions

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 py-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            Solutions Marketplace
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            게임 개발을 가속하는<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400">전문 솔루션</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            QA, 보안, 분석, 결제 등 게임 개발에 필요한 모든 솔루션을 한 곳에서 만나보세요.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {loading ? (
          <div className="text-center py-20 text-slate-400">불러오는 중...</div>
        ) : (
          <>
            {recommended.length > 0 && (
              <section className="mb-16">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-500 to-rose-500 rounded-full" />
                  <h2 className="text-white text-2xl font-bold">추천 솔루션</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recommended.map(s => (
                    <SolutionCard key={s._id} solution={s} onClick={() => setSelectedId(s._id)} />
                  ))}
                </div>
              </section>
            )}

            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full" />
                <h2 className="text-white text-2xl font-bold">전체 솔루션</h2>
                <span className="text-slate-500 text-sm">({all.length})</span>
              </div>
              {all.length === 0 ? (
                <div className="text-center py-20 text-slate-500">등록된 솔루션이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {all.map(s => (
                    <SolutionCard key={s._id} solution={s} onClick={() => setSelectedId(s._id)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className="mb-16">
          <h2 className="text-white text-2xl font-bold text-center mb-10">Why GameUp 솔루션?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">검증된 파트너</h3>
              <p className="text-slate-400 text-sm">엄격한 검증을 통과한 신뢰할 수 있는 솔루션 파트너사와 함께합니다.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">빠른 연동</h3>
              <p className="text-slate-400 text-sm">간단한 신청 절차로 빠르게 솔루션을 도입하고 개발을 가속화하세요.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">전담 지원</h3>
              <p className="text-slate-400 text-sm">솔루션 도입부터 운영까지 GameUp 담당자가 함께 지원합니다.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-r from-red-900/40 to-rose-900/40 border border-red-500/20 p-10 text-center">
          <h2 className="text-white text-2xl font-bold mb-3">원하는 솔루션이 없으신가요?</h2>
          <p className="text-slate-300 mb-6">GameUp 파트너팀에 문의하시면 맞춤 솔루션을 안내해드립니다.</p>
          <a
            href="mailto:partner@gameup.co.kr"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            파트너 문의하기 <ArrowRight className="w-4 h-4" />
          </a>
        </section>
      </div>

      <SolutionDetailModal
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
        solutionId={selectedId}
      />
    </div>
  )
}
