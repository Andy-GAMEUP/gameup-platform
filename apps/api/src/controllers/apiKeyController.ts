import { Request, Response } from 'express'
import { GameApiKeyModel, GameModel } from '@gameup/db'
import { generateApiKey } from '../services/apiKeyService'

interface AuthRequest extends Request {
  user?: { id: string; role: string }
}

/**
 * POST /api/games/:gameId/api-keys
 * API Key 생성
 */
export async function createApiKey(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const { name, expiresAt } = req.body

    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    // 게임당 최대 5개
    const existingCount = await GameApiKeyModel.countDocuments({ gameId })
    if (existingCount >= 5) {
      return res.status(400).json({ message: 'API Key는 게임당 최대 5개까지 생성 가능합니다' })
    }

    const { fullKey, prefix, keyHash } = generateApiKey()

    await GameApiKeyModel.create({
      gameId,
      developerId: req.user!.id,
      keyHash,
      prefix,
      name: name || 'Default',
      expiresAt: expiresAt || undefined,
    })

    // fullKey는 이 응답에서만 반환 (이후 재조회 불가)
    return res.json({
      apiKey: fullKey,
      prefix,
      name: name || 'Default',
      message: 'API Key가 생성되었습니다. 이 키는 다시 확인할 수 없으니 안전하게 보관하세요.',
    })
  } catch (error) {
    console.error('API Key 생성 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET /api/games/:gameId/api-keys
 * API Key 목록 조회
 */
export async function getApiKeys(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const keys = await GameApiKeyModel.find({ gameId })
      .select('prefix name isActive lastUsedAt expiresAt createdAt')
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ keys })
  } catch (error) {
    console.error('API Key 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * DELETE /api/games/:gameId/api-keys/:keyId
 * API Key 삭제
 */
export async function deleteApiKey(req: AuthRequest, res: Response) {
  try {
    const { gameId, keyId } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const result = await GameApiKeyModel.findOneAndDelete({ _id: keyId, gameId })
    if (!result) return res.status(404).json({ message: 'API Key를 찾을 수 없습니다' })

    return res.json({ message: 'API Key가 삭제되었습니다' })
  } catch (error) {
    console.error('API Key 삭제 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * PUT /api/games/:gameId/api-keys/:keyId/regenerate
 * API Key 재발급
 */
export async function regenerateApiKey(req: AuthRequest, res: Response) {
  try {
    const { gameId, keyId } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const existing = await GameApiKeyModel.findOne({ _id: keyId, gameId })
    if (!existing) return res.status(404).json({ message: 'API Key를 찾을 수 없습니다' })

    const { fullKey, prefix, keyHash } = generateApiKey()
    existing.keyHash = keyHash
    existing.prefix = prefix
    await existing.save()

    return res.json({
      apiKey: fullKey,
      prefix,
      name: existing.name,
      message: 'API Key가 재발급되었습니다. 기존 키는 더 이상 사용할 수 없습니다.',
    })
  } catch (error) {
    console.error('API Key 재발급 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * PUT /api/games/:gameId/api-keys/:keyId/toggle
 * API Key 활성/비활성 토글
 */
export async function toggleApiKey(req: AuthRequest, res: Response) {
  try {
    const { gameId, keyId } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const key = await GameApiKeyModel.findOne({ _id: keyId, gameId })
    if (!key) return res.status(404).json({ message: 'API Key를 찾을 수 없습니다' })

    key.isActive = !key.isActive
    await key.save()

    return res.json({ isActive: key.isActive, message: `API Key가 ${key.isActive ? '활성화' : '비활성화'}되었습니다` })
  } catch (error) {
    console.error('API Key 토글 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}
