import { Request, Response } from 'express'
import { LevelModel, ActivityScoreModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

/**
 * GET /api/levels (공개)
 * 전체 레벨 목록 조회 - 프론트엔드 LevelBadge에서 사용
 */
export const getPublicLevels = async (_req: Request, res: Response) => {
  try {
    const levels = await LevelModel.find()
      .select('level name icon requiredScore')
      .sort({ level: 1 })
      .lean()
    return res.json({ levels })
  } catch {
    return res.status(500).json({ message: '레벨 목록 조회 실패' })
  }
}

/**
 * GET /api/my/activity-scores (인증 필수)
 * 내 활동 포인트 이력 조회
 */
export const getMyActivityScores = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { page = 1, limit = 20, type } = req.query
    const filter: Record<string, unknown> = { userId: req.user.id }
    if (type) filter.type = type

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const [history, total] = await Promise.all([
      ActivityScoreModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ActivityScoreModel.countDocuments(filter),
    ])

    return res.json({
      history,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch {
    return res.status(500).json({ message: '활동 이력 조회 실패' })
  }
}
