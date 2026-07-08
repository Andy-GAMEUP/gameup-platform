/**
 * Backfill: 승인된 기업회원(Partner 채널)은 있지만 MiniHome(파트너 찾기 디렉토리 노출용)이 없는 계정에
 * MiniHome을 자동 생성한다.
 *
 * 배경: 기존에는 /minihome-manage에서 수동으로 미니홈을 만들어야만 /partner/directory에 노출됐음.
 * 이제 신규 승인 건은 apps/api/src/controllers/partnerController.ts의 getMyPartnerStatus에서
 * Partner 채널 생성과 동시에 MiniHome도 자동 생성되지만, 이미 존재하는 Partner 채널은 반영되지 않으므로
 * 1회성으로 백필한다.
 *
 * 실행: cd apps/api && npx tsx ../../scripts/backfill-minihome-for-partners.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PartnerModel as Partner, MiniHomeModel as MiniHome, UserModel as User } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function backfill() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const partners = await Partner.find({ status: 'approved' })
  let created = 0
  let skipped = 0

  for (const partner of partners) {
    const existing = await MiniHome.findOne({ userId: partner.userId })
    if (existing) {
      skipped++
      continue
    }

    const user = await User.findById(partner.userId).select('companyInfo email username')
    if (!user) {
      skipped++
      continue
    }

    const companyInfo = (user as any).companyInfo
    await MiniHome.create({
      userId: partner.userId,
      companyName: companyInfo?.companyName || user.username,
      isPublic: partner.isProfilePublic !== false,
      website: companyInfo?.homepageUrl || '',
      contactEmail: companyInfo?.companyEmail || user.email,
      contactPhone: companyInfo?.phone || '',
    })
    console.log(`생성됨: ${companyInfo?.companyName || user.username} (userId=${partner.userId})`)
    created++
  }

  console.log(`\n완료 — 생성 ${created}건, 스킵(이미 존재) ${skipped}건`)
  await mongoose.disconnect()
}

backfill().catch(err => {
  console.error('백필 실패:', err)
  process.exit(1)
})
