import { Router } from 'express'
import {
  createApiKey,
  getApiKeys,
  deleteApiKey,
  regenerateApiKey,
  toggleApiKey,
} from '../controllers/apiKeyController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

router.post('/games/:gameId/api-keys', authenticateToken, requireRole('developer', 'admin'), createApiKey)
router.get('/games/:gameId/api-keys', authenticateToken, requireRole('developer', 'admin'), getApiKeys)
router.delete('/games/:gameId/api-keys/:keyId', authenticateToken, requireRole('developer', 'admin'), deleteApiKey)
router.put('/games/:gameId/api-keys/:keyId/regenerate', authenticateToken, requireRole('developer', 'admin'), regenerateApiKey)
router.put('/games/:gameId/api-keys/:keyId/toggle', authenticateToken, requireRole('developer', 'admin'), toggleApiKey)

export default router
