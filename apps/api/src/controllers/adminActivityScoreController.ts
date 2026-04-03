import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { ActivityScoreModel, UserModel, PointPolicyModel } from '@gameup/db'
import { invalidatePolicyCache } from '../services/pointService'

export const getActivityScoreHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, startDate, endDate, sort = 'createdAt', order = 'desc' } = req.query

    const filter: Record<string, unknown> = {}

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.$gte = new Date(String(startDate))
      if (endDate) {
        const end = new Date(String(endDate))
        end.setHours(23, 59, 59, 999)
        dateFilter.$lte = end
      }
      filter.createdAt = dateFilter
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      const matchedUsers = await UserModel.find({
        $or: [{ username: searchRegex }, { email: searchRegex }],
      }).select('_id')
      filter.userId = { $in: matchedUsers.map((u) => u._id) }
    }

    const sortOrder = order === 'asc' ? 1 : -1
    const sortKey = String(sort)

    const total = await ActivityScoreModel.countDocuments(filter)
    const history = await ActivityScoreModel.find(filter)
      .populate('userId', 'username email')
      .sort({ [sortKey]: sortOrder })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    res.json({ history, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '활동점수 내역 조회 실패' })
  }
}

// 포인트 정책 목록 조회
export const getPointPolicies = async (req: AuthRequest, res: Response) => {
  try {
    const policies = await PointPolicyModel.find().sort({ type: 1 })
    res.json({ policies })
  } catch {
    res.status(500).json({ message: '포인트 정책 조회 실패' })
  }
}

// 포인트 정책 수정
export const updatePointPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { label, description, amount, multiplier, dailyLimit, isActive } = req.body

    const policy = await PointPolicyModel.findByIdAndUpdate(
      id,
      {
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
        ...(multiplier !== undefined && { multiplier }),
        ...(dailyLimit !== undefined && { dailyLimit }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    )

    if (!policy) return res.status(404).json({ message: '정책을 찾을 수 없습니다' })

    invalidatePolicyCache()
    res.json({ success: true, policy })
  } catch {
    res.status(500).json({ message: '포인트 정책 수정 실패' })
  }
}

// 포인트 정책 일괄 초기화 (시드)
export const seedPointPolicies = async (req: AuthRequest, res: Response) => {
  try {
    const defaultPolicies = [
      { type: 'login', label: '일일 접속', description: '플랫폼 접속 시 1일 1회', amount: 1, dailyLimit: 1, isActive: true },
      { type: 'stay_time', label: '체류시간', description: '플랫폼 체류 시간 × 0.1', amount: 1, multiplier: 0.1, isActive: true },
      { type: 'post_write', label: '게시물 작성', description: '게시물 작성 시', amount: 1, isActive: true },
      { type: 'post_delete', label: '게시물 삭제', description: '게시물 삭제 시 차감', amount: 1, isActive: true },
      { type: 'comment_write', label: '댓글 작성', description: '댓글 작성 시', amount: 1, isActive: true },
      { type: 'comment_delete', label: '댓글 삭제', description: '댓글 삭제 시 차감', amount: 1, isActive: true },
      { type: 'recommend_received', label: '좋아요 수신', description: '게시물/댓글 좋아요 수신', amount: 1, isActive: true },
      { type: 'recommend_cancelled', label: '좋아요 취소', description: '좋아요 취소 시 차감', amount: 1, isActive: true },
      { type: 'game_access', label: '게임 접속', description: '게임 접속 시 게임별 1일 1회', amount: 1, dailyLimit: 10, isActive: true },
      { type: 'game_stay_time', label: '게임 체류시간', description: '게임 체류 시간 × 0.1', amount: 1, multiplier: 0.1, isActive: true },
      { type: 'game_event_reward', label: '게임 이벤트', description: '개발사 이벤트 보상', amount: 0, isActive: true },
      { type: 'game_payment_reward', label: '게임 결제 보상', description: '게임 최초 결제액 × 1/10', amount: 0, multiplier: 0.1, isActive: true },
    ]

    for (const p of defaultPolicies) {
      await PointPolicyModel.findOneAndUpdate(
        { type: p.type },
        { $setOnInsert: p },
        { upsert: true }
      )
    }

    invalidatePolicyCache()
    const policies = await PointPolicyModel.find().sort({ type: 1 })
    res.json({ success: true, policies })
  } catch {
    res.status(500).json({ message: '포인트 정책 초기화 실패' })
  }
}
