import { Router } from 'express'
import { createOrder, confirmPayment, getPaymentHistory } from '../controllers/paymentController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/order',   authenticateToken, createOrder)
router.post('/confirm', authenticateToken, confirmPayment)
router.get('/history',  authenticateToken, getPaymentHistory)

export default router
