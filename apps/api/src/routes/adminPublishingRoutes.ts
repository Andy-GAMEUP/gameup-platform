import { Router } from 'express'
import {
  getSuggests,
  getSuggestDetail,
  updateSuggest,
  deleteSuggest,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  getTabs,
  createTab,
  updateTab,
  deleteTab,
  reorderTabs,
} from '../controllers/adminPublishingController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/publishing/:type/suggests', getSuggests)
router.get('/publishing/suggests/:id', getSuggestDetail)
router.get('/publishing/:type/banners', getBanners)
router.get('/publishing/:type/tabs', getTabs)

// 수정 (Normal 이상)
router.patch('/publishing/suggests/:id', requireAdminLevel('super', 'normal'), updateSuggest)
router.post('/publishing/:type/banners', requireAdminLevel('super', 'normal'), createBanner)
router.put('/publishing/:type/banners/reorder', requireAdminLevel('super', 'normal'), reorderBanners)
router.put('/publishing/banners/:id', requireAdminLevel('super', 'normal'), updateBanner)
router.post('/publishing/:type/tabs', requireAdminLevel('super', 'normal'), createTab)
router.put('/publishing/:type/tabs/reorder', requireAdminLevel('super', 'normal'), reorderTabs)
router.put('/publishing/tabs/:id', requireAdminLevel('super', 'normal'), updateTab)

// 삭제 (Super만)
router.delete('/publishing/suggests/:id', requireAdminLevel('super'), deleteSuggest)
router.delete('/publishing/banners/:id', requireAdminLevel('super'), deleteBanner)
router.delete('/publishing/tabs/:id', requireAdminLevel('super'), deleteTab)

export default router
