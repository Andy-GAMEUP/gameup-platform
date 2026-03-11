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

router.get('/support/seasons', getSeasons)
router.post('/support/seasons', createSeason)
router.put('/support/seasons/:id', updateSeason)
router.patch('/support/seasons/:id/status', updateSeasonStatus)
router.delete('/support/seasons/:id', deleteSeason)

router.get('/support/applications', getApplications)
router.get('/support/applications/:id', getApplicationDetail)
router.patch('/support/applications/:id/status', updateApplicationStatus)
router.patch('/support/applications/:id/confirm', confirmApplication)
router.patch('/support/applications/:id/score', scoreApplication)
router.put('/support/applications/:id/milestones', updateMilestone)
router.delete('/support/applications/:id', deleteApplication)

router.get('/support/banners', getBanners)
router.post('/support/banners', createBanner)
router.put('/support/banners/reorder', reorderBanners)
router.put('/support/banners/:id', updateBanner)
router.delete('/support/banners/:id', deleteBanner)

router.get('/support/tabs', getTabs)
router.post('/support/tabs', createTab)
router.put('/support/tabs/reorder', reorderTabs)
router.put('/support/tabs/:id', updateTab)
router.delete('/support/tabs/:id', deleteTab)

export default router
