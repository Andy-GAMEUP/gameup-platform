import { Response } from 'express'
import { GameMediaModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

const verifyGameOwner = async (gameId: string, userId: string) => {
  const game = await GameModel.findById(gameId)
  if (!game) return null
  if (game.developerId.toString() !== userId) return null
  return game
}

export const getGameMedia = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { type } = req.query

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
    const file = req.file

    if (!type || !['screenshot', 'video'].includes(type)) {
      return res.status(400).json({ message: 'type은 screenshot 또는 video여야 합니다' })
    }
    if (!title?.trim()) return res.status(400).json({ message: '제목을 입력해주세요' })
    if (type === 'video' && !url?.trim()) return res.status(400).json({ message: '동영상 URL을 입력해주세요' })
    if (type === 'screenshot' && !file && !url?.trim()) {
      return res.status(400).json({ message: '스크린샷 이미지를 업로드해주세요' })
    }

    const game = await verifyGameOwner(gameId, req.user.id)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const count = await GameMediaModel.countDocuments({ gameId, type })
    const limit = type === 'screenshot' ? 10 : 5
    if (count >= limit) return res.status(400).json({ message: `${type === 'screenshot' ? '스크린샷' : '동영상'}은 최대 ${limit}개까지 등록할 수 있습니다` })

    const mediaUrl = type === 'screenshot' && file
      ? '/uploads/screenshots/' + file.filename
      : url?.trim() || ''

    const media = await GameMediaModel.create({
      gameId,
      developerId: req.user.id,
      type,
      title: title.trim(),
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

    const game = await verifyGameOwner(gameId, req.user.id)
    if (!game) return res.status(403).json({ message: '권한이 없거나 게임을 찾을 수 없습니다' })

    const media = await GameMediaModel.findOne({ _id: mediaId, gameId })
    if (!media) return res.status(404).json({ message: '미디어를 찾을 수 없습니다' })

    await media.deleteOne()
    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete game media error:', error)
    res.status(500).json({ message: '미디어 삭제에 실패했습니다' })
  }
}
