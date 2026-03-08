import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  MiniHomeModel as MiniHome,
  MiniHomeGameModel as MiniHomeGame,
  MiniHomeKeywordGroupModel as MiniHomeKeywordGroup,
  UserModel as User,
} from '@gameup/db'

export const getAdminMiniHomes = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, from, to } = req.query
    const filter: Record<string, unknown> = {}
    if (from || to) {
      filter.createdAt = {}
      if (from) (filter.createdAt as Record<string, unknown>).$gte = new Date(from as string)
      if (to) (filter.createdAt as Record<string, unknown>).$lte = new Date(to as string)
    }
    if (search) {
      const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id')
      const userIds = users.map((u) => u._id)
      const games = await MiniHomeGame.find({ title: { $regex: search, $options: 'i' } }).select('minihomeId')
      const minihomeIdsFromGames = games.map((g) => g.minihomeId)
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } },
        { _id: { $in: minihomeIdsFromGames } },
      ]
    }
    const total = await MiniHome.countDocuments(filter)
    const minihomes = await MiniHome.find(filter)
      .populate('userId', 'username email profileImage')
      .populate('representativeGameId', 'title iconUrl')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ minihomes, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '미니홈 목록 조회 실패' })
  }
}

export const updateMiniHomeVisibility = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isPublic } = req.body
    const minihome = await MiniHome.findByIdAndUpdate(id, { isPublic }, { new: true })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    res.json({ message: '공개 상태가 변경되었습니다', minihome })
  } catch {
    res.status(500).json({ message: '공개 상태 변경 실패' })
  }
}

export const updateMiniHomeRecommended = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isRecommended } = req.body
    const minihome = await MiniHome.findByIdAndUpdate(id, { isRecommended }, { new: true })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    res.json({ message: '추천 상태가 변경되었습니다', minihome })
  } catch {
    res.status(500).json({ message: '추천 상태 변경 실패' })
  }
}

export const deleteMiniHome = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const minihome = await MiniHome.findByIdAndDelete(id)
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    res.json({ message: '미니홈이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '미니홈 삭제 실패' })
  }
}

export const getKeywordGroups = async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await MiniHomeKeywordGroup.find().sort({ sortOrder: 1 })
    res.json({ groups })
  } catch {
    res.status(500).json({ message: '키워드 그룹 조회 실패' })
  }
}

export const createKeywordGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, keywords, sortOrder } = req.body
    if (!name) return res.status(400).json({ message: '그룹 이름은 필수입니다' })
    const maxOrder = await MiniHomeKeywordGroup.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const group = new MiniHomeKeywordGroup({
      name,
      keywords: keywords || [],
      sortOrder: sortOrder ?? ((maxOrder?.sortOrder ?? -1) + 1),
    })
    await group.save()
    res.status(201).json({ message: '키워드 그룹이 생성되었습니다', group })
  } catch {
    res.status(500).json({ message: '키워드 그룹 생성 실패' })
  }
}

export const updateKeywordGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, keywords, sortOrder } = req.body
    const group = await MiniHomeKeywordGroup.findByIdAndUpdate(id, { name, keywords, sortOrder }, { new: true })
    if (!group) return res.status(404).json({ message: '키워드 그룹을 찾을 수 없습니다' })
    res.json({ message: '키워드 그룹이 업데이트되었습니다', group })
  } catch {
    res.status(500).json({ message: '키워드 그룹 업데이트 실패' })
  }
}

export const deleteKeywordGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const group = await MiniHomeKeywordGroup.findByIdAndDelete(id)
    if (!group) return res.status(404).json({ message: '키워드 그룹을 찾을 수 없습니다' })
    res.json({ message: '키워드 그룹이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '키워드 그룹 삭제 실패' })
  }
}

export const reorderKeywordGroups = async (req: AuthRequest, res: Response) => {
  try {
    const { groups } = req.body
    if (!Array.isArray(groups)) return res.status(400).json({ message: 'groups 배열이 필요합니다' })
    await Promise.all(
      groups.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        MiniHomeKeywordGroup.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '순서 업데이트 실패' })
  }
}
