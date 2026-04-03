import { Router } from 'express'
import {
  getPartnerRequests,
  getPartnerRequestDetail,
  updatePartnerRequest,
  deletePartnerRequest,
  getPartners,
  getPartnerDetail,
  updatePartnerStatus,
  togglePartnerProfileVisibility,
  updatePartnerProfile,
  getPartnerPosts,
  deletePartnerPost,
  getTopicGroups,
  createTopicGroup,
  updateTopicGroup,
  deleteTopicGroup,
  reorderTopicGroups,
  reorderPartnerPosts,
  getAdminProjects,
  getAdminProjectStats,
  updateAdminProjectStatus,
  getAdminProjectApplicants,
} from '../controllers/adminPartnerController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/partner/requests', getPartnerRequests)
router.get('/partner/requests/:id', getPartnerRequestDetail)
router.get('/partner/list', getPartners)
router.get('/partner/topics', getTopicGroups)
router.get('/partner/projects', getAdminProjects)
router.get('/partner/projects/stats', getAdminProjectStats)
router.get('/partner/projects/:id/applicants', getAdminProjectApplicants)
router.get('/partner/:id', getPartnerDetail)
router.get('/partner/:partnerId/posts', getPartnerPosts)

// 수정 (Normal 이상)
router.patch('/partner/requests/:id', requireAdminLevel('super', 'normal'), updatePartnerRequest)
router.post('/partner/topics', requireAdminLevel('super', 'normal'), createTopicGroup)
router.put('/partner/topics/reorder', requireAdminLevel('super', 'normal'), reorderTopicGroups)
router.put('/partner/topics/:id', requireAdminLevel('super', 'normal'), updateTopicGroup)
router.patch('/partner/projects/:id/status', requireAdminLevel('super', 'normal'), updateAdminProjectStatus)
router.put('/partner/posts/reorder', requireAdminLevel('super', 'normal'), reorderPartnerPosts)
router.patch('/partner/:id/status', requireAdminLevel('super', 'normal'), updatePartnerStatus)
router.patch('/partner/:id/visibility', requireAdminLevel('super', 'normal'), togglePartnerProfileVisibility)
router.put('/partner/:id/profile', requireAdminLevel('super', 'normal'), updatePartnerProfile)

// 삭제 (Super만)
router.delete('/partner/requests/:id', requireAdminLevel('super'), deletePartnerRequest)
router.delete('/partner/topics/:id', requireAdminLevel('super'), deleteTopicGroup)
router.delete('/partner/posts/:id', requireAdminLevel('super'), deletePartnerPost)

export default router
