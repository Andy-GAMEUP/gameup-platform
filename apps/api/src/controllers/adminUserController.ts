import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { UserModel, ActivityScoreModel, PointHistoryModel, LevelModel, NotificationModel } from '@gameup/db'
import { emitToUser } from '../socket'

export const getIndividualMembers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      minLevel,
      maxLevel,
      startDate,
      endDate,
      sort = 'createdAt',
      order = 'desc',
    } = req.query

    const filter: Record<string, unknown> = { memberType: 'individual' }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }
    if (status === 'active') filter.isActive = true
    if (status === 'inactive') filter.isActive = false
    if (minLevel || maxLevel) {
      const levelFilter: Record<string, number> = {}
      if (minLevel) levelFilter.$gte = Number(minLevel)
      if (maxLevel) levelFilter.$lte = Number(maxLevel)
      filter.level = levelFilter
    }
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

    const sortOrder = order === 'asc' ? 1 : -1
    const sortKey = String(sort)

    const total = await UserModel.countDocuments(filter)
    const users = await UserModel.find(filter)
      .select('-password')
      .sort({ [sortKey]: sortOrder })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '개인 회원 목록 조회 실패' })
  }
}

export const getCorporateMembers = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      startDate,
      endDate,
      sort = 'createdAt',
      order = 'desc',
    } = req.query

    const filter: Record<string, unknown> = { memberType: 'corporate' }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'companyInfo.companyName': { $regex: search, $options: 'i' } },
      ]
    }
    if (status === 'active') filter.isActive = true
    if (status === 'inactive') filter.isActive = false

    const { approvalStatus } = req.query
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(String(approvalStatus))) {
      filter['companyInfo.approvalStatus'] = String(approvalStatus)
    }
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

    const sortOrder = order === 'asc' ? 1 : -1
    const sortKey = String(sort)

    const total = await UserModel.countDocuments(filter)
    const users = await UserModel.find(filter)
      .select('-password')
      .sort({ [sortKey]: sortOrder })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))

    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '기업 회원 목록 조회 실패' })
  }
}

export const getUserDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const user = await UserModel.findById(id).select('-password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    res.json({ user })
  } catch {
    res.status(500).json({ message: '사용자 상세 조회 실패' })
  }
}

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const {
      username,
      email,
      role,
      isActive,
      bannedUntil,
      banReason,
      adminMemo,
      memberType,
      companyInfo,
      contactPerson,
    } = req.body

    const update: Record<string, unknown> = {}
    if (username !== undefined) update.username = username
    if (email !== undefined) update.email = email
    if (role !== undefined) update.role = role
    if (isActive !== undefined) update.isActive = isActive
    if (bannedUntil !== undefined) update.bannedUntil = bannedUntil
    if (banReason !== undefined) update.banReason = banReason
    if (adminMemo !== undefined) update.adminMemo = adminMemo
    if (memberType !== undefined) update.memberType = memberType
    if (companyInfo !== undefined) update.companyInfo = companyInfo
    if (contactPerson !== undefined) update.contactPerson = contactPerson

    const user = await UserModel.findByIdAndUpdate(id, update, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    res.json({ message: '사용자 정보가 업데이트되었습니다', user })
  } catch {
    res.status(500).json({ message: '사용자 업데이트 실패' })
  }
}

export const updateCorporateApproval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { approvalStatus, rejectedReason } = req.body

    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'approvalStatus는 approved 또는 rejected여야 합니다' })
    }

    const user = await UserModel.findById(id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.memberType !== 'corporate') {
      return res.status(400).json({ message: '기업회원만 승인/거절 처리가 가능합니다' })
    }

    const update: Record<string, unknown> = {
      'companyInfo.approvalStatus': approvalStatus,
      'companyInfo.isApproved': approvalStatus === 'approved',
    }
    if (approvalStatus === 'rejected' && rejectedReason) {
      update['companyInfo.rejectedReason'] = rejectedReason
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, update, { new: true }).select('-password')
    res.json({ message: approvalStatus === 'approved' ? '기업회원이 승인되었습니다' : '기업회원이 거절되었습니다', user: updatedUser })
  } catch {
    res.status(500).json({ message: '기업회원 승인 처리 실패' })
  }
}

export const grantActivityScore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { amount, reason } = req.body

    if (amount === undefined || !reason) {
      return res.status(400).json({ message: 'amount와 reason은 필수입니다' })
    }

    const user = await UserModel.findById(id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const type = Number(amount) >= 0 ? 'admin_grant' : 'admin_deduct'

    await ActivityScoreModel.create({
      userId: user._id,
      amount: Number(amount),
      reason,
      type,
    })

    const newScore = (user.activityScore ?? 0) + Number(amount)
    user.activityScore = Math.max(0, newScore)

    const levels = await LevelModel.find().sort({ requiredScore: -1 })
    const newLevel = levels.find((l) => l.requiredScore <= user.activityScore!)
    if (newLevel && newLevel.level !== user.level) {
      user.level = newLevel.level
    }

    await user.save()

    res.json({ message: '활동점수가 업데이트되었습니다', activityScore: user.activityScore, level: user.level })
  } catch {
    res.status(500).json({ message: '활동점수 업데이트 실패' })
  }
}

export const grantPoints = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { amount, reason } = req.body

    if (amount === undefined || !reason) {
      return res.status(400).json({ message: 'amount와 reason은 필수입니다' })
    }

    const user = await UserModel.findById(id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const adminId = req.user?.id
    const type = Number(amount) >= 0 ? 'admin_grant' : 'admin_deduct'
    const newBalance = (user.points ?? 0) + Number(amount)

    await PointHistoryModel.create({
      userId: user._id,
      amount: Number(amount),
      balance: Math.max(0, newBalance),
      reason,
      type,
      adminId,
    })

    user.points = Math.max(0, newBalance)
    await user.save()

    res.json({ message: '포인트가 업데이트되었습니다', points: user.points })
  } catch {
    res.status(500).json({ message: '포인트 업데이트 실패' })
  }
}

export const bulkNotify = async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, type, title, content, linkUrl } = req.body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds 배열이 필요합니다' })
    }
    if (!type || !title) {
      return res.status(400).json({ message: 'type과 title은 필수입니다' })
    }

    const notifications = userIds.map((userId: string) => ({
      userId,
      type,
      title,
      content: content || '',
      linkUrl: linkUrl || '',
    }))

    const created = await NotificationModel.insertMany(notifications)
    created.forEach((notification) => {
      emitToUser(notification.userId.toString(), 'new-notification', notification)
    })

    res.status(201).json({ message: '알림 전송 완료', count: created.length })
  } catch {
    res.status(500).json({ message: '알림 전송 실패' })
  }
}
