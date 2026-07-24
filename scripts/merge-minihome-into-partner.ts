/**
 * 미니홈(MiniHome) 프로필 관리 필드를 파트너(Partner/내채널)로 병합
 *
 * 배경: 파트너 매칭에 필요한 프로필 정보(소개, 포트폴리오, 경력/자격증, 연락처, 게임 목록)가
 * MiniHome 컬렉션에, 채널 자체 정보는 Partner 컬렉션에 나뉘어 있던 것을 Partner로 흡수한다.
 * MiniHome 컬렉션 자체는 삭제하지 않는다(뉴스피드/제안함/공개 미니홈 디렉토리는 계속 MiniHome을 사용).
 *
 * 실행: cd apps/api && npx tsx ../../scripts/merge-minihome-into-partner.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PartnerModel as Partner, MiniHomeModel as MiniHome, MiniHomeGameModel as MiniHomeGame } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

const EXPERTISE_OPTIONS = ['게임개발', '퍼블리싱', '게임솔루션', 'QA/테스팅', '마케팅', '로컬라이제이션', '사운드', '아트/그래픽']

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공\n')

  const minihomes = await MiniHome.find()
  let merged = 0
  let skippedNoPartner = 0

  for (const mh of minihomes) {
    const partner = await Partner.findOne({ userId: mh.userId })
    if (!partner) {
      skippedNoPartner++
      console.log(`Partner 없음(스킵): userId=${mh.userId} (${mh.companyName})`)
      continue
    }

    if (mh.companyName) partner.displayNameOverride = mh.companyName
    if (!partner.introduction && mh.introduction) partner.introduction = mh.introduction
    if (mh.website) partner.website = mh.website
    if (mh.tags?.length) partner.tags = mh.tags
    if (mh.keywords?.length) partner.keywords = mh.keywords

    const droppedExpertise = (mh.expertiseArea || []).filter(e => !EXPERTISE_OPTIONS.includes(e))
    const keptExpertise = (mh.expertiseArea || []).filter(e => EXPERTISE_OPTIONS.includes(e))
    if (keptExpertise.length) partner.expertiseArea = keptExpertise
    if (droppedExpertise.length) console.log(`  전문분야 값 폐기(영문 토큰 등): userId=${mh.userId} → ${droppedExpertise.join(', ')}`)

    if (mh.skills?.length) partner.skills = mh.skills
    if (mh.hourlyRate) partner.hourlyRate = mh.hourlyRate
    if (mh.availability) partner.availability = mh.availability
    if (mh.location) partner.location = mh.location
    if (mh.isVerified) partner.isVerified = mh.isVerified
    if (mh.rating) partner.rating = mh.rating
    if (mh.reviewCount) partner.reviewCount = mh.reviewCount
    partner.completedProjectCount = Math.max(mh.completedProjectCount || 0, partner.completedProjectCount || 0)
    if (mh.portfolio?.length) partner.portfolio = mh.portfolio as any
    if (mh.certifications?.length) partner.certifications = mh.certifications as any
    if (mh.workExperience?.length) partner.workExperience = mh.workExperience as any
    if (mh.contactEmail) partner.contactEmail = mh.contactEmail
    if (mh.contactPhone) partner.contactPhone = mh.contactPhone
    if (mh.coverImage) partner.coverImage = mh.coverImage
    if (mh.representativeGameId) partner.representativeGameId = mh.representativeGameId as any

    await partner.save()
    console.log(`병합됨: ${mh.companyName} (userId=${mh.userId})`)
    merged++
  }

  console.log(`\nMiniHome → Partner 병합 완료 — 병합 ${merged}건, Partner 없음(스킵) ${skippedNoPartner}건`)

  const games = await MiniHomeGame.find({ partnerId: null })
  let relinked = 0
  let orphaned = 0

  for (const game of games) {
    const mh = game.minihomeId ? await MiniHome.findById(game.minihomeId) : null
    const partner = mh ? await Partner.findOne({ userId: mh.userId }) : null
    if (!partner) {
      orphaned++
      console.log(`고아 게임(스킵): ${game._id} (${game.title})`)
      continue
    }
    game.partnerId = partner._id as any
    await game.save()
    relinked++
  }

  console.log(`\n게임 재연결 완료 — 재연결 ${relinked}건, 고아 ${orphaned}건`)

  await mongoose.disconnect()
}

migrate().catch(err => {
  console.error('마이그레이션 실패:', err)
  process.exit(1)
})
