'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Play, Globe, MessageCircle, Loader2 } from 'lucide-react'
import publishingService, { PublishingType, FeaturedGame } from '@/services/publishingService'

interface GameDetail extends FeaturedGame {
  trailer?: string
  website?: string
  discord?: string
  tags?: string[]
}

export default function PublishingGameDetailPage() {
  const params = useParams()
  const type = params.type as PublishingType
  const gameId = params.gameId as string

  const [game, setGame] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !gameId) return
    setLoading(true)
    publishingService.getGame(type, gameId)
      .then(data => {
        setGame(data.game as GameDetail)
        if (data.game.thumbnail) setActiveImage(data.game.thumbnail)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type, gameId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">게임을 찾을 수 없습니다</p>
        <Link href={`/publishing/${type}`} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href={`/publishing/${type}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {type.toUpperCase()} Publishing으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-72 bg-slate-800 overflow-hidden">
                {activeImage ? (
                  <img src={activeImage} alt={game.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-slate-600" />
                  </div>
                )}
              </div>
              {game.thumbnail && game.thumbnail !== activeImage && (
                <div className="p-3 flex gap-2">
                  <button
                    onClick={() => setActiveImage(game.thumbnail!)}
                    className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-colors"
                  >
                    <img src={game.thumbnail} alt="" className="w-full h-full object-cover" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-bold text-lg mb-3">게임 소개</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{game.description}</p>

              {game.tags && game.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {game.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-full border border-slate-700">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h1 className="text-white font-bold text-xl mb-1">{game.title}</h1>
              <p className="text-slate-400 text-sm mb-4">
                {(game.developerId as { username?: string })?.username ?? ''}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>장르</span>
                  <span className="text-slate-200">{game.genre || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>평점</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-slate-200">{game.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>플레이 수</span>
                  <span className="text-slate-200">{game.playCount.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {game.website && (
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    공식 웹사이트
                  </a>
                )}
                {game.discord && (
                  <a
                    href={game.discord}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discord
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
