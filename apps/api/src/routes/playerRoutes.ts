import { Router } from 'express'
import {
  getGameReviews,
  upsertReview,
  deleteReview,
  toggleHelpful,
  getMyReview
} from '../controllers/reviewController'
import {
  toggleFavorite,
  getMyFavorites,
  checkFavorites,
  recordPlay,
  updatePlaySession,
  getMyActivity
} from '../controllers/playerController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// ── 읽기 (공개) ──
router.get('/games/:gameId/reviews', getGameReviews)

// ── 읽기 (인증 필요, 역할 무관) ──
router.get('/games/:gameId/my-review', authenticateToken, getMyReview)
router.get('/player/favorites', authenticateToken, getMyFavorites)
router.post('/player/favorites/check', authenticateToken, checkFavorites)
router.get('/player/activity', authenticateToken, getMyActivity)

// ── 쓰기 (플레이어 전용) ──
const playerOnly = [authenticateToken, requireRole('player')]

router.post('/games/:gameId/reviews', ...playerOnly, upsertReview)
router.delete('/games/:gameId/reviews', ...playerOnly, deleteReview)
router.post('/reviews/:reviewId/helpful', ...playerOnly, toggleHelpful)
router.post('/games/:gameId/favorite', ...playerOnly, toggleFavorite)
router.post('/games/:gameId/play', ...playerOnly, recordPlay)
router.patch('/games/:gameId/play/session', ...playerOnly, updatePlaySession)

export default router
