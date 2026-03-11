import { Router } from 'express'
import {
  getSubscriptions,
  getSubscriptionDetail,
  updateSubscriptionStatus,
  confirmSubscription,
  deleteSubscription,
  getSolutions,
  createSolution,
  updateSolution,
  deleteSolution,
  reorderSolutions,
} from '../controllers/adminSolutionController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/solutions', getSolutions)
router.post('/solutions', createSolution)
router.put('/solutions/reorder', reorderSolutions)
router.put('/solutions/:id', updateSolution)
router.delete('/solutions/:id', deleteSolution)

router.get('/solutions/subscriptions', getSubscriptions)
router.get('/solutions/subscriptions/:id', getSubscriptionDetail)
router.patch('/solutions/subscriptions/:id/status', updateSubscriptionStatus)
router.patch('/solutions/subscriptions/:id/confirm', confirmSubscription)
router.delete('/solutions/subscriptions/:id', deleteSubscription)

export default router
