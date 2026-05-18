import { Router } from 'express'
import { getAllGames, getGameById, createGame, updateGame, deleteGame, getMyGames, getDeveloperStats, getGameDeletionLogs, requestReview } from '../controllers/gameController'
import { getDeveloperOverview, getGameAnalytics, exportGameAnalytics } from '../controllers/gameAnalyticsController'
import { getGameQAs, createGameQA, getDeveloperQAs, answerGameQA, getMyQAs } from '../controllers/gameQAController'
import { getGameMedia, addGameMedia, deleteGameMedia } from '../controllers/gameMediaController'
import { getGameShopItems, createGameShopItem, updateGameShopItem, deleteGameShopItem } from '../controllers/gameShopController'
import { getGameAnnouncements, createGameAnnouncement, deleteGameAnnouncement } from '../controllers/gameAnnouncementController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { uploadFields, screenshotUpload } from '../middleware/upload'

const router = Router()

router.get('/', getAllGames)
router.get('/my', authenticateToken, requireRole('developer'), getMyGames)
router.get('/developer/stats', authenticateToken, requireRole('developer'), getDeveloperStats)

// 개발자 대시보드 Overview (실데이터)
router.get('/developer/overview', authenticateToken, requireRole('developer', 'admin'), getDeveloperOverview)

// 게임 삭제 감사로그 (admin)
router.get('/admin/deletion-logs', authenticateToken, requireRole('admin'), getGameDeletionLogs)

// 개발자 Q&A 관리 (피드백 관리)
router.get('/developer/qas', authenticateToken, requireRole('developer'), getDeveloperQAs)
router.put('/developer/qas/:qaId/answer', authenticateToken, requireRole('developer'), answerGameQA)

// 내 Q&A 조회 (마이페이지)
router.get('/my-qas', authenticateToken, getMyQAs)

router.get('/:id', getGameById)
router.post('/', authenticateToken, requireRole('developer'), uploadFields, createGame)
router.post('/:id/request-review', authenticateToken, requireRole('developer'), requestReview)
router.put('/:id', authenticateToken, requireRole('developer'), uploadFields, updateGame)
router.delete('/:id', authenticateToken, requireRole('developer', 'admin'), deleteGame)

// 게임별 Q&A
router.get('/:gameId/qas', getGameQAs)
router.post('/:gameId/qas', authenticateToken, createGameQA)

// 게임별 분석
router.get('/:gameId/analytics', authenticateToken, requireRole('developer', 'admin'), getGameAnalytics)
router.get('/:gameId/analytics/export', authenticateToken, requireRole('developer', 'admin'), exportGameAnalytics)

// 게임 미디어 (스크린샷 / 동영상)
router.get('/:gameId/media', getGameMedia)
router.post('/:gameId/media', authenticateToken, requireRole('developer'), screenshotUpload, addGameMedia)
router.delete('/:gameId/media/:mediaId', authenticateToken, requireRole('developer'), deleteGameMedia)

// 게임샵 아이템
router.get('/:gameId/shop-items', authenticateToken, requireRole('developer'), getGameShopItems)
router.post('/:gameId/shop-items', authenticateToken, requireRole('developer'), createGameShopItem)
router.put('/:gameId/shop-items/:itemId', authenticateToken, requireRole('developer'), updateGameShopItem)
router.delete('/:gameId/shop-items/:itemId', authenticateToken, requireRole('developer'), deleteGameShopItem)

// 게임 공지&알림
router.get('/:gameId/announcements', authenticateToken, requireRole('developer'), getGameAnnouncements)
router.post('/:gameId/announcements', authenticateToken, requireRole('developer'), createGameAnnouncement)
router.delete('/:gameId/announcements/:announcementId', authenticateToken, requireRole('developer'), deleteGameAnnouncement)

export default router
