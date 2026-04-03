import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

const gamePointPolicySchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  developerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, default: 1 },
  multiplier: { type: Number, default: 1 },
  dailyLimit: { type: Number, default: null },
  isActive: { type: Boolean, default: false },
  approvalStatus: { type: String, default: 'draft' },
}, { timestamps: true })

gamePointPolicySchema.index({ gameId: 1, type: 1 }, { unique: true })
const GamePointPolicy = mongoose.model('GamePointPolicy', gamePointPolicySchema)

const defaultPolicies = [
  { type: 'game_account_create', label: '게임 계정 생성', description: '게임 최초 가입 시 1회 지급', amount: 5, dailyLimit: null },
  { type: 'game_daily_login', label: '게임 일일 접속', description: '게임 접속 시 1일 1회 지급', amount: 1, dailyLimit: 1 },
  { type: 'game_play_time', label: '게임 플레이 시간', description: '플레이 시간 기반 포인트 (분 × multiplier)', amount: 1, multiplier: 0.1, dailyLimit: 100 },
  { type: 'game_purchase', label: '게임 결제 보상', description: '결제 금액 기반 포인트 (금액 × multiplier)', amount: 0, multiplier: 0.1, dailyLimit: null },
  { type: 'game_event_participate', label: '게임 이벤트 참여', description: '게임 이벤트 참여/완료 시 지급', amount: 3, dailyLimit: null },
  { type: 'game_ranking', label: '게임 랭킹 보상', description: '랭킹 달성 시 보상 포인트', amount: 10, dailyLimit: null },
]

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('MongoDB 연결됨')

  // 게임 ID와 개발사 ID를 인자로 받음
  const gameId = process.argv[2]
  const developerId = process.argv[3]

  if (!gameId || !developerId) {
    console.log('사용법: npx tsx scripts/seed-game-point-policies.ts <gameId> <developerId>')
    console.log('\n기본 정책 템플릿:')
    for (const p of defaultPolicies) {
      console.log(`  ${p.type}: ${p.label} (${p.amount}P, 배율: ${p.multiplier || 1}, 일일한도: ${p.dailyLimit ?? '무제한'})`)
    }
    await mongoose.disconnect()
    return
  }

  for (const p of defaultPolicies) {
    const result = await GamePointPolicy.findOneAndUpdate(
      { gameId, type: p.type },
      {
        $setOnInsert: {
          ...p,
          gameId,
          developerId,
          isActive: false,
          approvalStatus: 'draft',
        },
      },
      { upsert: true, new: true }
    )
    console.log(`  ${result.type}: ${result.label} (${result.amount}P) [${result.approvalStatus}]`)
  }

  console.log(`\n총 ${defaultPolicies.length}개 게임 포인트 정책 시드 완료`)
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('시드 실패:', err)
  process.exit(1)
})
