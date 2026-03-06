import { Router } from 'express'
import { register, login, getProfile, updateProfile, changePassword, deleteAccount } from '../controllers/userController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/profile', authenticateToken, getProfile)
router.patch('/profile', authenticateToken, updateProfile)
router.patch('/password', authenticateToken, changePassword)
router.delete('/account', authenticateToken, deleteAccount)

export default router
