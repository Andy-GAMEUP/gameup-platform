import rateLimit from 'express-rate-limit'

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
  legacyHeaders: false
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
