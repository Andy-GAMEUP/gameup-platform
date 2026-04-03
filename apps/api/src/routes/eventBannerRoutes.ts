import { Router } from 'express'
import {
  getActiveEventBanners,
  registerForEvent,
} from '../controllers/eventBannerController'

const router = Router()

// 공개 API (인증 불필요)
router.get('/event-banners', getActiveEventBanners)
router.post('/event-banners/:id/register', registerForEvent)

export default router
