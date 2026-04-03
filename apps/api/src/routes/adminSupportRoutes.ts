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
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/support/seasons', getSeasons)
router.get('/support/applications', getApplications)
router.get('/support/applications/:id', getApplicationDetail)
router.get('/support/banners', getBanners)
router.get('/support/tabs', getTabs)

// 수정 (Normal 이상)
router.post('/support/seasons', requireAdminLevel('super', 'normal'), createSeason)
router.put('/support/seasons/:id', requireAdminLevel('super', 'normal'), updateSeason)
router.patch('/support/seasons/:id/status', requireAdminLevel('super', 'normal'), updateSeasonStatus)
router.patch('/support/applications/:id/status', requireAdminLevel('super', 'normal'), updateApplicationStatus)
router.patch('/support/applications/:id/confirm', requireAdminLevel('super', 'normal'), confirmApplication)
router.patch('/support/applications/:id/score', requireAdminLevel('super', 'normal'), scoreApplication)
router.put('/support/applications/:id/milestones', requireAdminLevel('super', 'normal'), updateMilestone)
router.post('/support/banners', requireAdminLevel('super', 'normal'), createBanner)
router.put('/support/banners/reorder', requireAdminLevel('super', 'normal'), reorderBanners)
router.put('/support/banners/:id', requireAdminLevel('super', 'normal'), updateBanner)
router.post('/support/tabs', requireAdminLevel('super', 'normal'), createTab)
router.put('/support/tabs/reorder', requireAdminLevel('super', 'normal'), reorderTabs)
router.put('/support/tabs/:id', requireAdminLevel('super', 'normal'), updateTab)

// 삭제 (Super만)
router.delete('/support/seasons/:id', requireAdminLevel('super'), deleteSeason)
router.delete('/support/applications/:id', requireAdminLevel('super'), deleteApplication)
router.delete('/support/banners/:id', requireAdminLevel('super'), deleteBanner)
router.delete('/support/tabs/:id', requireAdminLevel('super'), deleteTab)

export default router
