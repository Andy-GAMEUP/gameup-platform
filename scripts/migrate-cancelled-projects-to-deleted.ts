/**
 * Migration: 기존 status='cancelled' 프로젝트를 삭제된 프로젝트(로그)로 이관
 *
 * - '취소' 상태는 관리자 UI에서 더 이상 선택 불가하며, "삭제 & 복구" 방식으로 대체됨
 * - 이미 cancelled로 저장된 프로젝트는 PartnerProjectDeletionLog로 스냅샷 이관 후 원본 삭제
 *
 * 실행: cd apps/api && npx tsx ../../scripts/migrate-cancelled-projects-to-deleted.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  PartnerProjectModel as PartnerProject,
  PartnerProjectDeletionLogModel as PartnerProjectDeletionLog,
} from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const cancelledProjects = await PartnerProject.find({ status: 'cancelled' }).populate('ownerId', 'username')
  console.log(`취소 상태 프로젝트 ${cancelledProjects.length}건 발견`)

  let migrated = 0
  for (const project of cancelledProjects) {
    const owner = project.ownerId as unknown as { _id: unknown; username?: string } | undefined

    await PartnerProjectDeletionLog.create({
      projectId: project._id,
      title: project.title,
      category: project.category,
      status: project.status,
      ownerId: owner?._id,
      ownerUsername: owner?.username,
      applicantCount: project.applicantCount,
      createdAt: project.createdAt,
      deletedBy: owner?._id,
      deletedByUsername: '시스템 (마이그레이션)',
      deletedAt: new Date(),
      projectSnapshot: project.toObject(),
    })

    await PartnerProject.findByIdAndDelete(project._id)
    migrated++
    console.log(`  이관 완료: "${project.title}" (${project._id})`)
  }

  console.log(`\n마이그레이션 완료: ${migrated}건 이관`)
  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('마이그레이션 실패:', err)
  process.exit(1)
})
