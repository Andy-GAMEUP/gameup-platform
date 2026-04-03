import mongoose from 'mongoose'
import {
  ActivityScoreModel,
  UserModel,
  LevelModel,
  PointPolicyModel,
  UserSessionModel,
} from '@gameup/db'
import type { ActivityScoreType } from '@gameup/db'

// Level 캐시 (TTL 5분)
let levelCache: { level: number; requiredScore: number }[] = []
let levelCacheTime = 0
const LEVEL_CACHE_TTL = 5 * 60 * 1000

// PointPolicy 캐시 (TTL 5분)
let policyCache: Map<string, { amount: number; multiplier: number; dailyLimit: number | null; isActive: boolean }> = new Map()
let policyCacheTime = 0
const POLICY_CACHE_TTL = 5 * 60 * 1000

async function getLevelTiers() {
  if (Date.now() - levelCacheTime < LEVEL_CACHE_TTL && levelCache.length > 0) {
    return levelCache
  }
  const levels = await LevelModel.find().sort({ requiredScore: -1 }).lean()
  levelCache = levels.map(l => ({ level: l.level, requiredScore: l.requiredScore }))
  levelCacheTime = Date.now()
  return levelCache
}

async function getPolicy(type: ActivityScoreType) {
  if (Date.now() - policyCacheTime < POLICY_CACHE_TTL && policyCache.size > 0) {
    return policyCache.get(type)
  }
  const policies = await PointPolicyModel.find().lean()
  policyCache = new Map()
  for (const p of policies) {
    policyCache.set(p.type, {
      amount: p.amount,
      multiplier: p.multiplier ?? 1,
      dailyLimit: p.dailyLimit ?? null,
      isActive: p.isActive,
    })
  }
  policyCacheTime = Date.now()
  return policyCache.get(type)
}

export function invalidatePolicyCache() {
  policyCacheTime = 0
  policyCache = new Map()
}

export function invalidateLevelCache() {
  levelCacheTime = 0
  levelCache = []
}

/**
 * 현재 포인트 기준으로 레벨 계산
 */
async function calculateLevel(activityScore: number): Promise<number> {
  const tiers = await getLevelTiers()
  for (const tier of tiers) {
    if (activityScore >= tier.requiredScore) {
      return tier.level
    }
  }
  return 1
}

/**
 * 일일 한도 체크 - 오늘 해당 타입으로 적립된 포인트 합산
 */
async function getDailyEarned(userId: string, type: ActivityScoreType): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await ActivityScoreModel.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type,
        amount: { $gt: 0 },
        createdAt: { $gte: todayStart },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  return result[0]?.total || 0
}

/**
 * 계정 상태 체크 (정지/비활성 계정은 포인트 적립 불가)
 */
async function isUserEligible(userId: string): Promise<boolean> {
  const user = await UserModel.findById(userId).select('isActive bannedUntil').lean()
  if (!user || !user.isActive) return false
  if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) return false
  return true
}

/**
 * 포인트 적립 + 레벨 갱신
 */
export async function grantPoints(
  userId: string,
  type: ActivityScoreType,
  reason: string,
  relatedId?: string,
  overrideAmount?: number
): Promise<{ success: boolean; amount: number; newScore: number; newLevel: number } | null> {
  // 계정 상태 체크
  if (!(await isUserEligible(userId))) return null

  // 정책 조회
  const policy = await getPolicy(type)
  const amount = overrideAmount ?? (policy?.amount ?? 1)

  // 비활성 정책이면 적립 불가 (관리자 수동 제외)
  if (type !== 'admin_grant' && policy && !policy.isActive) return null

  // 일일 한도 체크
  if (policy?.dailyLimit) {
    const dailyEarned = await getDailyEarned(userId, type)
    if (dailyEarned >= policy.dailyLimit) return null
  }

  // ActivityScore 이력 생성
  await ActivityScoreModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    amount,
    reason,
    type,
    relatedId: relatedId ? new mongoose.Types.ObjectId(relatedId) : undefined,
  })

  // User.activityScore 갱신
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { activityScore: amount } },
    { new: true }
  ).select('activityScore level')

  if (!user) return null

  // 최소값 0 보장
  if (user.activityScore < 0) {
    user.activityScore = 0
    await user.save()
  }

  // 레벨 재계산
  const newLevel = await calculateLevel(user.activityScore)
  if (newLevel !== user.level) {
    user.level = newLevel
    await user.save()
  }

  return {
    success: true,
    amount,
    newScore: user.activityScore,
    newLevel: newLevel,
  }
}

/**
 * 포인트 차감 + 레벨 갱신
 */
