import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SupportBannerModel, SupportTabModel, SeasonModel, GameApplicationModel } from '@gameup/db'

export const getSupportIntro = async (req: Request, res: Response) => {
  try {
    const [banners, tabs] = await Promise.all([
      SupportBannerModel.find({ isActive: true }).sort({ sortOrder: 1 }),
      SupportTabModel.find({ isActive: true }).sort({ sortOrder: 1 }),
    ])
    res.json({ banners, tabs })
  } catch {
    res.status(500).json({ message: '서포트 소개 조회 실패' })
  }
}

export const getCurrentSeason = async (req: Request, res: Response) => {
  try {
    const season = await SeasonModel.findOne({ status: { $ne: 'draft' }, isVisible: true }).sort({
      createdAt: -1,
    })
    res.json({ season })
  } catch {
    res.status(500).json({ message: '현재 시즌 조회 실패' })
  }
}

export const getSeasonDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const season = await SeasonModel.findById(id)
    if (!season) return res.status(404).json({ message: '시즌을 찾을 수 없습니다' })
    res.json({ season })
  } catch {
    res.status(500).json({ message: '시즌 상세 조회 실패' })
  }
}

export const getSelectedGames = async (req: Request, res: Response) => {
  try {
    const { seasonId } = req.params
    const { page = 1, limit = 20 } = req.query
    const filter = { seasonId, status: 'selected' }
    const total = await GameApplicationModel.countDocuments(filter)
    const games = await GameApplicationModel.find(filter)
      .populate('userId', 'username email profileImage')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ games, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '선정 게임 목록 조회 실패' })
  }
}

export const getSelectedGameDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const game = await GameApplicationModel.findById(id)
      .populate('userId', 'username email profileImage')
      .populate('minihomeId')
    if (!game) return res.status(404).json({ message: '게임 신청을 찾을 수 없습니다' })
    res.json({ game })
  } catch {
    res.status(500).json({ message: '게임 상세 조회 실패' })
  }
}

export const applyGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const {
      seasonId,
      gameName,
      genre,
      description,
      iconUrl,
      introVideoUrl,
      introImageUrl,
      buildUrl,
      screenshots,
      platforms,
      developmentSchedule,
    } = req.body
    if (!seasonId || !gameName) return res.status(400).json({ message: '시즌 ID와 게임 이름은 필수입니다' })
    const season = await SeasonModel.findById(seasonId)
    if (!season) return res.status(404).json({ message: '시즌을 찾을 수 없습니다' })
    if (season.status !== 'recruiting') return res.status(400).json({ message: '현재 모집 중인 시즌이 아닙니다' })
    const existing = await GameApplicationModel.findOne({ seasonId, userId: req.user.id })
    if (existing) return res.status(400).json({ message: '이미 해당 시즌에 신청하셨습니다' })
    const application = new GameApplicationModel({
      seasonId,
      userId: req.user.id,
      gameName,
      genre: genre || '',
      description: description || '',
      iconUrl: iconUrl || '',
      introVideoUrl: introVideoUrl || '',
      introImageUrl: introImageUrl || '',
      buildUrl: buildUrl || '',
      screenshots: screenshots || [],
      platforms: platforms || [],
      developmentSchedule: developmentSchedule || '',
    })
    await application.save()
    res.status(201).json({ message: '게임 신청이 완료되었습니다', application })
  } catch {
    res.status(500).json({ message: '게임 신청 실패' })
  }
}

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { page = 1, limit = 20 } = req.query
    const filter = { userId: req.user.id }
    const total = await GameApplicationModel.countDocuments(filter)
    const applications = await GameApplicationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ applications, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '내 신청 목록 조회 실패' })
  }
}

export const uploadIrDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { id } = req.params
    const { irDocumentUrl } = req.body
    const application = await GameApplicationModel.findById(id)
    if (!application) return res.status(404).json({ message: '신청을 찾을 수 없습니다' })
    if (application.userId.toString() !== req.user.id) return res.status(403).json({ message: '권한이 없습니다' })
    application.irDocumentUrl = irDocumentUrl
    await application.save()
    res.json({ message: 'IR 문서가 업로드되었습니다', application })
  } catch {
    res.status(500).json({ message: 'IR 문서 업로드 실패' })
  }
}
