/**
 * Migration: PartnerProject 상태값 재구성
 *
 * 기존: draft / recruiting / ongoing / completed / cancelled (cancelled는 이미 별도 마이그레이션됨)
 * 신규: recruiting / matched(매칭성공) / unmatched(매칭실패)
 *
 * - draft      → recruiting (실제 등록 플로우는 항상 recruiting으로 생성되어 draft는 미사용 상태였음)
 * - ongoing    → matched    (지원자가 결정되어 진행 중이던 프로젝트 = 매칭 성공)
 * - completed  → unmatched  (모집은 끝났으나 지원자가 결정되지 않고 종료된 프로젝트 = 매칭 실패)
 *
 * 실행: cd apps/api && npx tsx ../../scripts/migrate-project-status-v2.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PartnerProjectModel as PartnerProject } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const draftResult = await PartnerProject.updateMany({ status: 'draft' }, { $set: { status: 'recruiting' } })
  console.log(`draft → recruiting: ${draftResult.modifiedCount}건`)

  const ongoingResult = await PartnerProject.updateMany({ status: 'ongoing' }, { $set: { status: 'matched' } })
  console.log(`ongoing → matched: ${ongoingResult.modifiedCount}건`)

  const completedResult = await PartnerProject.updateMany({ status: 'completed' }, { $set: { status: 'unmatched' } })
  console.log(`completed → unmatched: ${completedResult.modifiedCount}건`)

  console.log('\n마이그레이션 완료')
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('마이그레이션 실패:', err)
  process.exit(1)
})
