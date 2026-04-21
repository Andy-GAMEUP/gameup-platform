import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { trackPageVisit, updateDuration } from '../controllers/analyticsTrackController'

const router = Router()

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: '요청이 너무 많습니다' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/track', trackLimiter, trackPageVisit)
// POST (not PATCH) because navigator.sendBeacon() only supports POST
router.post('/track/:id/duration', trackLimiter, updateDuration)

export default router
