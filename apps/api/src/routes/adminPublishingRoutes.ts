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
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/publishing/:type/suggests', getSuggests)
router.get('/publishing/suggests/:id', getSuggestDetail)
router.patch('/publishing/suggests/:id', updateSuggest)
router.delete('/publishing/suggests/:id', deleteSuggest)

router.get('/publishing/:type/banners', getBanners)
router.post('/publishing/:type/banners', createBanner)
router.put('/publishing/:type/banners/reorder', reorderBanners)
router.put('/publishing/banners/:id', updateBanner)
router.delete('/publishing/banners/:id', deleteBanner)

router.get('/publishing/:type/tabs', getTabs)
router.post('/publishing/:type/tabs', createTab)
router.put('/publishing/:type/tabs/reorder', reorderTabs)
router.put('/publishing/tabs/:id', updateTab)
router.delete('/publishing/tabs/:id', deleteTab)

export default router
