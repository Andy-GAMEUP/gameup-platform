import { Router } from 'express'
import { applyPartner, getMyPartnerStatus, getPartnerSlogan, updateSlogan, getTopics } from '../controllers/partnerController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/partner/topics', getTopics)
router.get('/partner/status', authenticateToken, getMyPartnerStatus)
router.post('/partner/apply', authenticateToken, applyPartner)
router.put('/partner/slogan', authenticateToken, updateSlogan)
router.get('/partner/:partnerId/slogan', getPartnerSlogan)

export default router
