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

router.get('/admin/solutions', getSolutions)
router.post('/admin/solutions', createSolution)
router.put('/admin/solutions/reorder', reorderSolutions)
router.put('/admin/solutions/:id', updateSolution)
router.delete('/admin/solutions/:id', deleteSolution)

router.get('/admin/solutions/subscriptions', getSubscriptions)
router.get('/admin/solutions/subscriptions/:id', getSubscriptionDetail)
router.patch('/admin/solutions/subscriptions/:id/status', updateSubscriptionStatus)
router.patch('/admin/solutions/subscriptions/:id/confirm', confirmSubscription)
router.delete('/admin/solutions/subscriptions/:id', deleteSubscription)

export default router
