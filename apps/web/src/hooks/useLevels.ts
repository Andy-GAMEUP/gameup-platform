'use client'
import { useState, useEffect } from 'react'
import apiClient from '../services/api'

export interface LevelInfo {
  level: number
  name: string
  icon: string
  requiredScore: number
}

let cachedLevels: LevelInfo[] | null = null
let cacheTime = 0
const CACHE_TTL = 10 * 60 * 1000 // 10분

export function useLevels() {
  const [levels, setLevels] = useState<LevelInfo[]>(cachedLevels || [])
  const [loading, setLoading] = useState(!cachedLevels)

  useEffect(() => {
    if (cachedLevels && Date.now() - cacheTime < CACHE_TTL) {
      setLevels(cachedLevels)
      setLoading(false)
      return
    }

    let cancelled = false
    apiClient.get('/levels')
      .then(res => {
        if (!cancelled) {
          const data = res.data.levels || []
          cachedLevels = data
          cacheTime = Date.now()
          setLevels(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const getLevelInfo = (level: number): LevelInfo | undefined => {
    return levels.find(l => l.level === level)
  }

  const getNextLevel = (level: number): LevelInfo | undefined => {
    return levels.find(l => l.level === level + 1)
  }

  const getProgressToNext = (currentScore: number, level: number): { percent: number; remaining: number } => {
    const current = levels.find(l => l.level === level)
    const next = levels.find(l => l.level === level + 1)
    if (!current || !next) return { percent: 100, remaining: 0 }

    const range = next.requiredScore - current.requiredScore
    const progress = currentScore - current.requiredScore
    const percent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)))
    const remaining = Math.max(0, next.requiredScore - currentScore)
    return { percent, remaining }
  }

  return { levels, loading, getLevelInfo, getNextLevel, getProgressToNext }
}
