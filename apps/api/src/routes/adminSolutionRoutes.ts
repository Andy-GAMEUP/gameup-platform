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
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/solutions', getSolutions)
router.get('/solutions/subscriptions', getSubscriptions)
router.get('/solutions/subscriptions/:id', getSubscriptionDetail)

// 수정 (Normal 이상)
router.post('/solutions', requireAdminLevel('super', 'normal'), createSolution)
router.put('/solutions/reorder', requireAdminLevel('super', 'normal'), reorderSolutions)
router.put('/solutions/:id', requireAdminLevel('super', 'normal'), updateSolution)
router.patch('/solutions/subscriptions/:id/status', requireAdminLevel('super', 'normal'), updateSubscriptionStatus)
router.patch('/solutions/subscriptions/:id/confirm', requireAdminLevel('super', 'normal'), confirmSubscription)

// 삭제 (Super만)
router.delete('/solutions/:id', requireAdminLevel('super'), deleteSolution)
router.delete('/solutions/subscriptions/:id', requireAdminLevel('super'), deleteSubscription)

export default router
