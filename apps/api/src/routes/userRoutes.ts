import { Router } from 'express'
import { register, login, forgotPassword, getProfile, getPublicProfile, updateProfile, uploadAvatar, changePassword, deleteAccount, submitAppeal, reapplyCorporate, updateCompanyType, updateCompanyInfo, toggleBookmarkedTab, verifyBusinessNumber, setupTwoFactor, enableTwoFactor, disableTwoFactor } from '../controllers/userController'
import { getPublicLevels, getMyActivityScores } from '../controllers/levelController'
import { authenticateToken } from '../middleware/auth'
import { avatarUpload } from '../middleware/upload'
import { authLimiter, businessCheckLimiter } from '../middleware/rateLimiters'

const router = Router()

router.post('/register', authLimiter, register)
router.post('/verify-business-number', businessCheckLimiter, verifyBusinessNumber)
router.post('/login', authLimiter, login)
router.post('/forgot-password', authLimiter, forgotPassword)
router.get('/profile', authenticateToken, getProfile)
router.get('/:userId/public-profile', authenticateToken, getPublicProfile)
router.patch('/profile', authenticateToken, updateProfile)
router.post('/avatar', authenticateToken, avatarUpload, uploadAvatar)
router.patch('/password', authenticateToken, changePassword)
router.post('/2fa/setup', authenticateToken, setupTwoFactor)
router.post('/2fa/enable', authenticateToken, enableTwoFactor)
router.post('/2fa/disable', authenticateToken, disableTwoFactor)
router.delete('/account', authenticateToken, deleteAccount)
router.post('/appeal', authenticateToken, submitAppeal)
router.patch('/reapply', authenticateToken, reapplyCorporate)
router.patch('/company-type', authenticateToken, updateCompanyType)
router.patch('/company-info', authenticateToken, updateCompanyInfo)
router.post('/bookmarked-tabs/toggle', authenticateToken, toggleBookmarkedTab)

export default router
