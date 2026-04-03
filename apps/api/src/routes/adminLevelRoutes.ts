import { Router } from 'express'
import { getLevels, updateLevels } from '../controllers/adminLevelController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getLevels)
router.post('/', requireAdminLevel('super'), updateLevels)

export default router
