import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  MiniHomeModel as MiniHome,
  MiniHomeGameModel as MiniHomeGame,
  MiniHomeNewsModel as MiniHomeNews,
  MiniHomeKeywordGroupModel as MiniHomeKeywordGroup,
  ProposalModel as Proposal,
} from '@gameup/db'

export const getMiniHomes = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, keyword, sort = 'createdAt' } = req.query
    const filter: Record<string, unknown> = { isPublic: true }
    if (keyword) {
      filter.$or = [
        { companyName: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [keyword] } },
        { keywords: { $in: [keyword] } },
      ]
    }
    const sortField = sort === 'updatedAt' ? 'updatedAt' : 'createdAt'
    const total = await MiniHome.countDocuments(filter)
    const minihomes = await MiniHome.find(filter)
      .populate('userId', 'username profileImage')
      .populate('representativeGameId')
      .sort({ isRecommended: -1, [sortField]: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ minihomes, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '미니홈 목록 조회 실패' })
  }
}

export const getMiniHomeDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const minihome = await MiniHome.findById(id)
      .populate('userId', 'username profileImage')
      .populate('representativeGameId')
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const games = await MiniHomeGame.find({ minihomeId: id, status: 'active' }).sort({ sortOrder: 1 })
    res.json({ minihome, games })
  } catch {
    res.status(500).json({ message: '미니홈 상세 조회 실패' })
  }
}

export const getMiniHomeNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 20, type } = req.query
    const filter: Record<string, unknown> = { minihomeId: id }
    if (type && (type === 'game' || type === 'company')) filter.type = type
    const total = await MiniHomeNews.countDocuments(filter)
    const news = await MiniHomeNews.find(filter)
      .populate('authorId', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ news, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '뉴스 목록 조회 실패' })
  }
}

export const getKeywordGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await MiniHomeKeywordGroup.find().sort({ sortOrder: 1 })
    const activeGroups = groups.map((g) => ({
      ...g.toObject(),
      keywords: g.keywords.filter((k) => k.isActive),
    }))
    res.json({ groups: activeGroups })
  } catch {
    res.status(500).json({ message: '키워드 그룹 조회 실패' })
  }
}

export const createMiniHome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const existing = await MiniHome.findOne({ userId })
    if (existing) return res.status(400).json({ message: '이미 미니홈이 존재합니다' })
    const { companyName, introduction, profileImage, coverImage, website, tags, keywords } = req.body
    if (!companyName) return res.status(400).json({ message: '회사명은 필수입니다' })
    const minihome = new MiniHome({
      userId,
      companyName,
      introduction: introduction || '',
      profileImage: profileImage || '',
      coverImage: coverImage || '',
      website: website || '',
      tags: tags || [],
      keywords: keywords || [],
    })
    await minihome.save()
    res.status(201).json({ message: '미니홈이 생성되었습니다', minihome })
  } catch {
    res.status(500).json({ message: '미니홈 생성 실패' })
  }
}

export const updateMiniHome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { companyName, introduction, profileImage, coverImage, website, tags, keywords, isPublic } = req.body
    const minihome = await MiniHome.findOneAndUpdate(
      { userId },
      { companyName, introduction, profileImage, coverImage, website, tags, keywords, isPublic },
      { new: true }
    )
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    res.json({ message: '미니홈이 업데이트되었습니다', minihome })
  } catch {
    res.status(500).json({ message: '미니홈 업데이트 실패' })
  }
}

export const addGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const minihome = await MiniHome.findOne({ userId })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const { title, genre, description, iconUrl, coverUrl, screenshots, platforms } = req.body
    if (!title) return res.status(400).json({ message: '게임명은 필수입니다' })
    const lastGame = await MiniHomeGame.findOne({ minihomeId: minihome._id }).sort({ sortOrder: -1 }).select('sortOrder')
    const game = new MiniHomeGame({
      minihomeId: minihome._id,
      title,
      genre: genre || '',
      description: description || '',
      iconUrl: iconUrl || '',
      coverUrl: coverUrl || '',
      screenshots: screenshots || [],
      platforms: platforms || [],
      sortOrder: (lastGame?.sortOrder ?? -1) + 1,
    })
    await game.save()
    res.status(201).json({ message: '게임이 등록되었습니다', game })
  } catch {
    res.status(500).json({ message: '게임 등록 실패' })
  }
}

