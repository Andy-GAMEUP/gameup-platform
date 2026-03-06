import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import Favorite from '../models/Favorite'
import Game from '../models/Game'
import PlayerActivity from '../models/PlayerActivity'

// 즐겨찾기 토글
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id

    const existing = await Favorite.findOne({ userId, gameId })

    if (existing) {
      await Favorite.deleteOne({ userId, gameId })
      await PlayerActivity.create({ userId, gameId, type: 'unfavorite' })
      return res.json({ favorited: false, message: '즐겨찾기가 해제되었습니다' })
    }

    await Favorite.create({ userId, gameId })
    await PlayerActivity.create({ userId, gameId, type: 'favorite' })
    res.status(201).json({ favorited: true, message: '즐겨찾기에 추가되었습니다' })
  } catch (error) {
    res.status(500).json({ message: '즐겨찾기 처리 실패' })
  }
}

// 내 즐겨찾기 목록
export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 12 } = req.query

    const total = await Favorite.countDocuments({ userId })
    const favorites = await Favorite.find({ userId })
      .populate({
        path: 'gameId',
        select: 'title genre thumbnail rating playCount status approvalStatus feedbackCount'
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    res.json({ favorites, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch (error) {
    res.status(500).json({ message: '즐겨찾기 조회 실패' })
  }
}

// 즐겨찾기 여부 확인 (복수)
export const checkFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameIds } = req.body

    if (!Array.isArray(gameIds)) return res.status(400).json({ message: 'gameIds 배열 필요' })

    const favorites = await Favorite.find({ userId, gameId: { $in: gameIds } })
    const favoriteSet = new Set(favorites.map((f) => f.gameId.toString()))
    const result: Record<string, boolean> = {}
    gameIds.forEach((id: string) => { result[id] = favoriteSet.has(id) })

    res.json({ favorites: result })
  } catch (error) {
    res.status(500).json({ message: '조회 실패' })
  }
}

// 플레이 시작 - playCount +1 (5분 이내 중복 방지)
export const recordPlay = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentPlay = await PlayerActivity.findOne({
      userId,
      gameId,
      type: 'play',
      createdAt: { $gte: fiveMinutesAgo }
    })

    if (recentPlay) {
      const updated = await Game.findById(gameId).select('playCount')
      return res.json({ message: '플레이 기록 완료 (중복 차단)', playCount: updated?.playCount || 0, duplicate: true })
    }

    await Game.findByIdAndUpdate(gameId, { $inc: { playCount: 1 } })
    await PlayerActivity.create({ userId, gameId, type: 'play' })

    const updated = await Game.findById(gameId).select('playCount')
    res.json({ message: '플레이 기록 완료', playCount: updated?.playCount || 0, duplicate: false })
  } catch (error) {
    res.status(500).json({ message: '기록 실패' })
  }
}

// 플레이 종료 - 세션 시간만 업데이트 (playCount 증가 없음)
export const updatePlaySession = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id
    const { sessionDuration } = req.body

    if (!sessionDuration || typeof sessionDuration !== 'number' || sessionDuration <= 0) {
      return res.json({ message: '세션 정보 없음' })
    }

    // 가장 최근 play 기록에 세션 시간 업데이트
    await PlayerActivity.findOneAndUpdate(
      { userId, gameId, type: 'play' },
      { sessionDuration },
      { sort: { createdAt: -1 } }
    )

    res.json({ message: '세션 시간 업데이트 완료' })
  } catch (error) {
    res.status(500).json({ message: '세션 업데이트 실패' })
  }
}

// 내 활동 내역
export const getMyActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 20 } = req.query

    const total = await PlayerActivity.countDocuments({ userId })
    const activities = await PlayerActivity.find({ userId })
      .populate('gameId', 'title thumbnail genre')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const playCount = await PlayerActivity.countDocuments({ userId, type: 'play' })
    const reviewCount = await PlayerActivity.countDocuments({ userId, type: 'review' })
    const favoriteCount = await Favorite.countDocuments({ userId })

    res.json({
      activities,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats: { playCount, reviewCount, favoriteCount }
    })
  } catch (error) {
    res.status(500).json({ message: '활동 내역 조회 실패' })
  }
}
