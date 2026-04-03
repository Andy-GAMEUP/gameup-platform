import { Router } from 'express'
import {
  getAdminStats,
  getAllUsers, getUserDetail, updateUserRole, banUser, deleteUser, approveUser, getPendingMemberCounts, createAdminUser,
  getPendingGames, getAllGamesAdmin, approveGame, controlGameStatus, archiveGame,
  getGameMetrics,
  getAllReviews, blockReview, deleteReview,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getPublicAnnouncements
} from '../controllers/adminController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'

const router = Router()

// 공개 공지사항 (인증 불필요)
router.get('/announcements/public', getPublicAnnouncements)

// 이하 모두 관리자 전용
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/stats', getAdminStats)
router.get('/users', getAllUsers)
router.get('/users/:id', getUserDetail)
router.get('/members/pending-counts', getPendingMemberCounts)
router.get('/games', getAllGamesAdmin)
router.get('/games/pending', getPendingGames)
router.get('/games/:id/metrics', getGameMetrics)
router.get('/reviews', getAllReviews)
router.get('/announcements', getAnnouncements)

// 공지사항 작성/수정 (Monitor 이상)
router.post('/announcements', requireAdminLevel('super', 'normal', 'monitor'), createAnnouncement)
router.patch('/announcements/:id', requireAdminLevel('super', 'normal', 'monitor'), updateAnnouncement)

// 일반 관리 (Normal 이상)
router.patch('/users/:id/role', requireAdminLevel('super', 'normal'), updateUserRole)
router.patch('/users/:id/ban', requireAdminLevel('super', 'normal'), banUser)
router.patch('/games/:id/control', requireAdminLevel('super', 'normal'), controlGameStatus)
router.patch('/games/:id/archive', requireAdminLevel('super', 'normal'), archiveGame)
router.patch('/reviews/:id/block', requireAdminLevel('super', 'normal'), blockReview)

// 승인/삭제 (Super만)
router.patch('/users/:id/approve', requireAdminLevel('super'), approveUser)
router.delete('/users/:id', requireAdminLevel('super'), deleteUser)
router.post('/users/create-admin', requireAdminLevel('super'), createAdminUser)
router.patch('/games/:id/approve', requireAdminLevel('super'), approveGame)
router.delete('/reviews/:id', requireAdminLevel('super'), deleteReview)
router.delete('/announcements/:id', requireAdminLevel('super'), deleteAnnouncement)

export default router
