import { Request, Response } from 'express'
import { PageVisitModel } from '@gameup/db'

function detectPlatform(ua: string): string {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'Mobile'
  return 'PC'
}

function detectMenu(page: string): string {
  if (page === '/' || page === '') return 'home'
  if (page.startsWith('/games')) return 'games'
  if (page.startsWith('/community')) return 'community'
  if (page.startsWith('/partner')) return 'partner'
  if (page.startsWith('/publishing')) return 'publishing'
  if (page.startsWith('/minihome')) return 'minihome'
  if (page.startsWith('/support')) return 'support'
  if (page.startsWith('/solution')) return 'solution'
  return 'other'
}

// POST /api/analytics/track
export const trackPageVisit = async (req: Request, res: Response) => {
  try {
    const { page, referrer, sessionId, userId } = req.body

    if (!page || !sessionId) {
      return res.status(400).json({ message: 'page와 sessionId는 필수입니다' })
    }

    const userAgent = req.headers['user-agent'] || ''
    const platform = detectPlatform(userAgent)
    const menu = detectMenu(page)

    const visit = await PageVisitModel.create({
      userId: userId || null,
      sessionId,
      page,
      menu,
      referrer: referrer || '',
      userAgent,
      platform,
      duration: 0,
    })

    res.status(201).json({ id: visit._id })
  } catch {
    res.status(500).json({ message: '방문 기록 실패' })
  }
}

// PATCH /api/analytics/track/:id/duration
export const updateDuration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { duration } = req.body

    if (typeof duration !== 'number' || duration < 0) {
      return res.status(400).json({ message: '유효한 duration 값이 필요합니다' })
    }

    // 최대 30분(1800초) 제한
    const cappedDuration = Math.min(duration, 1800)

    await PageVisitModel.findByIdAndUpdate(id, { duration: cappedDuration })
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '체류시간 업데이트 실패' })
  }
}
