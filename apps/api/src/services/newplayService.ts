import axios from 'axios'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const NEWPLAY_BASE_URL = process.env.NEWPLAY_BASE_URL || 'https://api.newplay.store'

interface CreateNewPlayPaymentParams {
  partnerOrderId: string
  partnerUserId: string
  currency: string
  amount: number
  productName: string
  platform: 'pc' | 'mobile'
  successUrl: string
  failUrl: string
}

interface CreateNewPlayPaymentResult {
  paymentId: string
  paymentUrl: string
}

function getCredentials() {
  const apiKey = process.env.NEWPLAY_GAME_API_KEY
  const apiSecret = process.env.NEWPLAY_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('뉴플레이 API 인증정보(NEWPLAY_GAME_API_KEY / NEWPLAY_API_SECRET)가 설정되지 않았습니다.')
  }
  return { apiKey, apiSecret }
}

// ── 뉴플레이 체크아웃 결제 생성 ────────────────────────────────────
// 인증 헤더: newplay-api-key(Game ID) + newplay-api-token(Secret Key로 서명한 JWT, HS256, 10분 만료)
export async function createNewPlayPayment(
  params: CreateNewPlayPaymentParams
): Promise<CreateNewPlayPaymentResult> {
  const { apiKey, apiSecret } = getCredentials()
  const apiToken = jwt.sign({}, apiSecret, { algorithm: 'HS256', expiresIn: 600 })

  const response = await axios.post(
    `${NEWPLAY_BASE_URL}/api/payment`,
    params,
    {
      headers: {
        'Content-Type': 'application/json',
        'newplay-api-key': apiKey,
        'newplay-api-token': apiToken,
      },
    }
  )

  return response.data as CreateNewPlayPaymentResult
}

// ── 웹훅 서명 검증 (HMAC-SHA256, raw body 기준) ─────────────────────
// 헤더 형식: X-Newplay-Signature: sha256=<hex> — "sha256=" 접두사를 제거한 뒤 비교한다.
export function verifyNewPlayWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
  const apiSecret = process.env.NEWPLAY_API_SECRET
  if (!apiSecret || !rawBody || !signatureHeader) return false

  const given = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader

  const expected = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')
  const givenBuf = Buffer.from(given, 'utf8')

  if (expectedBuf.length !== givenBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, givenBuf)
}
