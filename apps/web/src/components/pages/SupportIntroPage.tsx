'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Loader2, Rocket } from 'lucide-react'
import supportService, { SupportBanner, SupportTab, Season } from '@/services/supportService'

function BannerCarousel({ banners }: { banners: SupportBanner[] }) {
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
      <div className="w-full h-64 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center">
        <p className="text-slate-500 text-sm">등록된 배너가 없습니다</p>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      <a href={banner.linkUrl || '#'} target={banner.linkUrl ? '_blank' : '_self'} rel="noreferrer">
        <div className="relative h-72 md:h-96 bg-slate-900">
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
            <h3 className="text-white font-bold text-xl drop-shadow">{banner.title}</h3>
          </div>
        </div>
      </a>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

export default function SupportIntroPage() {
  const [banners, setBanners] = useState<SupportBanner[]>([])
  const [tabs, setTabs] = useState<SupportTab[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [activeTab, setActiveTab] = useState<string>('intro')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [introData, seasonData] = await Promise.all([
          supportService.getIntro(),
          supportService.getCurrentSeason(),
        ])
        setBanners(introData.banners)
        setTabs(introData.tabs)
        setCurrentSeason(seasonData.season)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const allTabs = [{ _id: 'intro', name: '소개' }, ...tabs]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="bg-gradient-to-br from-red-900/30 to-slate-900/60 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold border bg-red-600/20 text-red-300 border-red-500/30 mb-2">
                SUPPORT PROGRAM
              </span>
              <h1 className="text-white text-3xl font-bold">GAMEUP 인큐베이션</h1>
              <p className="text-slate-400 mt-1 text-sm">게임 개발사를 위한 시즌 기반 지원 프로그램</p>
            </div>
            {currentSeason && (
              <Link
                href={`/support/season/${currentSeason._id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Rocket className="w-4 h-4" />
                현재 시즌 보기
              </Link>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-72 md:h-96">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <BannerCarousel banners={banners} />
          )}
        </div>
      </div>

      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {allTabs.map(tab => (
              <button
                key={tab._id}
                onClick={() => setActiveTab(tab._id)}
                className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab._id
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'intro' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-red-400 font-bold text-lg">01</span>
                </div>
                <h3 className="text-white font-bold mb-2">게임 신청</h3>
                <p className="text-slate-400 text-sm">모집 기간 내 게임 정보를 제출하고 인큐베이션 참가를 신청하세요.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-red-400 font-bold text-lg">02</span>
                </div>
                <h3 className="text-white font-bold mb-2">선발 & 지원</h3>
                <p className="text-slate-400 text-sm">심사를 통해 선발된 게임은 마일스톤 기반 집중 지원을 받습니다.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-red-400 font-bold text-lg">03</span>
                </div>
                <h3 className="text-white font-bold mb-2">데모데이</h3>
                <p className="text-slate-400 text-sm">시즌 완료 후 투자사 및 퍼블리셔 앞 데모데이를 진행합니다.</p>
              </div>
            </div>

            {currentSeason && (
              <div className="bg-gradient-to-r from-red-900/20 to-slate-900 border border-red-800/40 rounded-xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-red-400 text-xs font-bold uppercase tracking-wider">현재 진행중</span>
                  <h3 className="text-white font-bold text-lg mt-1">{currentSeason.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {currentSeason.status === 'recruiting' && '지금 참가 신청 접수 중'}
                    {currentSeason.status === 'in-progress' && '진행 중인 시즌'}
                    {currentSeason.status === 'completed' && '완료된 시즌'}
                    {currentSeason.status === 'draft' && '준비 중인 시즌'}
                  </p>
                </div>
                <Link
                  href={`/support/season/${currentSeason._id}`}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  자세히 보기
                </Link>
              </div>
            )}
          </div>
        )}

        {tabs.filter(t => t._id === activeTab).map(tab => (
          <div key={tab._id} className="prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: tab.content }} />
          </div>
        ))}
      </div>
    </div>
  )
}
