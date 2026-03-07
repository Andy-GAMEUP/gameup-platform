import { Router } from 'express'
import { toggleFollow, getFollowers, getFollowing, checkFollowing, getMyFollowStats } from '../controllers/followController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/users/me/follow-stats', authenticateToken, getMyFollowStats)
router.get('/users/:userId/followers', getFollowers)
router.get('/users/:userId/following', getFollowing)
router.get('/users/:userId/follow-status', authenticateToken, checkFollowing)
router.post('/users/:userId/follow', authenticateToken, toggleFollow)

export default router
