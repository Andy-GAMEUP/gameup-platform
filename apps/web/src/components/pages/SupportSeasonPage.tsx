'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ChevronDown, Gamepad2, ArrowLeft } from 'lucide-react'
import supportService, { Season, GameApplication } from '@/services/supportService'
import { useAuth } from '@/lib/useAuth'
import GameApplyModal from '@/components/GameApplyModal'

const STATUS_CONFIG = {
  draft: { label: '준비중', cls: 'bg-bg-tertiary text-text-secondary border-line' },
  recruiting: { label: '모집중', cls: 'bg-green-900/40 text-accent border-green-700/50' },
  'in-progress': { label: '진행중', cls: 'bg-blue-900/40 text-blue-400 border-blue-700/50' },
  completed: { label: '완료', cls: 'bg-purple-900/40 text-purple-400 border-purple-700/50' },
}

function StatusBadge({ status }: { status: Season['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function GameCard({ game }: { game: GameApplication }) {
  const total = game.score?.total ?? 0
  return (
    <Link href={`/support/games/${game._id}`} className="bg-bg-secondary border border-line rounded-xl p-4 hover:border-line transition-colors block">
      <div className="flex items-center gap-3 mb-3">
        {game.iconUrl ? (
          <Image src={game.iconUrl} alt={game.gameName} width={48} height={48} className="w-12 h-12 rounded-xl object-cover bg-bg-tertiary flex-shrink-0" unoptimized />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <Gamepad2 className="w-6 h-6 text-text-muted" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-medium text-sm truncate">{game.gameName}</h3>
          <p className="text-text-secondary text-xs mt-0.5">{game.genre}</p>
        </div>
        {total > 0 && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <span className="text-red-400 text-xs font-bold">{total}</span>
          </div>
        )}
      </div>
      {game.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {game.platforms.map(p => (
            <span key={p} className="text-xs px-1.5 py-0.5 bg-bg-tertiary text-text-secondary rounded border border-line">{p}</span>
          ))}
        </div>
      )}
    </Link>
  )
}

export default function SupportSeasonPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()

  const [season, setSeason] = useState<Season | null>(null)
  const [games, setGames] = useState<GameApplication[]>([])
  const [allSeasons, setAllSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [seasonData, gamesData] = await Promise.all([
        supportService.getSeasonDetail(id),
        supportService.getSelectedGames(id),
      ])
      setSeason(seasonData.season)
      setGames(gamesData.games)
    } catch {}
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supportService.admin.getSeasons({ limit: 50 })
      .then(d => setAllSeasons(d.seasons))
      .catch(() => {})
  }, [])

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary">시즌을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="bg-gradient-to-br from-red-900/30 to-slate-900/60 border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/support" className="text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-text-muted text-sm">GAMEUP 인큐베이션</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={season.status} />
                {allSeasons.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(v => !v)}
                      className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs transition-colors"
                    >
                      다른 시즌 <ChevronDown className="w-3 h-3" />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-bg-tertiary border border-line rounded-lg overflow-hidden z-10 min-w-48">
                        {allSeasons.map(s => (
                          <Link
                            key={s._id}
                            href={`/support/season/${s._id}`}
                            onClick={() => setDropdownOpen(false)}
                            className={`block px-4 py-2.5 text-sm transition-colors ${s._id === id ? 'text-red-400 bg-red-900/20' : 'text-text-secondary hover:bg-line-light'}`}
                          >
                            {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <h1 className="text-text-primary text-3xl font-bold">{season.title}</h1>
            </div>

            {season.status === 'recruiting' && user?.role === 'developer' && (
              <button
                onClick={() => setApplyOpen(true)}
                className="flex-shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-text-primary rounded-xl text-sm font-medium transition-colors"
              >
                참가 신청
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {(season.status === 'recruiting' || season.status === 'draft') && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6">
            <h2 className="text-text-primary font-bold text-lg mb-4">{season.recruitingTitle || '모집 안내'}</h2>
            {season.recruitingDescription && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4">{season.recruitingDescription}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-bg-tertiary/60 rounded-lg p-4">
                <p className="text-text-muted text-xs mb-1">모집 시작</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(season.recruitingStartDate)}</p>
              </div>
              <div className="bg-bg-tertiary/60 rounded-lg p-4">
                <p className="text-text-muted text-xs mb-1">모집 마감</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(season.recruitingEndDate)}</p>
              </div>
              <div className="bg-bg-tertiary/60 rounded-lg p-4">
                <p className="text-text-muted text-xs mb-1">모집 인원</p>
                <p className="text-text-primary text-sm font-medium">{season.recruitingMaxCount}팀</p>
              </div>
            </div>
          </div>
        )}

        {(season.status === 'in-progress' || season.status === 'completed') && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6">
            <h2 className="text-text-primary font-bold text-lg mb-4">{season.progressTitle || '진행 안내'}</h2>
            {season.progressDescription && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4">{season.progressDescription}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-bg-tertiary/60 rounded-lg p-4">
                <p className="text-text-muted text-xs mb-1">진행 시작</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(season.progressStartDate)}</p>
              </div>
              <div className="bg-bg-tertiary/60 rounded-lg p-4">
                <p className="text-text-muted text-xs mb-1">진행 종료</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(season.progressEndDate)}</p>
              </div>
            </div>
          </div>
        )}

        {season.status === 'completed' && season.completionTitle && (
          <div className="bg-bg-secondary border border-line rounded-xl p-6">
            <h2 className="text-text-primary font-bold text-lg mb-4">{season.completionTitle}</h2>
            {season.completionDescription && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4">{season.completionDescription}</p>
            )}
            {season.completionDate && (
              <div className="bg-bg-tertiary/60 rounded-lg p-4 inline-block">
                <p className="text-text-muted text-xs mb-1">완료일</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(season.completionDate)}</p>
              </div>
            )}
          </div>
        )}

        {games.length > 0 && (
          <div>
            <h2 className="text-text-primary font-bold text-lg mb-4">선발 게임 ({games.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map(game => (
                <GameCard key={game._id} game={game} />
              ))}
            </div>
          </div>
        )}
      </div>

      <GameApplyModal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        seasonId={id}
        onSuccess={() => { setApplyOpen(false); load() }}
      />
    </div>
  )
}
