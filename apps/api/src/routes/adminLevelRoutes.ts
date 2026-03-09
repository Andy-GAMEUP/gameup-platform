import { Router } from 'express'
import { getLevels, updateLevels } from '../controllers/adminLevelController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getLevels)
router.post('/', updateLevels)

export default router
