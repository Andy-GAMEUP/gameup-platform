import { Router } from 'express'
import {
  getMiniHomes,
  getMiniHomeDetail,
  getMyMiniHome,
  getMiniHomeNews,
  getKeywordGroups,
  createMiniHome,
  updateMiniHome,
  addGame,
  updateGame,
  removeGame,
  setRepresentativeGame,
  createNews,
  sendProposal,
  getMyProposals,
  updateProposalStatus,
} from '../controllers/minihomeController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/minihome', getMiniHomes)
router.get('/minihome/keywords', getKeywordGroups)
router.get('/minihome/me', authenticateToken, getMyMiniHome)
router.get('/minihome/proposals/me', authenticateToken, getMyProposals)
router.get('/minihome/:id', getMiniHomeDetail)
router.get('/minihome/:id/news', getMiniHomeNews)

router.post('/minihome', authenticateToken, createMiniHome)
router.put('/minihome', authenticateToken, updateMiniHome)
router.post('/minihome/games', authenticateToken, addGame)
router.put('/minihome/games/:gameId', authenticateToken, updateGame)
router.delete('/minihome/games/:gameId', authenticateToken, removeGame)
router.put('/minihome/representative/:gameId', authenticateToken, setRepresentativeGame)
router.post('/minihome/news', authenticateToken, createNews)
router.post('/minihome/proposals', authenticateToken, sendProposal)
router.patch('/minihome/proposals/:id/status', authenticateToken, updateProposalStatus)

export default router
