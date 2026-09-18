import rateLimit from 'express-rate-limit'
import { AuthRequest } from './auth'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => process.env.NODE_ENV === 'development'
})

// 뉴플레이 웹훅 — 인증 미들웨어 없이 외부에서 호출되는 공개 엔드포인트라
// 서명 실패를 유발하는 무차별 요청/장애로 인한 리소스 소모를 막기 위한 제한
export const paymentWebhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { message: '요청이 너무 많습니다.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
})

// 결제 주문 생성 — 호출마다 실제 PG(뉴플레이/토스) API를 때리므로, 로그인 유저가
// 스크립트로 반복 호출해서 pending 주문을 쌓거나 PG API에 부하를 주는 것을 막는 제한
// IP가 아니라 유저 ID 기준으로 세는데, 이 라우트는 항상 authenticateToken 뒤에 붙어 req.user가 이미 채워져 있어서
// 같은 공유 IP(회사/학교/VPN)를 쓰는 다른 유저들이 서로 카운트에 영향을 주지 않는다
export const paymentOrderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { message: '결제 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.id || req.ip || 'unknown',
  skip: () => process.env.NODE_ENV === 'development'
})

// 사업자등록번호 확인(가입 화면에서 입력 중 실시간 자동 호출) 전용 제한
// authLimiter보다 훨씬 느슨하게 잡아서 정상적인 입력/수정 흐름은 안 막되,
// 외부(국세청) API 사용량 소진이나 번호 무작위 대입은 막는다.
export const businessCheckLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: '잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
})
