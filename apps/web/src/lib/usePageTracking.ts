'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

function getSessionId(): string {
  const key = 'gameup-session-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

function getMenuFromPath(path: string): string {
  if (path === '/') return 'home'
  if (path.startsWith('/games')) return 'games'
  if (path.startsWith('/community')) return 'community'
  if (path.startsWith('/partner')) return 'partner'
  if (path.startsWith('/publishing')) return 'publishing'
  if (path.startsWith('/minihome')) return 'minihome'
  if (path.startsWith('/support')) return 'support'
  if (path.startsWith('/solution')) return 'solution'
  return 'other'
}

export function usePageTracking() {
  const pathname = usePathname()
  const visitIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // 관리자 페이지는 추적 제외
    if (pathname.startsWith('/admin')) return

    const sessionId = getSessionId()
    const token = localStorage.getItem('token')
    let userId: string | undefined
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        userId = payload.userId || payload.id
      }
    } catch { /* ignore */ }

    startTimeRef.current = Date.now()

    // 페이지 방문 기록
    fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: pathname,
        referrer: document.referrer,
        sessionId,
        userId,
      }),
    })
      .then(r => r.json())
      .then(data => { visitIdRef.current = data.id ?? null })
      .catch(() => { visitIdRef.current = null })

    // 체류시간 전송
    const sendDuration = () => {
      if (!visitIdRef.current) return
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (duration <= 0) return
      navigator.sendBeacon(
        `${API_BASE}/analytics/track/${visitIdRef.current}/duration`,
        new Blob([JSON.stringify({ duration })], { type: 'application/json' }),
      )
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendDuration()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', sendDuration)

    return () => {
      sendDuration()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', sendDuration)
    }
  }, [pathname])
}
