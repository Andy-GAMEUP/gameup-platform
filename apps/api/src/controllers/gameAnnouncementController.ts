import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { GameAnnouncementModel, GameModel, UserModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

export const getPublicGameAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const page = Math.max(1, Number(req.query.page) || 1)

    const game = await GameModel.findById(gameId).select('_id title thumbnail serviceType developerId').lean()
    const isOwner = !!req.user && (req.user.role === 'admin' || game?.developerId?.toString() === req.user.id)
    const filter: Record<string, unknown> = { gameId, deletedAt: null }
    if (!isOwner) filter.isPublished = { $ne: false }

    const total = await GameAnnouncementModel.countDocuments(filter)
    const announcements = await GameAnnouncementModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const developerIds = [...new Set(announcements.map(a => a.developerId.toString()))]
    const developers = await UserModel.find({ _id: { $in: developerIds } }).select('_id username profileImage').lean()
    const developerMap = Object.fromEntries(developers.map(d => [d._id.toString(), d]))
    const result = announcements.map(a => ({ ...a, game: game || null, developer: developerMap[a.developerId.toString()] || null }))

    res.json({ announcements: result, total })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

export const getGameAnnouncementById = async (req: AuthRequest, res: Response) => {
  try {
    const { announcementId } = req.params
    const existing = await GameAnnouncementModel.findOne({ _id: announcementId, deletedAt: null }).select('developerId isPublished')
    if (!existing) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })

    const isOwner = !!req.user && (req.user.role === 'admin' || existing.developerId.toString() === req.user.id)
    if (existing.isPublished === false && !isOwner) {
      return res.status(404).json({ message: '공지를 찾을 수 없습니다' })
    }

    const announcement = await GameAnnouncementModel.findOneAndUpdate(
      { _id: announcementId, deletedAt: null },
      { $inc: { views: 1 } },
      { new: true }
    ).lean()
    if (!announcement) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })

    const game = await GameModel.findById(announcement.gameId)
      .select('_id title thumbnail serviceType')
      .lean()
    const developer = await UserModel.findById(announcement.developerId).select('_id username profileImage').lean()

    res.json({ announcement: { ...announcement, game, developer } })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

export const getRecentGameAnnouncements = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15))
    const page = Math.max(1, Number(req.query.page) || 1)
    const search = String(req.query.search || '').trim()
    const sort = String(req.query.sort || 'latest')

    const filter: Record<string, unknown> = { deletedAt: null, isPublished: { $ne: false } }
    if (search) filter.title = { $regex: search, $options: 'i' }
    const sortObj: Record<string, 1 | -1> = sort === 'latest' ? { createdAt: -1 } : { views: -1 }

    const total = await GameAnnouncementModel.countDocuments(filter)
    const announcements = await GameAnnouncementModel.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const gameIds = [...new Set(announcements.map(a => a.gameId.toString()))]
    const games = await GameModel.find({ _id: { $in: gameIds } })
      .select('_id title thumbnail serviceType')
      .lean()
    const gameMap = Object.fromEntries(games.map(g => [g._id.toString(), g]))

    const developerIds = [...new Set(announcements.map(a => a.developerId.toString()))]
    const developers = await UserModel.find({ _id: { $in: developerIds } }).select('_id username profileImage').lean()
    const developerMap = Object.fromEntries(developers.map(d => [d._id.toString(), d]))

    const result = announcements.map(a => ({
      ...a,
      game: gameMap[a.gameId.toString()] || null,
      developer: developerMap[a.developerId.toString()] || null,
    }))

    res.json({ announcements: result, total, page, totalPages: Math.ceil(total / limit) })
  } catch {
    res.status(500).json({ message: '공지 조회 실패' })
  }
}

export const toggleGameAnnouncementLike = async (req: AuthRequest, res: Response) => {
  try {
    const { announcementId } = req.params
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const existing = await GameAnnouncementModel.findOne({ _id: announcementId, likes: userId })
    const isLiked = !!existing
    const updated = await GameAnnouncementModel.findByIdAndUpdate(
      announcementId,
      isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true }
    )
    if (!updated) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })
    res.json({ liked: !isLiked, likeCount: updated.likes.length })
  } catch {
    res.status(500).json({ message: '좋아요 처리 실패' })
  }
}

export const reportGameAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { announcementId } = req.params
    const { reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ message: '신고 사유를 입력해주세요' })
    const userId = new mongoose.Types.ObjectId(req.user!.id)
    const announcement = await GameAnnouncementModel.findById(announcementId)
    if (!announcement) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })
    const alreadyReported = announcement.reports.some((r) => r.userId.equals(userId))
    if (alreadyReported) return res.status(400).json({ message: '이미 신고한 공지입니다' })
    announcement.reports.push({ userId, reason: reason.trim(), createdAt: new Date() })
    announcement.reportCount = announcement.reports.length
    await announcement.save()
    res.json({ success: true, message: '신고가 접수되었습니다' })
  } catch {
    res.status(500).json({ message: '신고 처리 실패' })
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

    const total = await GameAnnouncementModel.countDocuments({ gameId, deletedAt: null })
    const announcements = await GameAnnouncementModel.find({ gameId, deletedAt: null })
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
    const { title, content, type, priority, startDate, endDate, images, thumbnailIndex, isPublished } = req.body

    if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요' })
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const announcement = await GameAnnouncementModel.create({
      gameId,
      developerId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      type: type || 'notice',
      priority: priority || 'normal',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      images: images || [],
      thumbnailIndex: thumbnailIndex || 0,
      isPublished: isPublished === false ? false : true,
    })

    res.status(201).json({ success: true, announcement })
  } catch (error) {
    console.error('Create announcement error:', error)
    res.status(500).json({ message: '공지 등록에 실패했습니다' })
  }
}

export const updateGameAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, announcementId } = req.params
    const { title, content, type, priority, images, thumbnailIndex, isPublished } = req.body

    if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요' })
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요' })

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const announcement = await GameAnnouncementModel.findOneAndUpdate(
      { _id: announcementId, gameId },
      {
        title: title.trim(),
        content: content.trim(),
        type: type || 'notice',
        priority: priority || 'normal',
        images: images || [],
        thumbnailIndex: thumbnailIndex || 0,
        isPublished: isPublished === false ? false : true,
      },
      { new: true }
    )
    if (!announcement) return res.status(404).json({ message: '공지를 찾을 수 없습니다' })

    res.json({ success: true, announcement })
  } catch (error) {
    console.error('Update announcement error:', error)
    res.status(500).json({ message: '공지 수정에 실패했습니다' })
  }
}

export const uploadGameAnnouncementImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지를 선택해주세요' })
    }
    const imageUrls = files.map(f => `/uploads/game-announcements/${f.filename}`)
    res.json({ success: true, images: imageUrls })
  } catch {
    res.status(500).json({ message: '이미지 업로드 실패' })
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

    announcement.deletedAt = new Date()
    await announcement.save()
    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete announcement error:', error)
    res.status(500).json({ message: '공지 삭제에 실패했습니다' })
  }
}
