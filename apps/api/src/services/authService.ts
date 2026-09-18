import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// 🔒 JWT_SECRET 환경변수 미설정 시 서버 시작 차단
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'default-secret') {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 치명적 오류: JWT_SECRET 환경변수가 설정되지 않았습니다.')
      process.exit(1)
    }
    console.warn('⚠️  경고: JWT_SECRET이 기본값입니다. 개발 환경에서만 허용됩니다.')
    return 'dev-only-secret-change-in-production'
  }
  return secret
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12) // 10 → 12로 강화
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (payload: {
  id: string
  email: string
  role: 'developer' | 'player' | 'admin'
  adminLevel?: 'super' | 'normal' | 'monitor' | null
}): string => {
  const JWT_SECRET = getJwtSecret()
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  })
}

export const verifyToken = (token: string) => {
  const JWT_SECRET = getJwtSecret()
  return jwt.verify(token, JWT_SECRET)
}

// 임시 비밀번호 생성 (8자+ 영문/숫자/특수문자 정책 충족 보장) — 관리자 초기화 / 본인 비밀번호 찾기 공용
export const generateTempPassword = (): string => {
  const digits = Array.from({ length: 4 }, () => crypto.randomInt(10)).join('')
  return `Gameup!${digits}`
}