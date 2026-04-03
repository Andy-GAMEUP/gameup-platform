import { Router } from 'express'
import {
  getAllEventBanners,
  createEventBanner,
  updateEventBanner,
  deleteEventBanner,
  reorderEventBanners,
  getEventRegistrations,
} from '../controllers/eventBannerController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/event-banners', getAllEventBanners)
router.get('/event-registrations', getEventRegistrations)

// 수정 (Normal 이상)
router.post('/event-banners', requireAdminLevel('super', 'normal'), createEventBanner)
router.put('/event-banners/reorder', requireAdminLevel('super', 'normal'), reorderEventBanners)
router.put('/event-banners/:id', requireAdminLevel('super', 'normal'), updateEventBanner)

// 삭제 (Super만)
router.delete('/event-banners/:id', requireAdminLevel('super'), deleteEventBanner)

export default router
