import { Router } from 'express'
import { oauthCallback, linkOAuth, unlinkOAuth } from '../controllers/oauthController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/oauth/callback', oauthCallback)
router.post('/oauth/link', authenticateToken, linkOAuth)
router.delete('/oauth/unlink/:provider', authenticateToken, unlinkOAuth)

export default router
