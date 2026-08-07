import { Router } from 'express'
import { register, login, getProfile, updateProfile, uploadAvatar, changePassword, deleteAccount, submitAppeal, reapplyCorporate, updateCompanyType } from '../controllers/userController'
import { getPublicLevels, getMyActivityScores } from '../controllers/levelController'
import { authenticateToken } from '../middleware/auth'
import { avatarUpload } from '../middleware/upload'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/profile', authenticateToken, getProfile)
router.patch('/profile', authenticateToken, updateProfile)
router.post('/avatar', authenticateToken, avatarUpload, uploadAvatar)
router.patch('/password', authenticateToken, changePassword)
router.delete('/account', authenticateToken, deleteAccount)
router.post('/appeal', authenticateToken, submitAppeal)
router.patch('/reapply', authenticateToken, reapplyCorporate)
router.patch('/company-type', authenticateToken, updateCompanyType)

export default router
