import { Router } from 'express'
import {
  getMyBalance,
  getMyTransactions,
  purchasePoints,
  getPointPackages,
  adminGetAllBalances,
  adminAdjust,
  adminGetPackages,
  adminCreatePackage,
  adminUpdatePackage,
} from '../controllers/developerBalanceController'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

// ─── 공개 API ────────────────────────────────────────────────────
router.get('/point-packages', getPointPackages)

// ─── 개발사 API (인증 필수) ──────────────────────────────────────
router.get('/developer/point-balance', authenticateToken, requireRole('developer', 'admin'), getMyBalance)
router.get('/developer/point-transactions', authenticateToken, requireRole('developer', 'admin'), getMyTransactions)
router.post('/developer/point-purchase', authenticateToken, requireRole('developer', 'admin'), purchasePoints)

// ─── 관리자 API ──────────────────────────────────────────────────
router.get('/admin/developer-balances', authenticateToken, requireRole('admin'), adminGetAllBalances)
router.post('/admin/developer-balances/:developerId/adjust', authenticateToken, requireRole('admin'), adminAdjust)
router.get('/admin/point-packages', authenticateToken, requireRole('admin'), adminGetPackages)
router.post('/admin/point-packages', authenticateToken, requireRole('admin'), adminCreatePackage)
router.put('/admin/point-packages/:id', authenticateToken, requireRole('admin'), adminUpdatePackage)

export default router
