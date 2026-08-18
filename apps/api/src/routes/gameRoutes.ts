import { Router } from 'express'
import { getAllGames, getGameById, createGame, updateGame, deleteGame, getMyGames, getDeveloperStats, getGameDeletionLogs, requestReview, cancelReview, restoreGame, getGamePayments, getAllDeveloperPayments, getPaymentProviders } from '../controllers/gameController'
import { getDeveloperOverview, getDeveloperDaily, getGameAnalytics, exportGameAnalytics, exportDeveloperDashboard } from '../controllers/gameAnalyticsController'
import { getGameQAs, createGameQA, getDeveloperQAs, answerGameQA, getMyQAs } from '../controllers/gameQAController'
import { getGameMedia, addGameMedia, deleteGameMedia } from '../controllers/gameMediaController'
import { getGameShopItems, getPublicGameShopItems, createGameShopItem, updateGameShopItem, deleteGameShopItem, reorderGameShopItems, updateShopCurrencyIcon, updateShopCurrencyName, submitShopReview, addAdditionalCurrency, updateAdditionalCurrency, deleteAdditionalCurrency, purchaseWithCapcoin, copyGameShopItem } from '../controllers/gameShopController'
import { getGameAnnouncements, createGameAnnouncement, updateGameAnnouncement, deleteGameAnnouncement, getRecentGameAnnouncements, getGameAnnouncementById, getPublicGameAnnouncements, uploadGameAnnouncementImages, toggleGameAnnouncementLike, reportGameAnnouncement } from '../controllers/gameAnnouncementController'
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth'
import { uploadFields, screenshotUpload, shopItemUpload, shopCurrencyIconUpload, additionalCurrencyIconUpload, mediaUpload, gameAnnouncementUpload } from '../middleware/upload'

const router = Router()

router.get('/', getAllGames)
router.get('/announcements/recent', getRecentGameAnnouncements)
router.get('/announcements/:announcementId', getGameAnnouncementById)
router.post('/announcements/:announcementId/like', authenticateToken, toggleGameAnnouncementLike)
router.post('/announcements/:announcementId/report', authenticateToken, reportGameAnnouncement)
router.get('/my', authenticateToken, requireRole('developer', 'admin'), getMyGames)
router.get('/developer/stats', authenticateToken, requireRole('developer', 'admin'), getDeveloperStats)

// 개발자 대시보드 Overview (실데이터)
router.get('/developer/overview', authenticateToken, requireRole('developer', 'admin'), getDeveloperOverview)
router.get('/developer/daily', authenticateToken, requireRole('developer', 'admin'), getDeveloperDaily)
router.get('/developer/export', authenticateToken, requireRole('developer', 'admin'), exportDeveloperDashboard)

// 게임 삭제 감사로그 (admin)
router.get('/admin/deletion-logs', authenticateToken, requireRole('admin'), getGameDeletionLogs)
router.post('/admin/deletion-logs/:logId/restore', authenticateToken, requireRole('admin'), restoreGame)

// 개발자 Q&A 관리 (피드백 관리)
router.get('/developer/qas', authenticateToken, requireRole('developer', 'admin'), getDeveloperQAs)
router.put('/developer/qas/:qaId/answer', authenticateToken, requireRole('developer', 'admin'), answerGameQA)

// 내 Q&A 조회 (마이페이지)
router.get('/my-qas', authenticateToken, getMyQAs)

router.get('/:id', optionalAuth, getGameById)
router.post('/', authenticateToken, requireRole('developer'), uploadFields, createGame)
router.post('/:id/request-review', authenticateToken, requireRole('developer'), requestReview)
router.post('/:id/cancel-review', authenticateToken, requireRole('developer'), cancelReview)
router.put('/:id', authenticateToken, requireRole('developer', 'admin'), uploadFields, updateGame)
router.delete('/:id', authenticateToken, requireRole('developer', 'admin'), deleteGame)

