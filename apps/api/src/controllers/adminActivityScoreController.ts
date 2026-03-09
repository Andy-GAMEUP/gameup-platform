import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { ActivityScoreModel, UserModel } from '@gameup/db'

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
