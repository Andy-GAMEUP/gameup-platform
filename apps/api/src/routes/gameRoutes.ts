import { Router } from 'express'
import { getAllGames, getGameById, createGame, updateGame, deleteGame, getMyGames, getDeveloperStats } from '../controllers/gameController'
import { getGameQAs, createGameQA, getDeveloperQAs, answerGameQA, getMyQAs } from '../controllers/gameQAController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { uploadFields } from '../middleware/upload'

const router = Router()

router.get('/', getAllGames)
router.get('/my', authenticateToken, requireRole('developer'), getMyGames)
router.get('/developer/stats', authenticateToken, requireRole('developer'), getDeveloperStats)

// 개발자 Q&A 관리 (피드백 관리)
router.get('/developer/qas', authenticateToken, requireRole('developer'), getDeveloperQAs)
router.put('/developer/qas/:qaId/answer', authenticateToken, requireRole('developer'), answerGameQA)

// 내 Q&A 조회 (마이페이지)
router.get('/my-qas', authenticateToken, getMyQAs)

router.get('/:id', getGameById)
router.post('/', authenticateToken, requireRole('developer'), uploadFields, createGame)
router.put('/:id', authenticateToken, requireRole('developer'), uploadFields, updateGame)
router.delete('/:id', authenticateToken, requireRole('developer'), deleteGame)

// 게임별 Q&A
router.get('/:gameId/qas', getGameQAs)
router.post('/:gameId/qas', authenticateToken, createGameQA)

export default router