export const updateGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const minihome = await MiniHome.findOne({ userId })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const { title, genre, description, iconUrl, coverUrl, screenshots, platforms } = req.body
    const game = await MiniHomeGame.findOneAndUpdate(
      { _id: gameId, minihomeId: minihome._id },
      { title, genre, description, iconUrl, coverUrl, screenshots, platforms },
      { new: true }
    )
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    res.json({ message: '게임이 업데이트되었습니다', game })
  } catch {
    res.status(500).json({ message: '게임 업데이트 실패' })
  }
}

export const removeGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const minihome = await MiniHome.findOne({ userId })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const game = await MiniHomeGame.findOneAndUpdate(
      { _id: gameId, minihomeId: minihome._id },
      { status: 'inactive' },
      { new: true }
    )
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (minihome.representativeGameId?.toString() === gameId) {
      await MiniHome.findByIdAndUpdate(minihome._id, { representativeGameId: null })
    }
    res.json({ message: '게임이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '게임 삭제 실패' })
  }
}

export const setRepresentativeGame = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { gameId } = req.params
    const minihome = await MiniHome.findOne({ userId })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const game = await MiniHomeGame.findOne({ _id: gameId, minihomeId: minihome._id, status: 'active' })
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    const updated = await MiniHome.findByIdAndUpdate(
      minihome._id,
      { representativeGameId: gameId },
      { new: true }
    )
    res.json({ message: '대표 게임이 설정되었습니다', minihome: updated })
  } catch {
    res.status(500).json({ message: '대표 게임 설정 실패' })
  }
}

export const createNews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const minihome = await MiniHome.findOne({ userId })
    if (!minihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const { type, title, content } = req.body
    if (!type || !title || !content) return res.status(400).json({ message: '필수 항목이 누락되었습니다' })
    if (!['game', 'company'].includes(type)) return res.status(400).json({ message: '유효하지 않은 뉴스 타입입니다' })
    const news = new MiniHomeNews({
      minihomeId: minihome._id,
      authorId: userId,
      type,
      title,
      content,
    })
    await news.save()
    res.status(201).json({ message: '뉴스가 등록되었습니다', news })
  } catch {
    res.status(500).json({ message: '뉴스 등록 실패' })
  }
}

export const sendProposal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { type, toMinihomeId, gameId, title, content } = req.body
    if (!type || !toMinihomeId || !title || !content) {
      return res.status(400).json({ message: '필수 항목이 누락되었습니다' })
    }
    if (!['investment', 'publishing'].includes(type)) {
      return res.status(400).json({ message: '유효하지 않은 제안 타입입니다' })
    }
    const target = await MiniHome.findById(toMinihomeId)
    if (!target) return res.status(404).json({ message: '대상 미니홈을 찾을 수 없습니다' })
    const proposal = new Proposal({
      type,
      fromUserId: userId,
      toMinihomeId,
      gameId: gameId || null,
      title,
      content,
    })
    await proposal.save()
    res.status(201).json({ message: '제안이 전송되었습니다', proposal })
  } catch {
    res.status(500).json({ message: '제안 전송 실패' })
  }
}

export const getMyProposals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { direction = 'sent', type, page = 1, limit = 20 } = req.query
    let filter: Record<string, unknown> = {}
    if (direction === 'sent') {
      filter.fromUserId = userId
    } else {
      const myMinihome = await MiniHome.findOne({ userId })
      if (!myMinihome) return res.json({ proposals: [], total: 0, page: 1, totalPages: 0 })
      filter.toMinihomeId = myMinihome._id
    }
    if (type && (type === 'investment' || type === 'publishing')) filter.type = type
    const total = await Proposal.countDocuments(filter)
    const proposals = await Proposal.find(filter)
      .populate('fromUserId', 'username profileImage')
      .populate('toMinihomeId', 'companyName profileImage')
      .populate('gameId', 'title iconUrl')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ proposals, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '제안 목록 조회 실패' })
  }
}

export const updateProposalStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const { status } = req.body
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다' })
    }
    const myMinihome = await MiniHome.findOne({ userId })
    if (!myMinihome) return res.status(404).json({ message: '미니홈을 찾을 수 없습니다' })
    const proposal = await Proposal.findOneAndUpdate(
      { _id: id, toMinihomeId: myMinihome._id, status: 'pending' },
      { status },
      { new: true }
    )
    if (!proposal) return res.status(404).json({ message: '제안을 찾을 수 없습니다' })
    res.json({ message: '제안 상태가 업데이트되었습니다', proposal })
  } catch {
    res.status(500).json({ message: '제안 상태 업데이트 실패' })
  }
}
