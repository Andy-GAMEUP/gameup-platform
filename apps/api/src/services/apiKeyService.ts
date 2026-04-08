import crypto from 'crypto'
import { GameApiKeyModel } from '@gameup/db'

/**
 * API Key 생성: gup_ + 8자 prefix + _ + 32자 랜덤
 * 저장 시 full key의 SHA-256 해시만 저장
 */
export function generateApiKey(): { fullKey: string; prefix: string; keyHash: string } {
  const prefixRandom = crypto.randomBytes(4).toString('hex') // 8자
  const secretPart = crypto.randomBytes(16).toString('hex')   // 32자
  const prefix = `gup_${prefixRandom}`
  const fullKey = `${prefix}_${secretPart}`
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')

  return { fullKey, prefix, keyHash }
}

/**
 * API Key 검증: prefix로 DB 조회 → full key 해시 비교
 */
export async function verifyApiKey(apiKey: string): Promise<{
  valid: boolean
  gameId?: string
  developerId?: string
  keyId?: string
  error?: string
}> {
  if (!apiKey || !apiKey.startsWith('gup_')) {
    return { valid: false, error: '유효하지 않은 API Key 형식입니다' }
  }

  // prefix 추출: gup_XXXXXXXX
  const parts = apiKey.split('_')
  if (parts.length < 3) {
    return { valid: false, error: '유효하지 않은 API Key 형식입니다' }
  }
  const prefix = `${parts[0]}_${parts[1]}`

  // DB 조회
  const keyDoc = await GameApiKeyModel.findOne({ prefix }).lean()
  if (!keyDoc) {
    return { valid: false, error: 'API Key를 찾을 수 없습니다' }
  }

  // 활성 상태 확인
  if (!keyDoc.isActive) {
    return { valid: false, error: '비활성화된 API Key입니다' }
  }

  // 만료 확인
  if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
    return { valid: false, error: '만료된 API Key입니다' }
  }

  // 해시 비교
  const inputHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  if (inputHash !== keyDoc.keyHash) {
    return { valid: false, error: 'API Key가 일치하지 않습니다' }
  }

  // lastUsedAt 업데이트 (비동기)
  GameApiKeyModel.updateOne({ _id: keyDoc._id }, { lastUsedAt: new Date() }).catch(() => {})

  return {
    valid: true,
    gameId: keyDoc.gameId.toString(),
    developerId: keyDoc.developerId.toString(),
    keyId: keyDoc._id.toString(),
  }
}
