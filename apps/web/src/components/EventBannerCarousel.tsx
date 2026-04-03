'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface EventBanner {
  _id: string
  title: string
  description: string
  imageUrl: string
  linkUrl: string
}

export default function EventBannerCarousel({ banners }: { banners: EventBanner[] }) {
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

  if (banners.length === 0) return null

  const banner = banners[current]
  const href = banner.linkUrl || `/events/${banner._id}/register`

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      <Link href={href}>
        <div className="relative h-56 md:h-72 bg-bg-secondary">
          {banner.imageUrl && (
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <h3 className="text-text-primary font-bold text-xl drop-shadow mb-1">{banner.title}</h3>
            {banner.description && (
              <p className="text-white/80 text-sm drop-shadow">{banner.description}</p>
            )}
          </div>
        </div>
      </Link>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-bg-overlay hover:bg-bg-overlay text-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-bg-overlay hover:bg-bg-overlay text-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => go(idx)}
                className={`rounded-full transition-all ${idx === current ? 'w-5 h-2 bg-bg-card' : 'w-2 h-2 bg-bg-card/40 hover:bg-bg-card/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
