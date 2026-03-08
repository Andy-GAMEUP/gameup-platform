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

router.get('/admin/minihome', getAdminMiniHomes)
router.get('/admin/minihome/keywords', getKeywordGroups)
router.post('/admin/minihome/keywords', createKeywordGroup)
router.put('/admin/minihome/keywords/reorder', reorderKeywordGroups)
router.put('/admin/minihome/keywords/:id', updateKeywordGroup)
router.delete('/admin/minihome/keywords/:id', deleteKeywordGroup)
router.patch('/admin/minihome/:id/visibility', updateMiniHomeVisibility)
router.patch('/admin/minihome/:id/recommended', updateMiniHomeRecommended)
router.delete('/admin/minihome/:id', deleteMiniHome)

export default router
