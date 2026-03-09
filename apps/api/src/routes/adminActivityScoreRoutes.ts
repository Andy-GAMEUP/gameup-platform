import { Router } from 'express'
import { getActivityScoreHistory } from '../controllers/adminActivityScoreController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getActivityScoreHistory)

export default router
