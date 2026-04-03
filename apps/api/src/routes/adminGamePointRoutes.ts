import { Router } from 'express'
import {
  adminGetAllPolicies,
  adminApprovePolicy,
  adminRejectPolicy,
  adminTogglePolicy,
} from '../controllers/gamePointController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin'))

// 관리자: 전체 게임 포인트 정책 목록
router.get('/game-point-policies', adminGetAllPolicies)

// 관리자: 정책 승인
router.put('/game-point-policies/:id/approve', adminApprovePolicy)

// 관리자: 정책 거절
router.put('/game-point-policies/:id/reject', adminRejectPolicy)

// 관리자: 정책 활성/비활성 토글
router.put('/game-point-policies/:id/toggle', adminTogglePolicy)

export default router
