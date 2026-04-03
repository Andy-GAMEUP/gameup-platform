import { Router } from 'express'
import { getNotifications, sendNotification } from '../controllers/adminNotificationController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()

router.use(authenticateToken, requireAdmin)

router.get('/notifications', getNotifications)
router.post('/notifications/send', requireAdminLevel('super', 'normal', 'monitor'), sendNotification)

export default router
