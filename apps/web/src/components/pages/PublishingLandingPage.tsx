'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Star, Play, Plus, Loader2 } from 'lucide-react'
import publishingService, { PublishingType, PublishingBanner, PublishingTab, FeaturedGame } from '@/services/publishingService'
import { useAuth } from '@/lib/useAuth'
import PublishingSuggestModal from './PublishingSuggestModal'

const PLATFORM_INFO: Record<PublishingType, { name: string; color: string; accent: string }> = {
  hms: { name: 'HMS Publishing', color: 'from-blue-900/40 to-cyan-900/20', accent: 'text-blue-400 border-blue-500/30 bg-blue-600/20' },
  hk: { name: 'HK Publishing', color: 'from-purple-900/40 to-pink-900/20', accent: 'text-purple-400 border-purple-500/30 bg-purple-600/20' },
}

function BannerCarousel({ banners }: { banners: PublishingBanner[] }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = useCallback(
    (idx: number) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setCurrent((idx + banners.length) % banners.length)
    },
    [banners.length]
  )

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setTimeout(() => go(current + 1), 4500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, go, banners.length])

  if (banners.length === 0) {
    return (
      <div className="w-full h-64 bg-bg-secondary border border-line rounded-2xl flex items-center justify-center">
        <p className="text-text-muted text-sm">등록된 배너가 없습니다</p>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      <a href={banner.linkUrl || '#'} target={banner.linkUrl ? '_blank' : '_self'} rel="noreferrer">
        <div className="relative h-72 md:h-96 bg-bg-secondary">
          {banner.imageUrl && (
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6">
            <h3 className="text-text-primary font-bold text-xl drop-shadow">{banner.title}</h3>
          </div>
        </div>
      </a>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-bg-overlay hover:bg-bg-overlay text-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-bg-overlay hover:bg-bg-overlay text-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => go(idx)}
                className={`rounded-full transition-all ${idx === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function GameCard({ game, type }: { game: FeaturedGame; type: PublishingType }) {
  return (
    <Link href={`/publishing/${type}/${game._id}`}>
      <div className="bg-bg-secondary border border-line rounded-xl overflow-hidden hover:border-line transition-all group cursor-pointer">
        <div className="h-36 bg-bg-tertiary overflow-hidden">
          {game.thumbnail ? (
            <Image src={game.thumbnail} alt={game.title} width={400} height={144} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-8 h-8 text-text-muted" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="text-text-primary text-sm font-semibold truncate">{game.title}</h4>
          <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{game.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-text-muted text-xs">{game.genre}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-text-secondary text-xs">{game.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function PublishingLandingPage({ type: propType }: { type?: PublishingType }) {
  const params = useParams()
  const type = (propType ?? params.type) as PublishingType
  const { user } = useAuth()

  const [banners, setBanners] = useState<PublishingBanner[]>([])
  const [tabs, setTabs] = useState<PublishingTab[]>([])
  const [games, setGames] = useState<FeaturedGame[]>([])
  const [activeTab, setActiveTab] = useState<string>('about')
  const [loading, setLoading] = useState(true)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestSuccess, setSuggestSuccess] = useState(false)

  const info = PLATFORM_INFO[type] ?? PLATFORM_INFO.hms

  useEffect(() => {
    if (!type || (type !== 'hms' && type !== 'hk')) return
    setLoading(true)
    publishingService.getLanding(type)
      .then(data => {
        setBanners(data.banners)
        setTabs(data.tabs)
        setGames(data.featuredGames)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  const allTabs = [{ _id: 'about', name: '소개' }, ...tabs]

  if (!type || (type !== 'hms' && type !== 'hk')) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary">잘못된 플랫폼 타입입니다</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className={`bg-gradient-to-br ${info.color} border-b border-line`}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${info.accent} mb-2`}>
                {type.toUpperCase()}
              </span>
              <h1 className="text-text-primary text-3xl font-bold">{info.name}</h1>
              <p className="text-text-secondary mt-1 text-sm">게임 퍼블리싱 플랫폼</p>
            </div>
            {user?.role === 'developer' && (
              <button
                onClick={() => { setSuggestSuccess(false); setShowSuggest(true) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-text-primary rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                게임 제안하기
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-72 md:h-96">
              <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
            </div>
          ) : (
            <BannerCarousel banners={banners} />
          )}
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-bg-secondary/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {allTabs.map(tab => (
              <button
                key={tab._id}
                onClick={() => setActiveTab(tab._id)}
                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab._id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'about' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-text-primary font-bold text-xl mb-4">추천 게임</h2>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-text-secondary" />
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-16 text-text-muted text-sm">
                  아직 등록된 게임이 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {games.map(game => (
                    <GameCard key={game._id} game={game} type={type} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tabs.filter(t => t._id === activeTab).map(tab => (
          <div key={tab._id} className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: tab.content }} />
          </div>
        ))}
      </div>

      {showSuggest && (
        <PublishingSuggestModal
          type={type}
          onClose={() => setShowSuggest(false)}
          onSuccess={() => {
            setShowSuggest(false)
            setSuggestSuccess(true)
            setTimeout(() => setSuggestSuccess(false), 4000)
          }}
        />
      )}

      {suggestSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-text-primary px-4 py-3 rounded-lg text-sm shadow-lg z-50">
          게임 제안이 성공적으로 등록되었습니다!
        </div>
      )}
    </div>
  )
}
