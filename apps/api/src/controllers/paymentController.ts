import { Response } from 'express'
import axios from 'axios'
import Payment from '../models/Payment'
import { AuthRequest } from '../middleware/auth'

const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

function getTossAuthHeader() {
  const secretKey = process.env.TOSS_SECRET_KEY || ''
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

// ── 주문 생성 (결제 시작 전 DB에 pending 주문 저장) ─────────────────
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, amount, gameName, itemName } = req.body
    const userId = req.user?.id

    if (!gameId || !amount) {
      return res.status(400).json({ message: 'gameId, amount는 필수입니다.' })
    }
    if (amount < 100) {
      return res.status(400).json({ message: '최소 결제 금액은 100원입니다.' })
    }

    const orderId = `ORDER_${Date.now()}_${userId}`

    await Payment.create({
      userId,
      gameId,
      amount,
      currency: 'KRW',
      status: 'pending',
      pgOrderId: orderId,
      pgProvider: 'toss',
      metadata: { gameName, itemName },
    })

    return res.json({ orderId, amount })
  } catch (error: any) {
    console.error('주문 생성 오류:', error)
    res.status(500).json({ message: error.message || '주문 생성 실패' })
  }
}

// ── 결제 승인 (토스페이먼츠 API 호출) ────────────────────────────────
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentKey, orderId, amount } = req.body

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({ message: 'paymentKey, orderId, amount는 필수입니다.' })
    }

    // 토스페이먼츠 결제 승인 API 호출
    const tossResponse = await axios.post(
      `${TOSS_API_BASE}/payments/confirm`,
      { paymentKey, orderId, amount },
      {
        headers: {
          Authorization: getTossAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    )

    const tossData = tossResponse.data

    // DB 결제 상태 업데이트
    const payment = await Payment.findOneAndUpdate(
      { pgOrderId: orderId },
      {
        status: 'completed',
        pgTransactionId: paymentKey,
        metadata: {
          gameName: tossData.orderName,
          itemName: tossData.orderName,
        }
      },
      { new: true }
    )

    return res.json({
      success: true,
      payment,
      tossPayment: {
        paymentKey: tossData.paymentKey,
        orderId: tossData.orderId,
        orderName: tossData.orderName,
        amount: tossData.totalAmount,
        method: tossData.method,
        approvedAt: tossData.approvedAt,
      }
    })
  } catch (error: any) {
    console.error('결제 승인 오류:', error)

    // 토스페이먼츠 API 에러 처리
    if (error.response?.data) {
      const tossError = error.response.data
      // DB에 실패 상태 기록
      await Payment.findOneAndUpdate(
        { pgOrderId: req.body.orderId },
        { status: 'failed' }
      ).catch(() => {})

      return res.status(400).json({
        message: tossError.message || '결제 승인 실패',
        code: tossError.code,
      })
    }

    res.status(500).json({ message: error.message || '결제 승인 실패' })
  }
}

// ── 결제 내역 조회 ────────────────────────────────────────────────
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const payments = await Payment.find({ userId })
      .populate('gameId', 'title')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ payments })
  } catch (error: any) {
    console.error('결제 내역 조회 오류:', error)
    res.status(500).json({ message: error.message || '결제 내역 조회 실패' })
  }
}
