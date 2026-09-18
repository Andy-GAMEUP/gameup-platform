import { Router } from 'express'
import {
  createOrder,
  confirmPayment,
  getPaymentHistory,
  newplayWebhook,
  getOrderStatus,
} from '../controllers/paymentController'
import { authenticateToken } from '../middleware/auth'
import { paymentWebhookLimiter, paymentOrderLimiter } from '../middleware/rateLimiters'

const router = Router()

router.post('/order',   authenticateToken, paymentOrderLimiter, createOrder)
router.post('/confirm', authenticateToken, paymentOrderLimiter, confirmPayment)
router.get('/history',  authenticateToken, getPaymentHistory)
router.get('/order/:orderId', authenticateToken, getOrderStatus)

// 외부(뉴플레이 서버)에서 서명으로 인증되는 웹훅 — JWT 인증 미들웨어 미적용
router.post('/webhook/newplay', paymentWebhookLimiter, newplayWebhook)

export default router
