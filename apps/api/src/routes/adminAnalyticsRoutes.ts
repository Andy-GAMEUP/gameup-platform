import { Router } from 'express'
import { getVisitorStats, getMenuStats, getDashboardSummary } from '../controllers/adminAnalyticsController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/visitor-stats', getVisitorStats)
router.get('/menu-stats', getMenuStats)
router.get('/dashboard-summary', getDashboardSummary)

export default router
