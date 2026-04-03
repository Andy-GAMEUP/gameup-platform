import { Router } from 'express'
import {
  getGameEvents,
  createGameEvent,
  updateGameEvent,
  deleteGameEvent,
  claimEventReward,
} from '../controllers/gameEventController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// 공개: 게임 이벤트 목록
router.get('/games/:gameId/events', getGameEvents)

// 개발사: 이벤트 CRUD
router.post('/game-events', authenticateToken, requireRole('developer', 'admin'), createGameEvent)
router.put('/game-events/:id', authenticateToken, requireRole('developer', 'admin'), updateGameEvent)
router.delete('/game-events/:id', authenticateToken, requireRole('developer', 'admin'), deleteGameEvent)

// 플레이어: 이벤트 보상 청구
router.post('/game-events/:eventId/claim', authenticateToken, claimEventReward)

export default router
