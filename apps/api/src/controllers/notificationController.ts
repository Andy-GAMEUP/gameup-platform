import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { NotificationModel } from '@gameup/db'

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { type, page = 1, limit = 20 } = req.query
    const filter: Record<string, unknown> = { userId }
    if (type) filter.type = type
    const total = await NotificationModel.countDocuments(filter)
    const notifications = await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ notifications, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '알림 목록 조회 실패' })
  }
}

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const count = await NotificationModel.countDocuments({ userId, isRead: false })
    res.json({ count })
  } catch {
    res.status(500).json({ message: '읽지 않은 알림 수 조회 실패' })
  }
}

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    )
    if (!notification) return res.status(404).json({ message: '알림을 찾을 수 없습니다' })
    res.json({ notification })
  } catch {
    res.status(500).json({ message: '알림 읽음 처리 실패' })
  }
}

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    await NotificationModel.updateMany({ userId, isRead: false }, { isRead: true })
    res.json({ message: '모든 알림 읽음 처리 완료' })
  } catch {
    res.status(500).json({ message: '알림 읽음 처리 실패' })
  }
}