// 게임별 Q&A
router.get('/:gameId/qas', getGameQAs)
router.post('/:gameId/qas', authenticateToken, createGameQA)

// 전체 게임 결제 내역 (개발자 소유 게임 통합)
router.get('/developer/payments', authenticateToken, requireRole('developer', 'admin'), getAllDeveloperPayments)
router.get('/developer/payment-providers', authenticateToken, requireRole('developer', 'admin'), getPaymentProviders)

// 게임별 결제 내역
router.get('/:gameId/payments', authenticateToken, requireRole('developer', 'admin'), getGamePayments)

// 게임별 분석
router.get('/:gameId/analytics', authenticateToken, requireRole('developer', 'admin'), getGameAnalytics)
router.get('/:gameId/analytics/export', authenticateToken, requireRole('developer', 'admin'), exportGameAnalytics)

// 게임 미디어 (스크린샷 / 동영상)
router.get('/:gameId/media', optionalAuth, getGameMedia)
router.post('/:gameId/media', authenticateToken, requireRole('developer', 'admin'), mediaUpload, addGameMedia)
router.delete('/:gameId/media/:mediaId', authenticateToken, requireRole('developer', 'admin'), deleteGameMedia)

// 게임샵 아이템
router.get('/:gameId/shop-items/public', getPublicGameShopItems)
router.get('/:gameId/shop-items', authenticateToken, requireRole('developer', 'admin'), getGameShopItems)
router.post('/:gameId/shop-items', authenticateToken, requireRole('developer', 'admin'), shopItemUpload, createGameShopItem)
router.put('/:gameId/shop-items/:itemId', authenticateToken, requireRole('developer', 'admin'), shopItemUpload, updateGameShopItem)
router.delete('/:gameId/shop-items/:itemId', authenticateToken, requireRole('developer', 'admin'), deleteGameShopItem)
router.put('/:gameId/shop-items-reorder', authenticateToken, requireRole('developer', 'admin'), reorderGameShopItems)
router.post('/:gameId/shop-items/submit-review', authenticateToken, requireRole('developer', 'admin'), submitShopReview)
router.post('/:gameId/shop-items/:itemId/purchase-capcoin', authenticateToken, purchaseWithCapcoin)
router.post('/:gameId/shop-items/:itemId/copy', authenticateToken, requireRole('developer', 'admin'), copyGameShopItem)
router.put('/:gameId/shop-currency-icon', authenticateToken, requireRole('developer', 'admin'), shopCurrencyIconUpload, updateShopCurrencyIcon)
router.put('/:gameId/shop-currency-name', authenticateToken, requireRole('developer', 'admin'), updateShopCurrencyName)
router.post('/:gameId/currencies', authenticateToken, requireRole('developer', 'admin'), additionalCurrencyIconUpload, addAdditionalCurrency)
router.patch('/:gameId/currencies/:currencyId', authenticateToken, requireRole('developer', 'admin'), additionalCurrencyIconUpload, updateAdditionalCurrency)
router.delete('/:gameId/currencies/:currencyId', authenticateToken, requireRole('developer', 'admin'), deleteAdditionalCurrency)

// 게임 공지&알림
router.get('/:gameId/announcements/public', getPublicGameAnnouncements)
router.get('/:gameId/announcements', authenticateToken, requireRole('developer', 'admin'), getGameAnnouncements)
router.post('/:gameId/announcements', authenticateToken, requireRole('developer', 'admin'), createGameAnnouncement)
router.post('/:gameId/announcements/upload-images', authenticateToken, requireRole('developer', 'admin'), gameAnnouncementUpload, uploadGameAnnouncementImages)
router.patch('/:gameId/announcements/:announcementId', authenticateToken, requireRole('developer', 'admin'), updateGameAnnouncement)
router.delete('/:gameId/announcements/:announcementId', authenticateToken, requireRole('developer', 'admin'), deleteGameAnnouncement)

export default router
