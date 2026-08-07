import { Router } from 'express'
import {
  applyPartner, getMyPartnerStatus, getPartnerSlogan, updateSlogan, getTopics,
  getPartners, getPartnerChannel, getPartnerPosts,
  getPartnerPost, createPartnerPost, updatePartnerPost, deletePartnerPost, togglePartnerPostLike,
  getTeamMembers, addTeamMember, removeTeamMember, searchGameUsers, toggleProfileVisibility,
  updateMyPartnerProfile, addPartnerGame, updatePartnerGame, removePartnerGame, setPartnerRepresentativeGame,
  uploadPartnerImages, getReceivedMessages, replyToPartnerMessage,
  closeMessageThread, restoreMessageThread, deleteMessageThread,
} from '../controllers/partnerController'
import { authenticateToken, optionalAuth } from '../middleware/auth'
import { partnerUpload } from '../middleware/upload'

const router = Router()

router.get('/partner/users/search', authenticateToken, searchGameUsers)
router.get('/partner/topics', getTopics)
router.get('/partner/status', authenticateToken, getMyPartnerStatus)
router.post('/partner/apply', authenticateToken, applyPartner)
router.put('/partner/me', authenticateToken, updateMyPartnerProfile)
router.post('/partner/upload-images', authenticateToken, partnerUpload, uploadPartnerImages)
router.put('/partner/slogan', authenticateToken, updateSlogan)

router.post('/partner/games', authenticateToken, addPartnerGame)
router.put('/partner/games/:gameId', authenticateToken, updatePartnerGame)
router.delete('/partner/games/:gameId', authenticateToken, removePartnerGame)
router.put('/partner/representative/:gameId', authenticateToken, setPartnerRepresentativeGame)

router.get('/partner/list', getPartners)
router.get('/partner/posts/:id', getPartnerPost)
router.post('/partner/posts', authenticateToken, createPartnerPost)
router.put('/partner/posts/:id', authenticateToken, updatePartnerPost)
router.delete('/partner/posts/:id', authenticateToken, deletePartnerPost)
router.post('/partner/posts/:id/like', authenticateToken, togglePartnerPostLike)

router.patch('/partner/:partnerId/visibility', authenticateToken, toggleProfileVisibility)
router.get('/partner/:partnerId/slogan', getPartnerSlogan)
router.get('/partner/:partnerId/posts', getPartnerPosts)
router.get('/partner/:partnerId/team', authenticateToken, getTeamMembers)
router.post('/partner/:partnerId/team', authenticateToken, addTeamMember)
router.delete('/partner/:partnerId/team/:memberId', authenticateToken, removeTeamMember)
router.get('/partner/messages/received', authenticateToken, getReceivedMessages)
router.post('/partner/messages/:messageId/reply', authenticateToken, replyToPartnerMessage)
router.post('/partner/messages/thread/:rootId/close', authenticateToken, closeMessageThread)
router.post('/partner/messages/thread/:rootId/restore', authenticateToken, restoreMessageThread)
router.post('/partner/messages/thread/:rootId/delete', authenticateToken, deleteMessageThread)
router.get('/partner/:partnerId', optionalAuth, getPartnerChannel)

export default router
