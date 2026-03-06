import { Router } from 'express'
import {
  getAdminStats,
  getAllUsers, getUserDetail, updateUserRole, banUser,
  getPendingGames, getAllGamesAdmin, approveGame, controlGameStatus, archiveGame,
  getGameMetrics,
  getAllReviews, blockReview, deleteReview,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getPublicAnnouncements
} from '../controllers/adminController'
import { authenticateToken, requireAdmin } from '../middleware/auth'

const router = Router()

// 공개 공지사항 (인증 불필요)
router.get('/announcements/public', getPublicAnnouncements)

// 이하 모두 관리자 전용
router.use(authenticateToken, requireAdmin)

// 통계
router.get('/stats', getAdminStats)

// 사용자 관리
router.get('/users', getAllUsers)
router.get('/users/:id', getUserDetail)
router.patch('/users/:id/role', updateUserRole)
router.patch('/users/:id/ban', banUser)

// 게임 관리
router.get('/games', getAllGamesAdmin)
router.get('/games/pending', getPendingGames)
router.get('/games/:id/metrics', getGameMetrics)
router.patch('/games/:id/approve', approveGame)
router.patch('/games/:id/control', controlGameStatus)
router.patch('/games/:id/archive', archiveGame)

// 커뮤니티 모니터링
router.get('/reviews', getAllReviews)
router.patch('/reviews/:id/block', blockReview)
router.delete('/reviews/:id', deleteReview)

// 공지사항 CRUD
router.get('/announcements', getAnnouncements)
router.post('/announcements', createAnnouncement)
router.patch('/announcements/:id', updateAnnouncement)
router.delete('/announcements/:id', deleteAnnouncement)

export default router
