import { Router } from 'express'
import { register, login, getProfile, updateProfile, changePassword, deleteAccount, getLevelTiers } from '../controllers/userController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.get('/levels', getLevelTiers)
router.post('/register', register)
router.post('/login', login)
router.get('/profile', authenticateToken, getProfile)
router.patch('/profile', authenticateToken, updateProfile)
router.patch('/password', authenticateToken, changePassword)
router.delete('/account', authenticateToken, deleteAccount)

export default router
