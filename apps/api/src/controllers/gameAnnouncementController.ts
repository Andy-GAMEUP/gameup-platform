import { Response } from 'express'
import { GameAnnouncementModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

const verifyGameOwner = async (gameId: string, userId: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (game.developerId.toString() !== userId) return null
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
    const { title, content, type, priority, sendPush } = req.body

    if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요' })
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id)
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

    const game = await verifyGameOwner(gameId, req.user.id)
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
