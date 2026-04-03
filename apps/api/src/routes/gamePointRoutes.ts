import { Router } from 'express'
import {
  grantPoint,
  batchGrantPoints,
  getGamePolicies,
  getGameStats,
  getGamePointLogs,
  getMyGamePolicies,
  upsertGamePolicy,
  submitPoliciesForApproval,
  deleteGamePolicy,
} from '../controllers/gamePointController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// ─── 외부 게임 연동 API (게임 서버에서 호출) ──────────────────────
// 인증: x-api-key 헤더 또는 JWT (향후 API Key 인증 미들웨어 추가 가능)
router.post('/game-points/grant', grantPoint)
router.post('/game-points/batch-grant', batchGrantPoints)

// ─── 공개 API ────────────────────────────────────────────────────
router.get('/game-points/:gameId/policies', getGamePolicies)

// ─── 개발사 콘솔 API ─────────────────────────────────────────────
router.get('/games/:gameId/point-policies', authenticateToken, requireRole('developer', 'admin'), getMyGamePolicies)
router.post('/games/:gameId/point-policies', authenticateToken, requireRole('developer', 'admin'), upsertGamePolicy)
router.post('/games/:gameId/point-policies/submit', authenticateToken, requireRole('developer', 'admin'), submitPoliciesForApproval)
router.delete('/games/:gameId/point-policies/:type', authenticateToken, requireRole('developer', 'admin'), deleteGamePolicy)

// ─── 개발사/관리자: 통계 및 로그 ─────────────────────────────────
router.get('/game-points/:gameId/stats', authenticateToken, requireRole('developer', 'admin'), getGameStats)
router.get('/game-points/:gameId/logs', authenticateToken, requireRole('developer', 'admin'), getGamePointLogs)

export default router
