import mongoose from 'mongoose'
import {
  GamePointPolicyModel,
  GamePointLogModel,
  GameModel,
  UserModel,
} from '@gameup/db'
import type { GamePointType } from '@gameup/db'
import { grantPoints } from './pointService'
import { consumeBalance } from './developerBalanceService'
import { SimpleCache } from '../utils/SimpleCache'

type GamePolicyEntry = {
  amount: number
  multiplier: number
  dailyLimit: number | null
  isActive: boolean
  startDate: Date | null
  endDate: Date | null
}

const gamePolicyCache = new SimpleCache<GamePolicyEntry>(3 * 60 * 1000)

function cacheKey(gameId: string, type: string) {
  return `${gameId}:${type}`
}

async function getGamePolicy(gameId: string, type: GamePointType) {
  if (!gamePolicyCache.isExpired()) {
    return gamePolicyCache.get(cacheKey(gameId, type))
  }
  // 캐시 리프레시 - 승인된 정책만
  const policies = await GamePointPolicyModel.find({
    approvalStatus: 'approved',
  }).lean()
  for (const p of policies) {
    gamePolicyCache.set(cacheKey(p.gameId.toString(), p.type), {
      amount: p.amount,
      multiplier: p.multiplier ?? 1,
      dailyLimit: p.dailyLimit ?? null,
      isActive: p.isActive,
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
    })
  }
  gamePolicyCache.markRefreshed()
  return gamePolicyCache.get(cacheKey(gameId, type))
}

export function invalidateGamePolicyCache() {
  gamePolicyCache.invalidate()
}

/**
 * 게임 일일 한도 체크
 */
async function getGameDailyEarned(userId: string, gameId: string, type: GamePointType): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await GamePointLogModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        gameId: new mongoose.Types.ObjectId(gameId),
        type,
        createdAt: { $gte: todayStart },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  return result[0]?.total || 0
}

/**
 * 게임→플랫폼 포인트 지급 (외부 API용)
 */
