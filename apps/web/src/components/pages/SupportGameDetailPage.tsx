'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, Download, CheckCircle, Circle, ExternalLink } from 'lucide-react'
import supportService, { GameApplication } from '@/services/supportService'

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-white text-sm w-10 text-right flex-shrink-0">{value}점</span>
    </div>
  )
}

export default function SupportGameDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [game, setGame] = useState<GameApplication | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await supportService.getGameDetail(id)
        setGame(data.game)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-slate-400">게임을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const score = game.score ?? { gameplay: 0, design: 0, sound: 0, business: 0, total: 0 }
  const hasScore = score.total > 0
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="bg-gradient-to-br from-red-900/20 to-slate-900/60 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/support/season/${game.seasonId}`} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-slate-500 text-sm">시즌으로 돌아가기</span>
          </div>

          <div className="flex items-center gap-5">
            {game.iconUrl ? (
              <img src={game.iconUrl} alt={game.gameName} className="w-20 h-20 rounded-2xl object-cover bg-slate-800 flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-800 flex-shrink-0" />
            )}
            <div>
              <h1 className="text-white text-2xl font-bold">{game.gameName}</h1>
              <p className="text-slate-400 text-sm mt-1">{game.genre}</p>
              <p className="text-slate-500 text-xs mt-0.5">{game.userId?.username}</p>
              {game.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {game.platforms.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-white font-bold mb-3">게임 소개</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{game.description}</p>
        </div>

        {game.supportPoints > 0 && (
          <div className="bg-gradient-to-r from-red-900/20 to-slate-900 border border-red-800/40 rounded-xl p-6">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">지원 포인트</p>
            <p className="text-white text-3xl font-bold">{game.supportPoints.toLocaleString()} P</p>
          </div>
        )}

        {hasScore && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500/40 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-xl font-bold">{score.total}</span>
                <span className="text-slate-500 text-xs">총점</span>
              </div>
              <div className="flex-1 space-y-3">
                <ScoreBar label="게임플레이" value={score.gameplay} />
                <ScoreBar label="디자인" value={score.design} />
                <ScoreBar label="사운드" value={score.sound} />
                <ScoreBar label="비즈니스" value={score.business} />
              </div>
            </div>
          </div>
        )}

        {game.milestones.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-6">마일스톤</h2>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-800" />
              <div className="space-y-6">
                {game.milestones.map((m, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 border-2 flex items-center justify-center z-10"
                      style={{ borderColor: m.isCompleted ? '#16a34a' : '#475569' }}>
                      {m.isCompleted
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <Circle className="w-4 h-4 text-slate-600" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-white text-sm font-medium">{m.title}</h3>
                          <p className="text-slate-500 text-xs mt-0.5">{formatDate(m.date)}</p>
                          {m.description && (
                            <p className="text-slate-400 text-sm mt-2">{m.description}</p>
                          )}
                        </div>
                        {m.buildUrl && (
                          <a href={m.buildUrl} target="_blank" rel="noreferrer"
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            빌드
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {game.irDocumentUrl && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-3">IR 문서</h2>
            <a href={game.irDocumentUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              <ExternalLink className="w-4 h-4" />
              IR 자료 보기
            </a>
          </div>
        )}

        {game.introVideoUrl && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-3">소개 영상</h2>
            <a href={game.introVideoUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors">
              <ExternalLink className="w-4 h-4" />
              영상 보기
            </a>
          </div>
        )}

        {game.screenshots.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4">스크린샷</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {game.screenshots.map((s, i) => (
                <img key={i} src={s} alt={`스크린샷 ${i + 1}`}
                  className="w-48 h-28 object-cover rounded-lg flex-shrink-0 bg-slate-800" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
