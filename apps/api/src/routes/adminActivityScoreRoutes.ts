import { Router } from 'express'
import {
  getActivityScoreHistory,
  getPointPolicies,
  updatePointPolicy,
  seedPointPolicies,
} from '../controllers/adminActivityScoreController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getActivityScoreHistory)
router.get('/policies', getPointPolicies)
router.put('/policies/:id', requireAdminLevel('super'), updatePointPolicy)
router.post('/policies/seed', requireAdminLevel('super'), seedPointPolicies)

export default router
