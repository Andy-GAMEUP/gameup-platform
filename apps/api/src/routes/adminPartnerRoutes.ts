import { Router } from 'express'
import {
  getPartnerRequests,
  getPartnerRequestDetail,
  updatePartnerRequest,
  deletePartnerRequest,
  getPartners,
  getPartnerDetail,
  updatePartnerStatus,
  getPartnerPosts,
  deletePartnerPost,
  getTopicGroups,
  createTopicGroup,
  updateTopicGroup,
  deleteTopicGroup,
  reorderTopicGroups,
  reorderPartnerPosts,
} from '../controllers/adminPartnerController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/admin/partner/requests', getPartnerRequests)
router.get('/admin/partner/requests/:id', getPartnerRequestDetail)
router.patch('/admin/partner/requests/:id', updatePartnerRequest)
router.delete('/admin/partner/requests/:id', deletePartnerRequest)

router.get('/admin/partner/list', getPartners)
router.get('/admin/partner/topics', getTopicGroups)
router.post('/admin/partner/topics', createTopicGroup)
router.put('/admin/partner/topics/reorder', reorderTopicGroups)
router.put('/admin/partner/topics/:id', updateTopicGroup)
router.delete('/admin/partner/topics/:id', deleteTopicGroup)

router.get('/admin/partner/:id', getPartnerDetail)
router.patch('/admin/partner/:id/status', updatePartnerStatus)
router.get('/admin/partner/:partnerId/posts', getPartnerPosts)
router.put('/admin/partner/posts/reorder', reorderPartnerPosts)
router.delete('/admin/partner/posts/:id', deletePartnerPost)

export default router
