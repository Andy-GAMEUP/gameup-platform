import { Request, Response, NextFunction } from 'express'
import { verifyApiKey } from '../services/apiKeyService'

export interface ApiKeyRequest extends Request {
  apiKey?: {
    gameId: string
    developerId: string
    keyId: string
  }
}

/**
 * API Key 인증 미들웨어
 * x-api-key 헤더에서 API Key를 읽어 검증
 */
export async function authenticateApiKey(req: ApiKeyRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key가 필요합니다. x-api-key 헤더를 설정해주세요.',
    })
  }

  try {
    const result = await verifyApiKey(apiKey)

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        message: result.error || 'API Key 인증에 실패했습니다',
      })
    }

    req.apiKey = {
      gameId: result.gameId!,
      developerId: result.developerId!,
      keyId: result.keyId!,
    }

    next()
  } catch (error) {
    console.error('API Key 인증 오류:', error)
    return res.status(500).json({ success: false, message: '인증 처리 중 오류가 발생했습니다' })
  }
}
