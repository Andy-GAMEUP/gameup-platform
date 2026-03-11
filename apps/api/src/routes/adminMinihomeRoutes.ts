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
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/minihome', getAdminMiniHomes)
router.get('/minihome/keywords', getKeywordGroups)
router.post('/minihome/keywords', createKeywordGroup)
router.put('/minihome/keywords/reorder', reorderKeywordGroups)
router.put('/minihome/keywords/:id', updateKeywordGroup)
router.delete('/minihome/keywords/:id', deleteKeywordGroup)
router.patch('/minihome/:id/visibility', updateMiniHomeVisibility)
router.patch('/minihome/:id/recommended', updateMiniHomeRecommended)
router.delete('/minihome/:id', deleteMiniHome)

export default router
