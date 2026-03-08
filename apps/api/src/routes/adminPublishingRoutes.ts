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

router.get('/admin/publishing/:type/suggests', getSuggests)
router.get('/admin/publishing/suggests/:id', getSuggestDetail)
router.patch('/admin/publishing/suggests/:id', updateSuggest)
router.delete('/admin/publishing/suggests/:id', deleteSuggest)

router.get('/admin/publishing/:type/banners', getBanners)
router.post('/admin/publishing/:type/banners', createBanner)
router.put('/admin/publishing/:type/banners/reorder', reorderBanners)
router.put('/admin/publishing/banners/:id', updateBanner)
router.delete('/admin/publishing/banners/:id', deleteBanner)

router.get('/admin/publishing/:type/tabs', getTabs)
router.post('/admin/publishing/:type/tabs', createTab)
router.put('/admin/publishing/:type/tabs/reorder', reorderTabs)
router.put('/admin/publishing/tabs/:id', updateTab)
router.delete('/admin/publishing/tabs/:id', deleteTab)

export default router
