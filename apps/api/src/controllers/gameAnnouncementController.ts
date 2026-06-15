import { Request, Response } from 'express'
import { GameAnnouncementModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

export const getPublicGameAnnouncements = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const page = Math.max(1, Number(req.query.page) || 1)

    const total = await GameAnnouncementModel.countDocuments({ gameId })
    const announcements = await GameAnnouncementModel.find({ gameId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const game = await GameModel.findById(gameId).select('_id title thumbnail serviceType').lean()
    const result = announcements.map(a => ({ ...a, game: game || null }))

    res.json({ announcements: result, total })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

export const getGameAnnouncementById = async (req: Request, res: Response) => {
  try {
    const { announcementId } = req.params
    const announcement = await GameAnnouncementModel.findByIdAndUpdate(
      announcementId,
      { $inc: { views: 1 } },
      { new: true }
    ).lean()
    if (!announcement) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })

    const game = await GameModel.findById(announcement.gameId)
      .select('_id title thumbnail serviceType')
      .lean()

    res.json({ announcement: { ...announcement, game } })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

export const getRecentGameAnnouncements = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15))
    const page = Math.max(1, Number(req.query.page) || 1)

    const total = await GameAnnouncementModel.countDocuments()
    const announcements = await GameAnnouncementModel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const gameIds = [...new Set(announcements.map(a => a.gameId.toString()))]
    const games = await GameModel.find({ _id: { $in: gameIds } })
      .select('_id title thumbnail serviceType')
      .lean()
    const gameMap = Object.fromEntries(games.map(g => [g._id.toString(), g]))

    const result = announcements.map(a => ({
      ...a,
      game: gameMap[a.gameId.toString()] || null,
    }))

    res.json({ announcements: result, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

const verifyGameOwner = async (gameId: string, userId: string, role?: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (role !== 'admin' && game.developerId.toString() !== userId) return null
  return game
}

export const getGameAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { page = 1, limit = 20 } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const total = await GameAnnouncementModel.countDocuments({ gameId })
    const announcements = await GameAnnouncementModel.find({ gameId })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    res.json({ success: true, announcements, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    console.error('Get announcements error:', error)
    res.status(500).json({ message: '공지 조회에 실패했습니다' })
  }
}

export const createGameAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId } = req.params
    const { title, content, type, priority, sendPush, startDate, endDate } = req.body

    if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요' })
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const shouldSendPush = sendPush === true || sendPush === 'true'
    const recipients = shouldSendPush ? (game.testers || 0) : 0

    const announcement = await GameAnnouncementModel.create({
      gameId,
      developerId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      type: type || 'notice',
      priority: priority || 'normal',
      sendPush: shouldSendPush,
      recipients,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    res.status(201).json({ success: true, announcement })
  } catch (error) {
    console.error('Create announcement error:', error)
    res.status(500).json({ message: '공지 등록에 실패했습니다' })
  }
}

export const deleteGameAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, announcementId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const announcement = await GameAnnouncementModel.findOne({ _id: announcementId, gameId })
    if (!announcement) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })

    await announcement.deleteOne()
    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete announcement error:', error)
    res.status(500).json({ message: '공지 삭제에 실패했습니다' })
  }
}
