/**
 * 게임 포인트 시스템 테스트 더미 데이터 시드 스크립트
 *
 * 실행: cd apps/api && npx tsx ../../scripts/seed-game-point-system.ts
 *
 * 생성되는 데이터:
 * 1. 포인트 상품 패키지 4개
 * 2. 개발사 포인트 잔액 (developer@test.com)
 * 3. 게임 포인트 정책 (최초 승인된 게임에 7개 정책)
 * 4. API Key 1개
 */

import mongoose from 'mongoose'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env.local') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

async function seed() {
  console.log('=== 게임 포인트 시스템 시드 시작 ===')
  console.log('MongoDB:', MONGO_URI)

  await mongoose.connect(MONGO_URI)
  const db = mongoose.connection.db!

  // 1. 개발사 유저 찾기
  const devUser = await db.collection('users').findOne({ email: 'developer@test.com' })
  if (!devUser) {
    console.error('developer@test.com 계정을 찾을 수 없습니다. 먼저 seed를 실행하세요.')
    process.exit(1)
  }
  const developerId = devUser._id
  console.log(`개발사 유저: ${devUser.username} (${developerId})`)

  // 플레이어 유저 찾기
  const playerUser = await db.collection('users').findOne({ email: 'player@test.com' })
  if (!playerUser) {
    console.error('player@test.com 계정을 찾을 수 없습니다.')
    process.exit(1)
  }
  const playerId = playerUser._id
  console.log(`플레이어 유저: ${playerUser.username} (${playerId})`)

  // 관리자 찾기
  const adminUser = await db.collection('users').findOne({ email: 'admin@gameup.com' })
  if (!adminUser) {
    console.error('admin@gameup.com 계정을 찾을 수 없습니다.')
    process.exit(1)
  }
  const adminId = adminUser._id

  // 개발사의 게임 찾기
  const game = await db.collection('games').findOne({ developerId })
  if (!game) {
    console.error('개발사의 게임을 찾을 수 없습니다.')
    process.exit(1)
  }
  const gameId = game._id
  console.log(`게임: ${game.title} (${gameId})`)

  // ── 1. 포인트 상품 패키지 ──────────────────────────────────────
  console.log('\n[1/5] 포인트 상품 패키지 생성...')
  await db.collection('pointpackages').deleteMany({})
  const packages = [
    { name: '스타터 패키지', points: 1000, price: 10000, unitPrice: 10.0, description: '처음 시작하는 개발사를 위한 패키지', isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { name: '베이직 패키지', points: 5000, price: 45000, unitPrice: 9.0, description: '소규모 게임에 적합한 패키지', isActive: true, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { name: '프로 패키지', points: 20000, price: 160000, unitPrice: 8.0, description: '중규모 게임에 적합한 패키지', isActive: true, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { name: '엔터프라이즈 패키지', points: 100000, price: 700000, unitPrice: 7.0, description: '대규모 운영을 위한 최고 가성비 패키지', isActive: true, sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
  ]
  const pkgResult = await db.collection('pointpackages').insertMany(packages)
  console.log(`  ${Object.keys(pkgResult.insertedIds).length}개 상품 생성 완료`)

  // ── 2. 개발사 포인트 잔액 ──────────────────────────────────────
  console.log('\n[2/5] 개발사 포인트 잔액 설정...')
  await db.collection('developerpointbalances').deleteMany({ developerId })
  await db.collection('developerpointbalances').insertOne({
    developerId,
    balance: 50000,
    totalPurchased: 50000,
    totalUsed: 0,
    lastPurchasedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // 충전 거래 내역
  await db.collection('developerpointtransactions').deleteMany({ developerId })
  await db.collection('developerpointtransactions').insertOne({
    developerId,
    type: 'purchase',
    amount: 50000,
    balance: 50000,
    description: '포인트 구매: 프로 패키지 (20,000P) + 베이직 패키지 (5,000P) x6',
    packageId: Object.values(pkgResult.insertedIds)[2],
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log('  잔액: 50,000P 설정 완료')

  // ── 3. 게임 포인트 정책 ────────────────────────────────────────
  console.log('\n[3/5] 게임 포인트 정책 생성 (7개 타입)...')
  await db.collection('gamepointpolicies').deleteMany({ gameId })

  const now = new Date()
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const policyDefs = [
    { type: 'game_account_create', label: '게임 계정 생성 보상', description: '게임 최초 가입 시 5P 지급', amount: 5, multiplier: 1, dailyLimit: null, startDate: null, endDate: null, estimatedDailyUsage: 50, developerNote: '신규 유저 유입을 위한 보상입니다' },
    { type: 'game_daily_login', label: '일일 접속 보상', description: '매일 접속 시 1P 지급', amount: 1, multiplier: 1, dailyLimit: 1, startDate: null, endDate: null, estimatedDailyUsage: 500, developerNote: '일일 활성 유저 유지 목적' },
    { type: 'game_play_time', label: '플레이 시간 보상', description: '플레이 시간 기반 포인트 (분 × 0.5)', amount: 1, multiplier: 0.5, dailyLimit: 30, startDate: null, endDate: null, estimatedDailyUsage: 2000, developerNote: '장시간 플레이 유도' },
    { type: 'game_purchase', label: '결제 보상', description: '결제 금액 기반 포인트 (금액 × 0.01)', amount: 1, multiplier: 0.01, dailyLimit: null, startDate: null, endDate: null, estimatedDailyUsage: 100, developerNote: '인앱 결제 촉진' },
    { type: 'game_event_participate', label: '이벤트 참여 보상', description: '게임 내 이벤트 참여 시 3P 지급', amount: 3, multiplier: 1, dailyLimit: 10, startDate: now, endDate: oneMonthLater, estimatedDailyUsage: 300, developerNote: '시즌 이벤트 기간 한정' },
    { type: 'game_level_achieve', label: '레벨 도달 보상', description: '특정 레벨 도달 시 5P 지급', amount: 5, multiplier: 1, dailyLimit: null, startDate: null, endDate: null, estimatedDailyUsage: 80, developerNote: '레벨 10, 20, 30, 50, 100 도달 시' },
    { type: 'game_ranking', label: '랭킹 보상', description: 'TOP 100 랭커에게 10P 지급', amount: 10, multiplier: 1, dailyLimit: null, startDate: null, endDate: null, estimatedDailyUsage: 50, developerNote: '주간 랭킹 보상' },
  ]

  const policyDocs = policyDefs.map(p => ({
    gameId,
    developerId,
    ...p,
    conditionConfig: p.type === 'game_level_achieve' ? { levels: [10, 20, 30, 50, 100] } : null,
    isActive: true,
    approvalStatus: 'approved',
    approvedAt: now,
    approvedBy: adminId,
    createdAt: now,
    updatedAt: now,
  }))

  await db.collection('gamepointpolicies').insertMany(policyDocs)
  console.log(`  ${policyDocs.length}개 정책 생성 완료 (모두 approved + active)`)

  // ── 4. API Key ─────────────────────────────────────────────────
  console.log('\n[4/5] API Key 생성...')
  await db.collection('gameapikeys').deleteMany({ gameId })

  const prefix = 'gup_' + crypto.randomBytes(4).toString('hex')
  const secret = crypto.randomBytes(16).toString('hex')
  const fullKey = `${prefix}_${secret}`
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')

  await db.collection('gameapikeys').insertOne({
    gameId,
    developerId,
    keyHash,
    prefix,
    name: '테스트 서버 키',
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  })
  console.log(`  API Key 생성 완료`)
  console.log(`  ┌────────────────────────────────────────────────┐`)
  console.log(`  │ Full Key: ${fullKey}`)
  console.log(`  │ Prefix:   ${prefix}`)
  console.log(`  └────────────────────────────────────────────────┘`)

  // ── 5. 테스트용 포인트 로그 (시뮬레이션) ──────────────────────
  console.log('\n[5/5] 포인트 지급 로그 (더미 10건)...')
  await db.collection('gamepointlogs').deleteMany({ gameId })

  const logTypes = ['game_account_create', 'game_daily_login', 'game_daily_login', 'game_play_time', 'game_play_time', 'game_event_participate', 'game_level_achieve', 'game_level_achieve', 'game_ranking', 'game_purchase']
  const logAmounts = [5, 1, 1, 15, 10, 3, 5, 5, 10, 2]
  const logMetadata = [
    {},
    {},
    {},
    { minutes: 30 },
    { minutes: 20 },
    { eventName: '봄맞이 이벤트' },
    { level: 10 },
    { level: 20 },
    { rank: 15 },
    { amount: 200, itemName: '프리미엄 패스' },
  ]

  const logs = logTypes.map((type, i) => ({
    gameId,
    userId: playerId,
    type,
    amount: logAmounts[i],
    metadata: logMetadata[i],
    apiKeyUsed: fullKey,
    createdAt: new Date(now.getTime() - (10 - i) * 3600000),
    updatedAt: new Date(now.getTime() - (10 - i) * 3600000),
  }))

  await db.collection('gamepointlogs').insertMany(logs)

  // 잔액 차감 반영
  const totalUsed = logAmounts.reduce((a, b) => a + b, 0)
  await db.collection('developerpointbalances').updateOne(
    { developerId },
    { $inc: { balance: -totalUsed, totalUsed }, $set: { updatedAt: new Date() } }
  )
  console.log(`  ${logs.length}건 로그 생성, 잔액 ${totalUsed}P 차감`)

  // ── 결과 요약 ──────────────────────────────────────────────────
  const finalBalance = await db.collection('developerpointbalances').findOne({ developerId })
  console.log('\n════════════════════════════════════════════════════')
  console.log('  시드 완료 요약')
  console.log('════════════════════════════════════════════════════')
  console.log(`  포인트 상품: ${packages.length}개`)
  console.log(`  개발사 잔액: ${finalBalance?.balance?.toLocaleString()}P`)
  console.log(`  게임 정책:   ${policyDocs.length}개 (approved)`)
  console.log(`  API Key:     1개 (active)`)
  console.log(`  포인트 로그: ${logs.length}건`)
  console.log(``)
  console.log(`  게임: ${game.title}`)
  console.log(`  개발사: ${devUser.username} (${devUser.email})`)
  console.log(`  플레이어: ${playerUser.username} (${playerUser.email})`)
  console.log(``)
  console.log(`  API Key (테스트용): ${fullKey}`)
  console.log('════════════════════════════════════════════════════')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('시드 실패:', err)
  process.exit(1)
})
