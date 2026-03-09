import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SolutionModel, SolutionSubscriptionModel } from '@gameup/db'

export const getSolutions = async (req: AuthRequest, res: Response) => {
  try {
    const solutions = await SolutionModel.find({ isActive: true }).sort({ sortOrder: 1 })
    res.json({ solutions })
  } catch {
    res.status(500).json({ message: '솔루션 목록 조회 실패' })
  }
}

export const getSolutionDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const solution = await SolutionModel.findById(id)
    if (!solution) return res.status(404).json({ message: '솔루션을 찾을 수 없습니다' })
    res.json({ solution })
  } catch {
    res.status(500).json({ message: '솔루션 상세 조회 실패' })
  }
}

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { solutionId, companyName, managerName, phone, email, message } = req.body
    if (!solutionId || !companyName || !managerName || !phone || !email) {
      return res.status(400).json({ message: '필수 항목을 입력해주세요' })
    }
    const existing = await SolutionSubscriptionModel.findOne({
      solutionId,
      userId: req.user.id,
      status: { $in: ['pending', 'reviewing'] },
    })
    if (existing) return res.status(400).json({ message: '이미 신청 중인 솔루션입니다' })
    const subscription = new SolutionSubscriptionModel({
      solutionId,
      userId: req.user.id,
      companyName,
      managerName,
      phone,
      email,
      message: message || '',
    })
    await subscription.save()
    res.status(201).json({ message: '구독 신청이 완료되었습니다', subscription })
  } catch {
    res.status(500).json({ message: '구독 신청 실패' })
  }
}

export const getMySubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { page = 1, limit = 20 } = req.query
    const filter = { userId: req.user.id }
    const total = await SolutionSubscriptionModel.countDocuments(filter)
    const subscriptions = await SolutionSubscriptionModel.find(filter)
      .populate('solutionId', 'name category imageUrl')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ subscriptions, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '내 구독 목록 조회 실패' })
  }
}
