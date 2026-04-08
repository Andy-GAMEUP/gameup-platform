import mongoose from 'mongoose'
import {
  DeveloperPointBalanceModel,
  DeveloperPointTransactionModel,
} from '@gameup/db'

/**
 * 개발사 잔액 조회 (없으면 생성)
 */
export async function getOrCreateBalance(developerId: string) {
  const balance = await DeveloperPointBalanceModel.findOne({ developerId }).lean()
  if (!balance) {
    const created = await DeveloperPointBalanceModel.create({
      developerId: new mongoose.Types.ObjectId(developerId),
    })
    return created.toObject()
  }
  return balance
}

/**
 * 포인트 충전 (구매)
 */
export async function addBalance(
  developerId: string,
  amount: number,
  description: string,
  paymentId?: string,
  packageId?: string
): Promise<{ success: boolean; balance: number; message: string }> {
  if (amount <= 0) {
    return { success: false, balance: 0, message: '충전 금액은 0보다 커야 합니다' }
  }

  // 원자적 잔액 증가
  const result = await DeveloperPointBalanceModel.findOneAndUpdate(
    { developerId: new mongoose.Types.ObjectId(developerId) },
    {
      $inc: { balance: amount, totalPurchased: amount },
      $set: { lastPurchasedAt: new Date() },
      $setOnInsert: { developerId: new mongoose.Types.ObjectId(developerId) },
    },
    { upsert: true, new: true }
  )

  // 거래 이력
  await DeveloperPointTransactionModel.create({
    developerId: new mongoose.Types.ObjectId(developerId),
    type: 'purchase',
    amount,
    balance: result.balance,
    description,
    paymentId,
    packageId: packageId ? new mongoose.Types.ObjectId(packageId) : undefined,
  })

  return { success: true, balance: result.balance, message: `${amount}P 충전 완료` }
}

/**
 * 포인트 사용 (플레이어 지급 시 차감)
 * 원자적 처리로 잔액 음수 방지
 */
export async function consumeBalance(
  developerId: string,
  amount: number,
  description: string,
  gameId?: string,
  userId?: string,
  policyType?: string
): Promise<{ success: boolean; balance: number; message: string }> {
  if (amount <= 0) {
    return { success: false, balance: 0, message: '사용 금액은 0보다 커야 합니다' }
  }

  // 원자적: balance >= amount 일 때만 차감
  const result = await DeveloperPointBalanceModel.findOneAndUpdate(
    {
      developerId: new mongoose.Types.ObjectId(developerId),
      balance: { $gte: amount },
    },
    {
      $inc: { balance: -amount, totalUsed: amount },
    },
    { new: true }
  )

  if (!result) {
    // 잔액 부족
    const current = await getOrCreateBalance(developerId)
    return {
      success: false,
      balance: current?.balance ?? 0,
      message: `포인트 잔액이 부족합니다 (잔액: ${current?.balance ?? 0}P, 필요: ${amount}P)`,
    }
  }

  // 거래 이력
  await DeveloperPointTransactionModel.create({
    developerId: new mongoose.Types.ObjectId(developerId),
    type: 'consume',
    amount: -amount,
    balance: result.balance,
    description,
    relatedGameId: gameId ? new mongoose.Types.ObjectId(gameId) : undefined,
    relatedUserId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    pointPolicyType: policyType,
  })

  return { success: true, balance: result.balance, message: `${amount}P 사용` }
}

/**
 * 관리자 수동 잔액 조정
 */
export async function adminAdjustBalance(
  developerId: string,
  amount: number,
  description: string,
  type: 'admin_grant' | 'admin_deduct'
): Promise<{ success: boolean; balance: number; message: string }> {
  const adjustAmount = type === 'admin_grant' ? Math.abs(amount) : -Math.abs(amount)

  const result = await DeveloperPointBalanceModel.findOneAndUpdate(
    { developerId: new mongoose.Types.ObjectId(developerId) },
    {
      $inc: {
        balance: adjustAmount,
        ...(adjustAmount > 0 ? { totalPurchased: adjustAmount } : { totalUsed: Math.abs(adjustAmount) }),
      },
      $setOnInsert: { developerId: new mongoose.Types.ObjectId(developerId) },
    },
    { upsert: true, new: true }
  )

  // 음수 방지
  if (result.balance < 0) {
    result.balance = 0
    await result.save()
  }

  await DeveloperPointTransactionModel.create({
    developerId: new mongoose.Types.ObjectId(developerId),
    type,
    amount: adjustAmount,
    balance: result.balance,
    description,
  })

  return { success: true, balance: result.balance, message: `잔액 조정 완료 (${adjustAmount > 0 ? '+' : ''}${adjustAmount}P)` }
}
