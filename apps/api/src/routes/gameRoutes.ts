import { Router } from 'express'
import { getAllGames, getGameById, createGame, updateGame, deleteGame, getMyGames, getDeveloperStats } from '../controllers/gameController'
import { authenticateToken, requireRole } from '../middleware/auth'
import { uploadFields } from '../middleware/upload'

const router = Router()

router.get('/', getAllGames)
router.get('/my', authenticateToken, requireRole('developer'), getMyGames)
router.get('/developer/stats', authenticateToken, requireRole('developer'), getDeveloperStats)
router.get('/:id', getGameById)
router.post('/', authenticateToken, requireRole('developer'), uploadFields, createGame)
router.put('/:id', authenticateToken, requireRole('developer'), uploadFields, updateGame)
router.delete('/:id', authenticateToken, requireRole('developer'), deleteGame)

export default router
