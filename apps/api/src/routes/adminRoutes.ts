import { Router } from 'express'
import {
  getAdminStats,
  getAllUsers, getUserDetail, updateUserRole, banUser, approveUser, deleteUser, getPendingMemberCounts, createAdminUser, getDeletedUsers, restoreUser, deleteUserLog,
  getPendingGames, getAllGamesAdmin, approveGame, controlGameStatus, archiveGame, toggleNewFeatured,
  approveShopReview, rejectShopReview,
  getGameMetrics,
  getAllReviews, blockReview, deleteReview,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getPublicAnnouncements, getPublicAnnouncementById
} from '../controllers/adminController'
import { getCommunityBanners, getAllCommunityBanners, uploadCommunityBanner, updateCommunityBanner, deleteCommunityBanner, trackBannerEvent } from '../controllers/communityBannerController'
import { getReportedPosts, adminUpdatePostStatus, getReportedComments, adminUpdateCommentStatus, getDeletedPosts, getDeletedComments, getReportedUsers } from '../controllers/communityController'
import { authenticateToken, requireAdmin, requireAdminLevel } from '../middleware/auth'
import { uploadFields } from '../middleware/upload'

const router = Router()

// 공개 — 커뮤니티 홈 배너 (인증 불필요)
router.get('/community/banners', getCommunityBanners)
router.post('/community/banners/:id/track', trackBannerEvent)

// 공개 공지사항 (인증 불필요)
router.get('/announcements/public', getPublicAnnouncements)
router.get('/announcements/public/:id', getPublicAnnouncementById)

// 이하 모두 관리자 전용
router.use(authenticateToken, requireAdmin)

// 조회 (모든 관리자)
router.get('/stats', getAdminStats)
router.get('/users', getAllUsers)
router.get('/users/deleted', requireAdminLevel('super', 'normal'), getDeletedUsers)
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
router.patch('/games/:id/new-featured', requireAdminLevel('super', 'normal'), toggleNewFeatured)
router.patch('/reviews/:id/block', requireAdminLevel('super', 'normal'), blockReview)

// 탈퇴 회원 복구/완전삭제 (Super만)
router.post('/users/deleted/:id/restore', requireAdminLevel('super'), restoreUser)
router.delete('/users/deleted/:id', requireAdminLevel('super'), deleteUserLog)

// 승인 (Super만)
router.patch('/users/:id/approve', requireAdminLevel('super'), approveUser)
router.delete('/users/:id', requireAdminLevel('super'), deleteUser)
router.post('/users/create-admin', requireAdminLevel('super'), createAdminUser)
router.patch('/games/:id/approve', requireAdminLevel('super'), approveGame)
router.post('/games/:gameId/shop-review/approve', requireAdminLevel('super', 'normal'), approveShopReview)
router.post('/games/:gameId/shop-review/reject', requireAdminLevel('super', 'normal'), rejectShopReview)
router.delete('/reviews/:id', requireAdminLevel('super'), deleteReview)
router.delete('/announcements/:id', requireAdminLevel('super'), deleteAnnouncement)

// 신고된 커뮤니티 게시글/댓글 (모든 관리자)
router.get('/community/reported-posts', getReportedPosts)
router.patch('/community/posts/:id/status', requireAdminLevel('super', 'normal'), adminUpdatePostStatus)
router.get('/community/reported-comments', getReportedComments)
router.patch('/community/comments/:id/action', requireAdminLevel('super', 'normal'), adminUpdateCommentStatus)
router.get('/community/deleted-posts', getDeletedPosts)
router.get('/community/deleted-comments', getDeletedComments)
router.get('/community/reported-users', getReportedUsers)

// 커뮤니티 배너 (관리자)
router.get('/community/banners/all', getAllCommunityBanners)
router.post('/community/banners', requireAdminLevel('super', 'normal'), uploadFields, uploadCommunityBanner)
router.patch('/community/banners/:id', requireAdminLevel('super', 'normal'), uploadFields, updateCommunityBanner)
router.delete('/community/banners/:id', requireAdminLevel('super', 'normal'), deleteCommunityBanner)

export default router
