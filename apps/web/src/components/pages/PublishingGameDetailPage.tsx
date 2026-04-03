'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">게임을 찾을 수 없습니다</p>
        <Link href={`/publishing/${type}`} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href={`/publishing/${type}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {type.toUpperCase()} Publishing으로 돌아가기
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-bg-secondary border border-line rounded-2xl overflow-hidden">
              <div className="h-72 bg-bg-tertiary overflow-hidden">
                {activeImage ? (
                  <Image src={activeImage} alt={game.title} width={800} height={288} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-text-muted" />
                  </div>
                )}
              </div>
              {game.thumbnail && game.thumbnail !== activeImage && (
                <div className="p-3 flex gap-2">
                  <button
                    onClick={() => setActiveImage(game.thumbnail!)}
                    className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-colors"
                  >
                    <Image src={game.thumbnail} alt="" width={64} height={64} className="w-full h-full object-cover" unoptimized />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-bg-secondary border border-line rounded-2xl p-6">
              <h2 className="text-text-primary font-bold text-lg mb-3">게임 소개</h2>
              <p className="text-text-secondary text-sm leading-relaxed">{game.description}</p>

              {game.tags && game.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {game.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 bg-bg-tertiary text-text-secondary text-xs rounded-full border border-line">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-bg-secondary border border-line rounded-2xl p-5">
              <h1 className="text-text-primary font-bold text-xl mb-1">{game.title}</h1>
              <p className="text-text-secondary text-sm mb-4">
                {(game.developerId as { username?: string })?.username ?? ''}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-text-secondary">
                  <span>장르</span>
                  <span className="text-text-primary">{game.genre || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>평점</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-text-primary">{game.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>플레이 수</span>
                  <span className="text-text-primary">{game.playCount.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {game.website && (
                  <a
                    href={game.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 w-full px-4 py-2.5 bg-bg-tertiary hover:bg-line-light text-text-primary rounded-xl text-sm transition-colors"
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
                    className="flex items-center gap-2 w-full px-4 py-2.5 bg-bg-tertiary hover:bg-line-light text-text-primary rounded-xl text-sm transition-colors"
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
