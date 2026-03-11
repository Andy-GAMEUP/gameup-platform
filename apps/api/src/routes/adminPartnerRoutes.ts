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

router.get('/partner/requests', getPartnerRequests)
router.get('/partner/requests/:id', getPartnerRequestDetail)
router.patch('/partner/requests/:id', updatePartnerRequest)
router.delete('/partner/requests/:id', deletePartnerRequest)

router.get('/partner/list', getPartners)
router.get('/partner/topics', getTopicGroups)
router.post('/partner/topics', createTopicGroup)
router.put('/partner/topics/reorder', reorderTopicGroups)
router.put('/partner/topics/:id', updateTopicGroup)
router.delete('/partner/topics/:id', deleteTopicGroup)

router.get('/partner/:id', getPartnerDetail)
router.patch('/partner/:id/status', updatePartnerStatus)
router.get('/partner/:partnerId/posts', getPartnerPosts)
router.put('/partner/posts/reorder', reorderPartnerPosts)
router.delete('/partner/posts/:id', deletePartnerPost)

export default router
