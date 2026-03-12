import { Router } from 'express'
import {
  getIndividualMembers,
  getCorporateMembers,
  getUserDetail,
  updateUser,
  updateCorporateApproval,
  grantActivityScore,
  grantPoints,
  bulkNotify,
} from '../controllers/adminUserController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.post('/bulk-notify', bulkNotify)
router.get('/individual', getIndividualMembers)
router.get('/corporate', getCorporateMembers)
router.get('/:id/detail', getUserDetail)
router.patch('/:id', updateUser)
router.patch('/:id/approval', updateCorporateApproval)
router.post('/:id/activity-score', grantActivityScore)
router.post('/:id/points', grantPoints)

export default router
