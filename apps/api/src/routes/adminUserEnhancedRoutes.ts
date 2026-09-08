import { Router } from 'express'
import {
  getIndividualMembers,
  getCorporateMembers,
  getUserDetail,
  getUserPosts,
  updateUser,
  updateCorporateApproval,
  grantActivityScore,
  grantPoints,
  bulkNotify,
  resetUserPassword,
} from '../controllers/adminUserController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/individual', getIndividualMembers)
router.get('/corporate', getCorporateMembers)
router.get('/:id/detail', getUserDetail)
router.get('/:id/posts', getUserPosts)

// 알림 (Monitor 이상)
router.post('/bulk-notify', requireAdminLevel('super', 'normal', 'monitor'), bulkNotify)

// 수정 (Normal 이상)
router.patch('/:id', requireAdminLevel('super', 'normal'), updateUser)
router.post('/:id/activity-score', requireAdminLevel('super', 'normal'), grantActivityScore)
router.post('/:id/points', requireAdminLevel('super', 'normal'), grantPoints)
router.post('/:id/reset-password', requireAdminLevel('super', 'normal'), resetUserPassword)

// 승인 (Super만)
router.patch('/:id/approval', requireAdminLevel('super'), updateCorporateApproval)

export default router
