import { Router } from 'express'
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/notifications', authenticateToken, getMyNotifications)
router.get('/notifications/unread-count', authenticateToken, getUnreadCount)
router.put('/notifications/read-all', authenticateToken, markAllAsRead)
router.put('/notifications/:id/read', authenticateToken, markAsRead)

export default router
