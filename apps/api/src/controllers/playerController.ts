import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth'
import { ScrapModel as Scrap, GameModel as Game, PlayerActivityModel as PlayerActivity, PostModel as Post } from '@gameup/db'

// 즐겨찾기 토글 (Scrap으로 저장)
export const toggleScrap = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id

    const existing = await Scrap.findOne({ userId, targetId: gameId, targetType: 'game' })

    if (existing) {
      await Scrap.deleteOne({ userId, targetId: gameId, targetType: 'game' })
      await PlayerActivity.create({ userId, gameId, type: 'unfavorite' })
      return res.json({ favorited: false, message: '즐겨찾기가 해제되었습니다' })
    }

    await Scrap.create({ userId, targetId: gameId, targetType: 'game' })
    await PlayerActivity.create({ userId, gameId, type: 'favorite' })
    res.status(201).json({ favorited: true, message: '즐겨찾기에 추가되었습니다' })
  } catch {
    res.status(500).json({ message: '즐겨찾기 처리 실패' })
  }
}

// 내 게임 스크랩(즐겨찾기) 목록
export const getMyGameScraps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { page = 1, limit = 12 } = req.query

    const total = await Scrap.countDocuments({ userId, targetType: 'game' })
    const scraps = await Scrap.find({ userId, targetType: 'game' })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const gameIds = scraps.map((s) => s.targetId)
    const games = await Game.find({ _id: { $in: gameIds } })
      .select('title genre thumbnail rating playCount status approvalStatus feedbackCount')

    const gameMap = new Map(games.map((g) => [g._id.toString(), g]))
    const favorites = scraps.map((s) => ({
      _id: s._id,
      gameId: gameMap.get(s.targetId.toString()),
      createdAt: s.createdAt,
    }))

    res.json({ favorites, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '즐겨찾기 조회 실패' })
  }
}

// 즐겨찾기 여부 확인 (복수)
export const checkScraps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameIds } = req.body

    if (!Array.isArray(gameIds)) return res.status(400).json({ message: 'gameIds 배열 필요' })

    const scraps = await Scrap.find({ userId, targetId: { $in: gameIds }, targetType: 'game' })
    const scrapSet = new Set(scraps.map((s) => s.targetId.toString()))
    const result: Record<string, boolean> = {}
    gameIds.forEach((id: string) => { result[id] = scrapSet.has(id) })

    res.json({ favorites: result })
  } catch {
    res.status(500).json({ message: '조회 실패' })
  }
}

// 전체 스크랩 목록 (타입 필터 지원)
export const getMyAllScraps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const { type, page = 1, limit = 20 } = req.query
    const filter: Record<string, unknown> = { userId }
    if (type && ['game', 'community', 'partner', 'minihome', 'solution'].includes(type as string)) {
      filter.targetType = type
    }
    const total = await Scrap.countDocuments(filter)
    const scraps = await Scrap.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    const gameIds = scraps.filter((s) => s.targetType === 'game').map((s) => s.targetId)
    const postIds = scraps.filter((s) => s.targetType === 'community').map((s) => s.targetId)

    const [games, posts] = await Promise.all([
      gameIds.length ? Game.find({ _id: { $in: gameIds } }).select('title thumbnail genre status') : Promise.resolve([]),
      postIds.length ? Post.find({ _id: { $in: postIds } }).select('title channel author createdAt').populate('author', 'username') : Promise.resolve([]),
    ])

    const gameMap = new Map((games as { _id: mongoose.Types.ObjectId }[]).map((g) => [g._id.toString(), g]))
    const postMap = new Map((posts as { _id: mongoose.Types.ObjectId }[]).map((p) => [p._id.toString(), p]))

    const populated = scraps.map((s) => ({
      ...s.toObject(),
      target: s.targetType === 'game' ? gameMap.get(s.targetId.toString())
            : s.targetType === 'community' ? postMap.get(s.targetId.toString())
            : null,
    }))

    res.json({ scraps: populated, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '스크랩 목록 조회 실패' })
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
  } catch {
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
  } catch {
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
    const favoriteCount = await Scrap.countDocuments({ userId, targetType: 'game' })

    res.json({
      activities,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats: { playCount, reviewCount, favoriteCount }
    })
  } catch {
    res.status(500).json({ message: '활동 내역 조회 실패' })
  }
}

export const toggleFavorite = toggleScrap
export const getMyFavorites = getMyGameScraps
export const checkFavorites = checkScraps
