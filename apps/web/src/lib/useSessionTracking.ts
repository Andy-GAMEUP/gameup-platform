'use client'
import { useEffect, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'
const HEARTBEAT_INTERVAL = 5 * 60 * 1000 // 5분

export function useSessionTracking() {
  const sessionIdRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // 세션 시작
    fetch(`${API_BASE}/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: 'web' }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId
        }
      })
      .catch(() => {})

    // 5분마다 하트비트
    intervalRef.current = setInterval(() => {
      if (!sessionIdRef.current) return
      const currentToken = localStorage.getItem('token')
      if (!currentToken) return

      fetch(`${API_BASE}/session/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {})
    }, HEARTBEAT_INTERVAL)

    // 세션 종료 (페이지 떠날 때)
    const endSession = () => {
      if (!sessionIdRef.current) return
      const currentToken = localStorage.getItem('token')
      if (!currentToken) return

      navigator.sendBeacon(
        `${API_BASE}/session/end`,
        new Blob(
          [JSON.stringify({ sessionId: sessionIdRef.current })],
          { type: 'application/json' }
        )
      )
    }

    window.addEventListener('beforeunload', endSession)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('beforeunload', endSession)
      endSession()
    }
  }, [])
}
