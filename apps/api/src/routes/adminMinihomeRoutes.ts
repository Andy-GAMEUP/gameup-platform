import { Router } from 'express'
import {
  getAdminMiniHomes,
  updateMiniHomeVisibility,
  updateMiniHomeRecommended,
  deleteMiniHome,
  getKeywordGroups,
  createKeywordGroup,
  updateKeywordGroup,
  deleteKeywordGroup,
  reorderKeywordGroups,
} from '../controllers/adminMinihomeController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/minihome', getAdminMiniHomes)
router.get('/minihome/keywords', getKeywordGroups)

// 수정 (Normal 이상)
router.post('/minihome/keywords', requireAdminLevel('super', 'normal'), createKeywordGroup)
router.put('/minihome/keywords/reorder', requireAdminLevel('super', 'normal'), reorderKeywordGroups)
router.put('/minihome/keywords/:id', requireAdminLevel('super', 'normal'), updateKeywordGroup)
router.patch('/minihome/:id/visibility', requireAdminLevel('super', 'normal'), updateMiniHomeVisibility)
router.patch('/minihome/:id/recommended', requireAdminLevel('super', 'normal'), updateMiniHomeRecommended)

// 삭제 (Super만)
router.delete('/minihome/keywords/:id', requireAdminLevel('super'), deleteKeywordGroup)
router.delete('/minihome/:id', requireAdminLevel('super'), deleteMiniHome)

export default router
