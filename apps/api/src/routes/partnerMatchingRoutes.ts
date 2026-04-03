import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import {
  getPartnerProfiles,
  getPartnerProfileStats,
  getPartnerProfileById,
  getPartnerReviews,
  createPartnerReview,
} from '../controllers/partnerMatchingController'

const router = Router()

// 파트너 프로필 목록 & 통계
router.get('/partner/profiles', getPartnerProfiles)
router.get('/partner/profiles/stats', getPartnerProfileStats)

// 파트너 프로필 상세 & 리뷰
router.get('/partner/profiles/:id/reviews', getPartnerReviews)
router.post('/partner/profiles/:id/reviews', authenticateToken, createPartnerReview)
router.get('/partner/profiles/:id', getPartnerProfileById)

export default router
