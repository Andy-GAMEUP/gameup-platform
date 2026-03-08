import { Router } from 'express'
import {
  applyPartner, getMyPartnerStatus, getPartnerSlogan, updateSlogan, getTopics,
  getPartners, getPartnerChannel, getPartnerPosts,
  getPartnerPost, createPartnerPost, updatePartnerPost, deletePartnerPost, togglePartnerPostLike,
} from '../controllers/partnerController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/partner/topics', getTopics)
router.get('/partner/status', authenticateToken, getMyPartnerStatus)
router.post('/partner/apply', authenticateToken, applyPartner)
router.put('/partner/slogan', authenticateToken, updateSlogan)

router.get('/partner/list', getPartners)
router.get('/partner/posts/:id', getPartnerPost)
router.post('/partner/posts', authenticateToken, createPartnerPost)
router.put('/partner/posts/:id', authenticateToken, updatePartnerPost)
router.delete('/partner/posts/:id', authenticateToken, deletePartnerPost)
router.post('/partner/posts/:id/like', authenticateToken, togglePartnerPostLike)

router.get('/partner/:partnerId/slogan', getPartnerSlogan)
router.get('/partner/:partnerId/posts', getPartnerPosts)
router.get('/partner/:partnerId', getPartnerChannel)

export default router
