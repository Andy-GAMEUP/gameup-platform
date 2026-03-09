import { Router } from 'express'
import { Request, Response } from 'express'
import {
  getSupportIntro,
  getCurrentSeason,
  getSeasonDetail,
  getSelectedGames,
  getSelectedGameDetail,
  applyGame,
  getMyApplications,
  uploadIrDocument,
} from '../controllers/supportController'
import { authenticateToken } from '../middleware/auth'

const router = Router()
router.get('/support/intro', getSupportIntro)
router.get('/support/season/current', getCurrentSeason)
router.get('/support/season/:id', getSeasonDetail)
router.get('/support/season/:seasonId/games', getSelectedGames)
router.get('/support/games/:id', getSelectedGameDetail)
router.post('/support/apply', authenticateToken, applyGame)
router.get('/support/applications/me', authenticateToken, getMyApplications)
router.put('/support/applications/:id/ir', authenticateToken, uploadIrDocument)
export default router
