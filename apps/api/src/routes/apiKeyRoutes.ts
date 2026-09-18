import { Router } from 'express'
import {
  createApiKey,
  getApiKeys,
  deleteApiKey,
  regenerateApiKey,
  toggleApiKey,
} from '../controllers/apiKeyController'
import { authenticateToken, requireRole, blockAdminLevel } from '../middleware/auth'

const router = Router()

router.post('/games/:gameId/api-keys', authenticateToken, requireRole('developer', 'admin'), blockAdminLevel('monitor'), createApiKey)
router.get('/games/:gameId/api-keys', authenticateToken, requireRole('developer', 'admin'), getApiKeys)
router.delete('/games/:gameId/api-keys/:keyId', authenticateToken, requireRole('developer', 'admin'), blockAdminLevel('monitor', 'normal'), deleteApiKey)
router.put('/games/:gameId/api-keys/:keyId/regenerate', authenticateToken, requireRole('developer', 'admin'), blockAdminLevel('monitor'), regenerateApiKey)
router.put('/games/:gameId/api-keys/:keyId/toggle', authenticateToken, requireRole('developer', 'admin'), blockAdminLevel('monitor'), toggleApiKey)

export default router
