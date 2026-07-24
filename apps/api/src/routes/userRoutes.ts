import { Router } from 'express'
import { register, login, getProfile, updateProfile, changePassword, deleteAccount, submitAppeal, reapplyCorporate, updateCompanyType } from '../controllers/userController'
import { getPublicLevels, getMyActivityScores } from '../controllers/levelController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/profile', authenticateToken, getProfile)
router.patch('/profile', authenticateToken, updateProfile)
router.patch('/password', authenticateToken, changePassword)
router.delete('/account', authenticateToken, deleteAccount)
router.post('/appeal', authenticateToken, submitAppeal)
router.patch('/reapply', authenticateToken, reapplyCorporate)
router.patch('/company-type', authenticateToken, updateCompanyType)

export default router
