import { Router } from 'express'
import { getTerms, updateTerms } from '../controllers/adminTermsController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()
router.use(authenticateToken, requireAdmin)

router.get('/', getTerms)
router.post('/', updateTerms)

export default router