export async function grantGamePoint(
  gameId: string,
  userId: string,
  type: GamePointType,
  metadata?: Record<string, unknown>,
  apiKey?: string
): Promise<{
  success: boolean
  amount: number
  message: string
  newScore?: number
  newLevel?: number
  remainingBalance?: number
} | null> {
  // 1. 게임 존재 및 승인 상태 확인
  const game = await GameModel.findById(gameId).select('title approvalStatus status developerId').lean()
  if (!game) {
    return { success: false, amount: 0, message: '게임을 찾을 수 없습니다' }
  }
  if (game.approvalStatus !== 'approved') {
    return { success: false, amount: 0, message: '승인되지 않은 게임입니다' }
  }

  // 2. 유저 확인
  const user = await UserModel.findById(userId).select('isActive bannedUntil').lean()
  if (!user || !user.isActive) {
    return { success: false, amount: 0, message: '유효하지 않은 사용자입니다' }
  }
  if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
    return { success: false, amount: 0, message: '정지된 사용자입니다' }
  }

  // 3. 정책 조회
  const policy = await getGamePolicy(gameId, type)
  if (!policy || !policy.isActive) {
    return { success: false, amount: 0, message: '해당 포인트 정책이 비활성 상태입니다' }
  }

  // 3.5 기간 검증
  const now = new Date()
  if (policy.startDate && now < new Date(policy.startDate)) {
    return { success: false, amount: 0, message: '포인트 지급 기간이 아직 시작되지 않았습니다' }
  }
  if (policy.endDate && now > new Date(policy.endDate)) {
    return { success: false, amount: 0, message: '포인트 지급 기간이 종료되었습니다' }
  }

  // 4. 포인트 계산
  let amount = policy.amount
  if (type === 'game_play_time' && metadata?.minutes) {
    amount = Math.floor((metadata.minutes as number) * policy.multiplier)
    if (amount < 1) return { success: false, amount: 0, message: '적립 가능한 최소 포인트에 미달합니다' }
  } else if (type === 'game_purchase' && metadata?.amount) {
    amount = Math.floor((metadata.amount as number) * policy.multiplier)
    if (amount < 1) return { success: false, amount: 0, message: '적립 가능한 최소 포인트에 미달합니다' }
  } else if (type === 'game_ranking' && metadata?.rank) {
    const rankMultiplier = metadata.rankMultiplier as number || 1
    amount = Math.floor(policy.amount * rankMultiplier)
  } else if (type === 'game_level_achieve') {
    // 레벨 도달: 기본 amount 사용, metadata.level로 중복 체크
    amount = policy.amount
  }

  // 5. 중복 체크 (계정 생성 1회)
  if (type === 'game_account_create') {
    const existing = await GamePointLogModel.findOne({
      gameId: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      type: 'game_account_create',
    })
    if (existing) {
      return { success: false, amount: 0, message: '이미 계정 생성 보상을 받았습니다' }
    }
  }

  // 5.5 레벨 도달 중복 체크 (레벨별 1회)
  if (type === 'game_level_achieve' && metadata?.level) {
    const existing = await GamePointLogModel.findOne({
      gameId: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      type: 'game_level_achieve',
      'metadata.level': metadata.level,
    })
    if (existing) {
      return { success: false, amount: 0, message: `레벨 ${metadata.level} 보상을 이미 받았습니다` }
    }
  }

  // 6. 일일 한도 체크
  if (policy.dailyLimit) {
    const dailyEarned = await getGameDailyEarned(userId, gameId, type)
    if (dailyEarned >= policy.dailyLimit) {
      return { success: false, amount: 0, message: '일일 포인트 한도에 도달했습니다' }
    }
    const remaining = policy.dailyLimit - dailyEarned
    if (amount > remaining) {
      amount = remaining
    }
  }

  // 7. 일일 로그인 중복 체크
  if (type === 'game_daily_login') {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const existing = await GamePointLogModel.findOne({
      gameId: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      type: 'game_daily_login',
      createdAt: { $gte: todayStart },
    })
    if (existing) {
      return { success: false, amount: 0, message: '오늘 이미 접속 보상을 받았습니다' }
    }
  }

  // 8. 개발사 포인트 잔액 차감
  const developerId = game.developerId.toString()
  const consumeResult = await consumeBalance(
    developerId,
    amount,
    `${game.title} - ${type} (${userId})`,
    gameId,
    userId,
    type
  )
  if (!consumeResult.success) {
    return { success: false, amount: 0, message: consumeResult.message }
  }

  // 9. GamePointLog 기록
  await GamePointLogModel.create({
    gameId: new mongoose.Types.ObjectId(gameId),
    userId: new mongoose.Types.ObjectId(userId),
    type,
    amount,
    metadata,
    apiKeyUsed: apiKey,
  })

  // 10. 플랫폼 ActivityScore + 레벨 갱신
  const reason = `게임 연동 포인트: ${game.title} (${type})`
  const result = await grantPoints(userId, type, reason, gameId, amount)

  if (!result) {
    return { success: false, amount: 0, message: '포인트 적립에 실패했습니다' }
  }

  return {
    success: true,
    amount,
    message: `${amount}P 적립 완료`,
    newScore: result.newScore,
    newLevel: result.newLevel,
    remainingBalance: consumeResult.balance,
  }
}

/**
 * 게임별 포인트 통계 조회
 */
export async function getGamePointStats(gameId: string) {
  const stats = await GamePointLogModel.aggregate([
    { $match: { gameId: new mongoose.Types.ObjectId(gameId) } },
    {
      $group: {
        _id: '$type',
        totalPoints: { $sum: '$amount' },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        type: '$_id',
        totalPoints: 1,
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
      },
    },
  ])

  const totalPoints = stats.reduce((s, t) => s + t.totalPoints, 0)
  const totalTransactions = stats.reduce((s, t) => s + t.count, 0)

  return { stats, totalPoints, totalTransactions }
}
