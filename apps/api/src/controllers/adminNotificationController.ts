import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { NotificationModel, UserModel } from '@gameup/db'
import { emitToUser } from '../socket'

export const sendNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, type, title, content, linkUrl, broadcast } = req.body
    if (!type || !title) return res.status(400).json({ message: 'type과 title은 필수입니다' })
    let targetIds: string[] = userIds || []
    if (broadcast) {
      const users = await UserModel.find({}, '_id')
      targetIds = users.map((u) => u._id.toString())
    }
    if (targetIds.length === 0) return res.status(400).json({ message: '수신자가 없습니다' })
    const notifications = targetIds.map((userId) => ({
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

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const total = await NotificationModel.countDocuments()
    const notifications = await NotificationModel.find()
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ notifications, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '알림 목록 조회 실패' })
  }
}
