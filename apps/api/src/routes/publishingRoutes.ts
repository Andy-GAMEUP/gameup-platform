import { Router } from 'express'
import {
  getPublishingLanding,
  getPublishingGame,
  createSuggest,
  getMyGames,
  getMySuggests,
} from '../controllers/publishingController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/publishing/:type', getPublishingLanding)
router.get('/publishing/:type/games/:gameId', getPublishingGame)
router.post('/publishing/:type/suggest', authenticateToken, createSuggest)
router.get('/publishing/:type/my-games', authenticateToken, getMyGames)
router.get('/publishing/my-suggests', authenticateToken, getMySuggests)

export default router
