import { Router } from 'express'
import { getTerms, updateTerms } from '../controllers/adminTermsController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getTerms)
router.post('/', requireAdminLevel('super', 'normal'), updateTerms)

export default router
