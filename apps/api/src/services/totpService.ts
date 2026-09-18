import { authenticator } from 'otplib'
import qrcode from 'qrcode'
import crypto from 'crypto'
import { hashPassword, comparePassword } from './authService'

const ISSUER = 'GameUp'

export const generateTotpSecret = () => authenticator.generateSecret()

export const generateTotpQrCode = async (email: string, secret: string): Promise<string> => {
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret)
  return qrcode.toDataURL(otpauthUrl)
}

export const verifyTotpCode = (secret: string, code: string): boolean => {
  try {
    return authenticator.check(code, secret)
  } catch {
    return false
  }
}

// 인증 앱을 분실했을 때 쓰는 1회용 백업 코드 — 8자리 숫자 10개, 해시로 저장하고 평문은 발급 시 1번만 보여줌
export const generateBackupCodes = (): string[] =>
  Array.from({ length: 10 }, () => crypto.randomInt(0, 100000000).toString().padStart(8, '0'))

export const hashBackupCodes = async (codes: string[]): Promise<string[]> =>
  Promise.all(codes.map((code) => hashPassword(code)))

// 해시된 코드 목록에서 입력한 코드와 일치하는 걸 찾아 소모(제거)한 새 목록을 반환. 못 찾으면 null
export const consumeBackupCode = async (hashedCodes: string[], inputCode: string): Promise<string[] | null> => {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await comparePassword(inputCode, hashedCodes[i])) {
      return [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)]
    }
  }
  return null
}
