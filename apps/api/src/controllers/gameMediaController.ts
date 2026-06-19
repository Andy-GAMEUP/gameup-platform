import { Response } from 'express'
import { GameMediaModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import fs from 'fs'
import path from 'path'

const verifyGameOwner = async (gameId: string, userId: string, role?: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (role !== 'admin' && game.developerId.toString() !== userId) return null
  return game
}

export const getGameMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { type } = req.query

    const game = await GameModel.findById(gameId).lean()
    if (game) {
      const approvalStatus = (game as any).approvalStatus as string
      const developerId = (game as any).developerId?.toString()
      const isReviewing = req.user?.role === 'admin' && ['pending', 'review'].includes(approvalStatus)
      const isOwner = req.user && (req.user.id === developerId || isReviewing)
      if (!isOwner && ['not_submitted', 'pending', 'review'].includes(approvalStatus)) {
        const snap = (game as any).publishedSnapshot
        if (snap?._mediaItems) {
          let items = snap._mediaItems as any[]
          if (type === 'screenshot' || type === 'video') items = items.filter((m: any) => m.type === type)
          items = items.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          return res.json({ success: true, media: items })
        }
      }
    }

    const filter: Record<string, unknown> = { gameId }
    if (type === 'screenshot' || type === 'video') filter.type = type

    const media = await GameMediaModel.find(filter).sort({ type: 1, order: 1, createdAt: 1 })
    res.json({ success: true, media })
  } catch (error) {
    console.error('Get game media error:', error)
    res.status(500).json({ message: '미디어 조회에 실패했습니다' })
  }
}

export const addGameMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId } = req.params
    const { type, title, url } = req.body
    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const screenshotFile = files?.screenshot?.[0]
    const videoFile = files?.videoFile?.[0]

    if (!type || !['screenshot', 'video'].includes(type)) {
      return res.status(400).json({ message: 'type은 screenshot 또는 video여야 합니다' })
    }
    if (type === 'video' && !videoFile) return res.status(400).json({ message: '동영상 파일을 업로드해주세요' })
    if (type === 'screenshot' && !screenshotFile && !url?.trim()) {
      return res.status(400).json({ message: '스크린샷 이미지를 업로드해주세요' })
    }

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const count = await GameMediaModel.countDocuments({ gameId, type })
    const limit = type === 'screenshot' ? 10 : 3
    if (count >= limit) return res.status(400).json({ message: `${type === 'screenshot' ? '스크린샷' : '동영상'}은 최대 ${limit}개까지 등록할 수 있습니다` })

    const mediaUrl = type === 'video' && videoFile
      ? '/uploads/videos/' + videoFile.filename
      : type === 'screenshot' && screenshotFile
        ? '/uploads/screenshots/' + screenshotFile.filename
        : url?.trim() || ''

    const resolvedTitle = title?.trim() || (videoFile?.originalname ?? screenshotFile?.originalname ?? 'untitled').replace(/\.[^/.]+$/, '')
    const media = await GameMediaModel.create({
      gameId,
      developerId: req.user.id,
      type,
      title: resolvedTitle,
      url: mediaUrl,
      order: count,
    })

    res.status(201).json({ success: true, media })
  } catch (error) {
    console.error('Add game media error:', error)
    res.status(500).json({ message: '미디어 등록에 실패했습니다' })
  }
}

export const deleteGameMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const { gameId, mediaId } = req.params

    const game = await verifyGameOwner(gameId, req.user.id, req.user.role)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const media = await GameMediaModel.findOne({ _id: mediaId, gameId })
    if (!media) return res.status(404).json({ message: '미디어를 찾을 수 없습니다' })

    if (media.url && media.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), media.url.slice(1))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    await media.deleteOne()

    // publishedSnapshot._mediaItems 에서도 제거
    await GameModel.updateOne(
      { _id: gameId },
      { $pull: { 'publishedSnapshot._mediaItems': { _id: media._id } } }
    )

    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete game media error:', error)
    res.status(500).json({ message: '미디어 삭제에 실패했습니다' })
  }
}
