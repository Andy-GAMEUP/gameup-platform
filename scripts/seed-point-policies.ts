import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

const pointPolicySchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  description: { type: String, default: '' },
  amount: { type: Number, required: true, default: 1 },
  multiplier: { type: Number, default: 1 },
  dailyLimit: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const PointPolicy = mongoose.model('PointPolicy', pointPolicySchema)

const defaultPolicies = [
  { type: 'login', label: '일일 접속', description: '플랫폼 접속 시 1일 1회', amount: 1, dailyLimit: 1, isActive: true },
  { type: 'stay_time', label: '체류시간', description: '플랫폼 체류 시간 × 0.1', amount: 1, multiplier: 0.1, isActive: true },
  { type: 'post_write', label: '게시물 작성', description: '게시물 작성 시', amount: 1, isActive: true },
  { type: 'post_delete', label: '게시물 삭제', description: '게시물 삭제 시 차감', amount: 1, isActive: true },
  { type: 'comment_write', label: '댓글 작성', description: '댓글 작성 시', amount: 1, isActive: true },
  { type: 'comment_delete', label: '댓글 삭제', description: '댓글 삭제 시 차감', amount: 1, isActive: true },
  { type: 'recommend_received', label: '좋아요 수신', description: '게시물/댓글 좋아요 수신', amount: 1, isActive: true },
  { type: 'recommend_cancelled', label: '좋아요 취소', description: '좋아요 취소 시 차감', amount: 1, isActive: true },
  { type: 'game_access', label: '게임 접속', description: '게임 접속 시 게임별 1일 1회', amount: 1, dailyLimit: 10, isActive: true },
  { type: 'game_stay_time', label: '게임 체류시간', description: '게임 체류 시간 × 0.1', amount: 1, multiplier: 0.1, isActive: true },
  { type: 'game_event_reward', label: '게임 이벤트', description: '개발사 이벤트 보상', amount: 0, isActive: true },
  { type: 'game_payment_reward', label: '게임 결제 보상', description: '게임 최초 결제액 × 1/10', amount: 0, multiplier: 0.1, isActive: true },
]

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('MongoDB 연결됨')

  for (const p of defaultPolicies) {
    const result = await PointPolicy.findOneAndUpdate(
      { type: p.type },
      { $setOnInsert: p },
      { upsert: true, new: true }
    )
    console.log(`  ${result.type}: ${result.label} (${result.amount}P)`)
  }

  console.log(`\n총 ${defaultPolicies.length}개 포인트 정책 시드 완료`)
  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('시드 실패:', err)
  process.exit(1)
})
