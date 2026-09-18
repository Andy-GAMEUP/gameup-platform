import { Request, Response } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { PaymentModel as Payment, GameShopItemModel, GameModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { createNewPlayPayment, verifyNewPlayWebhookSignature } from '../services/newplayService'

const TOSS_API_BASE = 'https://api.tosspayments.com/v1'

function getTossAuthHeader() {
  const secretKey = process.env.TOSS_SECRET_KEY || ''
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

// 요청 body/헤더 값을 그대로 Mongo 쿼리 조건에 넣지 않기 위한 가드.
// 객체({"$ne": null} 등)가 오면 문자열이 아니므로 걸러내 NoSQL 연산자 주입을 막는다.
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

// ── 주문 생성 (결제 시작 전 DB에 pending 주문 저장) ─────────────────
// 금액/상품명은 클라이언트 입력을 신뢰하지 않고 서버에서 다시 조회해 확정한다.
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, itemId, provider } = req.body
    const userId = req.user?.id

    if (!isNonEmptyString(gameId)) {
      return res.status(400).json({ message: 'gameId는 필수입니다.' })
    }
    if (itemId !== undefined && !isNonEmptyString(itemId)) {
      return res.status(400).json({ message: 'itemId 형식이 올바르지 않습니다.' })
    }

    let amount: number
    let itemName: string
    // productName은 뉴플레이 결제창에 노출되는 상품명 — "개발사명-게임명-상품명" 형식으로 통일한다.
    let productNameForPg: string
    let gameNameForMeta = ''

    if (itemId) {
      const [shopItem, game] = await Promise.all([
        GameShopItemModel.findOne({
          _id: itemId,
          gameId,
          active: true,
          saleStatus: 'on_sale',
        }),
        GameModel.findById(gameId).select('title isDeleted status developerId').populate('developerId', 'username companyInfo'),
      ])
      if (!shopItem || !game || game.isDeleted || game.status === 'archived') {
        return res.status(400).json({ message: '판매 중인 상품이 아닙니다.' })
      }
      if (shopItem.paymentType === 'capcoin') {
        return res.status(400).json({ message: '캡코인 상품은 이 결제 방식으로 구매할 수 없습니다.' })
      }
      if (!shopItem.price || shopItem.price <= 0) {
        return res.status(400).json({ message: '판매 중인 상품이 아닙니다.' })
      }
      amount = shopItem.price
      itemName = `${game.title} - ${shopItem.name}`
      const developer = game.developerId as any
      const developerName = developer?.companyInfo?.companyName || developer?.username || ''
      productNameForPg = `${developerName}-${game.title}-${shopItem.name}`
      gameNameForMeta = game.title
    } else {
      const game = await GameModel.findById(gameId).populate('developerId', 'username companyInfo')
      if (!game || game.isDeleted || game.status === 'archived' || game.monetization !== 'paid' || !game.price || game.price <= 0) {
        return res.status(400).json({ message: '구매 가능한 게임이 아닙니다.' })
      }
      amount = game.price
      itemName = `${game.title} 정식 구매`
      const developer = game.developerId as any
      const developerName = developer?.companyInfo?.companyName || developer?.username || ''
      productNameForPg = `${developerName}-${game.title}-정식 구매`
      gameNameForMeta = game.title
    }

    // 유저+시각 조합만으로는 동시 요청 시 충돌 가능해서, 추측 불가능한 랜덤 값을 덧붙여 유일성을 보장한다
    const orderId = `ORDER_${Date.now()}_${userId}_${crypto.randomBytes(4).toString('hex')}`
    const pgProvider = provider === 'newplay' ? 'newplay' : 'toss'

    await Payment.create({
      userId,
      gameId,
      amount,
      currency: 'KRW',
      status: 'pending',
      pgOrderId: orderId,
      pgProvider,
      metadata: { gameName: gameNameForMeta, itemName, itemId: itemId || undefined, productName: productNameForPg },
    })

    if (pgProvider === 'toss') {
      return res.json({ orderId, amount, productName: productNameForPg })
    }

    // ── 뉴플레이 체크아웃 결제 생성 ──────────────────────────────
    try {
      if (!process.env.WEB_BASE_URL && process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WEB_BASE_URL이 설정되지 않아 결제 완료 리다이렉트가 localhost로 향합니다.')
      }
      const webBase = process.env.WEB_BASE_URL || 'http://localhost:3000'
      const userAgent = req.headers['user-agent'] || ''
      const platform = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'pc'
      const { paymentId, paymentUrl } = await createNewPlayPayment({
        partnerOrderId: orderId,
        partnerUserId: String(userId),
        currency: 'KRW',
        amount,
        productName: productNameForPg,
        platform,
        successUrl: `${webBase}/payment/newplay/status?orderId=${orderId}`,
        failUrl: `${webBase}/payment/newplay/status?orderId=${orderId}`,
      })
      await Payment.findOneAndUpdate({ pgOrderId: orderId }, { pgTransactionId: paymentId })
      return res.json({ orderId, paymentUrl })
    } catch (npError: any) {
      await Payment.findOneAndUpdate({ pgOrderId: orderId }, { status: 'failed' }).catch(() => {})
      console.error('뉴플레이 결제 생성 오류:', npError.response?.data || npError.message)
      return res.status(502).json({ message: '뉴플레이 결제 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' })
    }
  } catch (error: any) {
    console.error('주문 생성 오류:', error)
    res.status(500).json({ message: error.message || '주문 생성 실패' })
  }
}

