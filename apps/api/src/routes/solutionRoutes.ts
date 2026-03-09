import { Router } from 'express'
import {
  getSolutions,
  getSolutionDetail,
  subscribe,
  getMySubscriptions,
} from '../controllers/solutionController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/solutions', getSolutions)
router.post('/solutions/subscribe', authenticateToken, subscribe)
router.get('/solutions/subscriptions/me', authenticateToken, getMySubscriptions)
router.get('/solutions/:id', getSolutionDetail)

export default router
