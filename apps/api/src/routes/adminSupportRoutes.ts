import { Router } from 'express'
import {
  getSeasons,
  createSeason,
  updateSeason,
  updateSeasonStatus,
  deleteSeason,
  getApplications,
  getApplicationDetail,
  updateApplicationStatus,
  confirmApplication,
  scoreApplication,
  updateMilestone,
  deleteApplication,
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
} from '../controllers/adminSupportController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/admin/support/seasons', getSeasons)
router.post('/admin/support/seasons', createSeason)
router.put('/admin/support/seasons/:id', updateSeason)
router.patch('/admin/support/seasons/:id/status', updateSeasonStatus)
router.delete('/admin/support/seasons/:id', deleteSeason)

router.get('/admin/support/applications', getApplications)
router.get('/admin/support/applications/:id', getApplicationDetail)
router.patch('/admin/support/applications/:id/status', updateApplicationStatus)
router.patch('/admin/support/applications/:id/confirm', confirmApplication)
router.patch('/admin/support/applications/:id/score', scoreApplication)
router.put('/admin/support/applications/:id/milestones', updateMilestone)
router.delete('/admin/support/applications/:id', deleteApplication)

router.get('/admin/support/banners', getBanners)
router.post('/admin/support/banners', createBanner)
router.put('/admin/support/banners/reorder', reorderBanners)
router.put('/admin/support/banners/:id', updateBanner)
router.delete('/admin/support/banners/:id', deleteBanner)

router.get('/admin/support/tabs', getTabs)
router.post('/admin/support/tabs', createTab)
router.put('/admin/support/tabs/reorder', reorderTabs)
router.put('/admin/support/tabs/:id', updateTab)
router.delete('/admin/support/tabs/:id', deleteTab)

export default router