export async function deductPoints(
  userId: string,
  type: ActivityScoreType,
  reason: string,
  relatedId?: string,
  overrideAmount?: number
): Promise<{ success: boolean; amount: number; newScore: number; newLevel: number } | null> {
  const policy = await getPolicy(type)
  const deductAmount = overrideAmount ?? (policy?.amount ?? 1)

  // ActivityScore 이력 생성 (음수 금액)
  await ActivityScoreModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    amount: -deductAmount,
    reason,
    type,
    relatedId: relatedId ? new mongoose.Types.ObjectId(relatedId) : undefined,
  })

  // User.activityScore 갱신
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { activityScore: -deductAmount } },
    { new: true }
  ).select('activityScore level')

  if (!user) return null

  // 최소값 0 보장
  if (user.activityScore < 0) {
    user.activityScore = 0
    await user.save()
  }

  // 레벨 재계산
  const newLevel = await calculateLevel(user.activityScore)
  if (newLevel !== user.level) {
    user.level = newLevel
    await user.save()
  }

  return {
    success: true,
    amount: deductAmount,
    newScore: user.activityScore,
    newLevel: newLevel,
  }
}

/**
 * 일일 접속 포인트 (1일 1회)
 */
export async function grantLoginPoint(userId: string): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const alreadyGranted = await ActivityScoreModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    type: 'login',
    createdAt: { $gte: todayStart },
  })

  if (alreadyGranted) return false

  const result = await grantPoints(userId, 'login', '일일 접속 포인트')
  return !!result
}

/**
 * 게임 접속 포인트 (게임별 1일 1회)
 */
export async function grantGameAccessPoint(userId: string, gameId: string): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const alreadyGranted = await ActivityScoreModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    type: 'game_access',
    relatedId: new mongoose.Types.ObjectId(gameId),
    createdAt: { $gte: todayStart },
  })

  if (alreadyGranted) return false

  const result = await grantPoints(userId, 'game_access', '게임 접속 포인트', gameId)
  return !!result
}

/**
 * 체류시간 포인트 계산 및 적립
 * duration: 분 단위
 * 시간 × 0.1 = 포인트 (예: 60분 = 1시간 × 0.1 = 0.1 포인트)
 */
export async function grantStayTimePoints(
  userId: string,
  durationMinutes: number,
  type: 'stay_time' | 'game_stay_time' = 'stay_time',
  gameId?: string
): Promise<number> {
  const hours = durationMinutes / 60
  const points = Math.floor(hours * 10) / 10 // 소수점 1자리

  if (points < 0.1) return 0

  const pointsInt = Math.floor(points) // 정수 단위만 적립
  if (pointsInt < 1) return 0

  const reason = type === 'stay_time' ? '플랫폼 체류시간 포인트' : '게임 체류시간 포인트'
  await grantPoints(userId, type, reason, gameId, pointsInt)
  return pointsInt
}

/**
 * 세션 시작
 */
export async function startSession(
  userId: string,
  type: 'web' | 'game' = 'web',
  gameId?: string
): Promise<string> {
  // 기존 활성 세션 종료
  await endActiveSession(userId, type, gameId)

  const session = await UserSessionModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    gameId: gameId ? new mongoose.Types.ObjectId(gameId) : undefined,
    sessionStart: new Date(),
    lastHeartbeat: new Date(),
    isActive: true,
  })

  return session._id.toString()
}

/**
 * 세션 하트비트 (5분 간격)
 */
export async function heartbeatSession(sessionId: string): Promise<boolean> {
  const session = await UserSessionModel.findByIdAndUpdate(
    sessionId,
    {
      lastHeartbeat: new Date(),
      $inc: { duration: 5 }, // 5분 추가
    },
    { new: true }
  )
  return !!session
}

/**
 * 세션 종료 및 체류시간 포인트 적립
 */
export async function endSession(sessionId: string): Promise<number> {
  const session = await UserSessionModel.findById(sessionId)
  if (!session || !session.isActive) return 0

  const now = new Date()
  const totalMinutes = Math.floor((now.getTime() - session.sessionStart.getTime()) / 60000)

  session.sessionEnd = now
  session.duration = totalMinutes
  session.isActive = false

  const scoreType = session.type === 'game' ? 'game_stay_time' : 'stay_time'
  const points = await grantStayTimePoints(
    session.userId.toString(),
    totalMinutes,
    scoreType as 'stay_time' | 'game_stay_time',
    session.gameId?.toString()
  )

  session.pointsEarned = points
  await session.save()

  return points
}

/**
 * 기존 활성 세션 종료
 */
async function endActiveSession(userId: string, type: 'web' | 'game', gameId?: string) {
  const filter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
    type,
    isActive: true,
  }
  if (gameId) filter.gameId = new mongoose.Types.ObjectId(gameId)

  const activeSessions = await UserSessionModel.find(filter)
  for (const session of activeSessions) {
    await endSession(session._id.toString())
  }
}

/**
 * 레벨 재계산 (관리자 레벨 변경 시 전체 재계산)
 */
export async function recalculateAllLevels(): Promise<number> {
  invalidateLevelCache()
  const users = await UserModel.find({ isActive: true }).select('_id activityScore level')
  let updatedCount = 0

  for (const user of users) {
    const newLevel = await calculateLevel(user.activityScore || 0)
    if (newLevel !== user.level) {
      user.level = newLevel
      await user.save()
      updatedCount++
    }
  }

  // Level memberCount 갱신
  const tiers = await getLevelTiers()
  for (const tier of tiers) {
    const count = await UserModel.countDocuments({ level: tier.level, isActive: true })
    await LevelModel.updateOne({ level: tier.level }, { memberCount: count })
  }

  return updatedCount
}