// ── 결제 승인 (토스페이먼츠 API 호출) ────────────────────────────────
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentKey, orderId, amount } = req.body

    if (!isNonEmptyString(paymentKey) || !isNonEmptyString(orderId) || typeof amount !== 'number') {
      return res.status(400).json({ message: 'paymentKey, orderId, amount는 필수입니다.' })
    }

    // 서버에 저장된 주문 금액과 클라이언트가 보낸 금액이 다르면 거부 (위변조 방지)
    const existingOrder = await Payment.findOne({ pgOrderId: orderId })
    if (!existingOrder) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' })
    }
    // 본인 주문이 아니면 거부 — orderId만 알아내서 남의 주문을 승인 처리하는 것 방지
    if (existingOrder.userId.toString() !== req.user?.id) {
      return res.status(403).json({ message: '권한이 없습니다.' })
    }
    if (existingOrder.amount !== amount) {
      return res.status(400).json({ message: '결제 금액이 일치하지 않습니다.' })
    }
    // 이미 완료된 주문을 재확인 요청하면 토스가 거부하는데, 그 에러를 그대로 처리하면
    // 실제로는 성공한 결제가 우리 DB에서 실패로 덮어써지는 버그가 있었음 — 여기서 먼저 멱등 처리
    if (existingOrder.status === 'completed') {
      return res.json({ success: true, payment: existingOrder })
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

// ── 뉴플레이 결제 완료 웹훅 ───────────────────────────────────────
// 인증 미들웨어 없이 외부(뉴플레이 서버)에서 직접 호출되므로, 서명 검증으로
// 요청의 진위를 확인한다. 재시도(최대 3회)에 대비해 멱등하게 처리한다.
export const newplayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-newplay-signature'] as string | undefined
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody

    if (!signature || !rawBody || !verifyNewPlayWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: '서명 검증에 실패했습니다.' })
    }

    const { partnerOrderId, paymentId, status, paymentMethod, paidAt } = req.body || {}
    if (!isNonEmptyString(partnerOrderId)) {
      return res.status(400).json({ message: 'partnerOrderId는 필수입니다.' })
    }
    if (paymentId !== undefined && !isNonEmptyString(paymentId)) {
      return res.status(400).json({ message: 'paymentId 형식이 올바르지 않습니다.' })
    }
    if (status !== undefined && !isNonEmptyString(status)) {
      return res.status(400).json({ message: 'status 형식이 올바르지 않습니다.' })
    }
    if (paymentMethod !== undefined && !isNonEmptyString(paymentMethod)) {
      return res.status(400).json({ message: 'paymentMethod 형식이 올바르지 않습니다.' })
    }
    if (paidAt !== undefined && !isNonEmptyString(paidAt)) {
      return res.status(400).json({ message: 'paidAt 형식이 올바르지 않습니다.' })
    }

    const payment = await Payment.findOne({ pgOrderId: partnerOrderId })
    if (!payment) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' })
    }

    // 이미 완료 처리된 주문이면 그대로 200 (재시도로 인한 중복 처리 방지)
    if (payment.status === 'completed') {
      return res.json({ received: true })
    }

    if (status === 'COMPLETED') {
      payment.status = 'completed'
      if (paymentId) payment.pgTransactionId = paymentId
      if (paymentMethod) payment.metadata.paymentMethod = paymentMethod
      if (paidAt) {
        const parsed = new Date(paidAt)
        if (!Number.isNaN(parsed.getTime())) payment.metadata.paidAt = parsed
      }
      await payment.save()
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      payment.status = 'failed'
      await payment.save()
    }

    return res.json({ received: true })
  } catch (error: any) {
    console.error('뉴플레이 웹훅 처리 오류:', error)
    res.status(500).json({ message: '웹훅 처리 실패' })
  }
}

// ── 주문 상태 조회 (뉴플레이 결제 결과 페이지 폴링용) ─────────────────
export const getOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params
    const payment = await Payment.findOne({ pgOrderId: orderId, userId: req.user?.id })
    if (!payment) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' })
    }
    res.json({ status: payment.status, amount: payment.amount })
  } catch (error: any) {
    console.error('주문 상태 조회 오류:', error)
    res.status(500).json({ message: error.message || '주문 상태 조회 실패' })
  }
}

// ── 결제 내역 조회 ────────────────────────────────────────────────
export const getPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const payments = await Payment.find({ userId })
      .populate('gameId', 'title thumbnail shopCurrencyName shopCurrencyIconUrl')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ payments })
  } catch (error: any) {
    console.error('결제 내역 조회 오류:', error)
    res.status(500).json({ message: error.message || '결제 내역 조회 실패' })
  }
}
