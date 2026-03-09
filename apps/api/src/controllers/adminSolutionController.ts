import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { SolutionModel, SolutionSubscriptionModel } from '@gameup/db'

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, solutionId, page = 1, limit = 20 } = req.query
    const filter: Record<string, unknown> = {}
    if (status && status !== 'all') filter.status = status
    if (solutionId) filter.solutionId = solutionId
    const total = await SolutionSubscriptionModel.countDocuments(filter)
    const subscriptions = await SolutionSubscriptionModel.find(filter)
      .populate('userId', 'username email')
      .populate('solutionId', 'name category')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ subscriptions, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '구독 목록 조회 실패' })
  }
}

export const getSubscriptionDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const subscription = await SolutionSubscriptionModel.findById(id)
      .populate('userId', 'username email')
      .populate('solutionId', 'name category')
    if (!subscription) return res.status(404).json({ message: '구독 신청을 찾을 수 없습니다' })
    res.json({ subscription })
  } catch {
    res.status(500).json({ message: '구독 신청 상세 조회 실패' })
  }
}

export const updateSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, adminNote } = req.body
    const subscription = await SolutionSubscriptionModel.findByIdAndUpdate(
      id,
      { status, adminNote },
      { new: true }
    ).populate('userId', 'username email')
    if (!subscription) return res.status(404).json({ message: '구독 신청을 찾을 수 없습니다' })
    res.json({ message: '상태가 업데이트되었습니다', subscription })
  } catch {
    res.status(500).json({ message: '구독 상태 업데이트 실패' })
  }
}

export const confirmSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const subscription = await SolutionSubscriptionModel.findByIdAndUpdate(
      id,
      { isConfirmed: true },
      { new: true }
    )
    if (!subscription) return res.status(404).json({ message: '구독 신청을 찾을 수 없습니다' })
    res.json({ message: '구독 신청이 확정되었습니다', subscription })
  } catch {
    res.status(500).json({ message: '구독 확정 실패' })
  }
}

export const deleteSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const subscription = await SolutionSubscriptionModel.findByIdAndDelete(id)
    if (!subscription) return res.status(404).json({ message: '구독 신청을 찾을 수 없습니다' })
    res.json({ message: '구독 신청이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '구독 신청 삭제 실패' })
  }
}

export const getSolutions = async (req: AuthRequest, res: Response) => {
  try {
    const solutions = await SolutionModel.find().sort({ sortOrder: 1 })
    res.json({ solutions })
  } catch {
    res.status(500).json({ message: '솔루션 목록 조회 실패' })
  }
}

export const createSolution = async (req: AuthRequest, res: Response) => {
  try {
    const maxOrder = await SolutionModel.findOne().sort({ sortOrder: -1 }).select('sortOrder')
    const solution = new SolutionModel({
      ...req.body,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    })
    await solution.save()
    res.status(201).json({ message: '솔루션이 생성되었습니다', solution })
  } catch {
    res.status(500).json({ message: '솔루션 생성 실패' })
  }
}

export const updateSolution = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const solution = await SolutionModel.findByIdAndUpdate(id, req.body, { new: true })
    if (!solution) return res.status(404).json({ message: '솔루션을 찾을 수 없습니다' })
    res.json({ message: '솔루션이 업데이트되었습니다', solution })
  } catch {
    res.status(500).json({ message: '솔루션 업데이트 실패' })
  }
}

export const deleteSolution = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const solution = await SolutionModel.findByIdAndDelete(id)
    if (!solution) return res.status(404).json({ message: '솔루션을 찾을 수 없습니다' })
    res.json({ message: '솔루션이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '솔루션 삭제 실패' })
  }
}

export const reorderSolutions = async (req: AuthRequest, res: Response) => {
  try {
    const { solutions } = req.body
    if (!Array.isArray(solutions)) return res.status(400).json({ message: 'solutions 배열이 필요합니다' })
    await Promise.all(
      solutions.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        SolutionModel.findByIdAndUpdate(id, { sortOrder })
      )
    )
    res.json({ message: '순서가 업데이트되었습니다' })
  } catch {
    res.status(500).json({ message: '솔루션 순서 업데이트 실패' })
  }
}
