/**
 * "좀비 우다다" 게임 커뮤니티 탭 테스트용 샘플 데이터
 * - 게임 공지(GameAnnouncement) 50개
 * - 게시물(Post, channel=live-game) 100개
 * 실행: npx tsx src/scripts/seed-zombie-wooddada-sample.ts
 * 재실행 시 이전에 이 스크립트가 만든 [샘플] 데이터만 삭제 후 다시 생성 (멱등)
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
import { GameModel, GameAnnouncementModel, PostModel, UserModel } from '@gameup/db'

const GAME_ID = '6a336acaacbdf0e30cf9ff6d'
const TITLE_MARK = '[샘플]'

const ANN_TYPES = ['notice', 'update', 'maintenance', 'event'] as const
const ANN_PRIORITIES = ['high', 'normal', 'low'] as const

const sampleImages = [
  'https://picsum.photos/seed/zombie1/400/400',
  'https://picsum.photos/seed/zombie2/400/400',
  'https://picsum.photos/seed/zombie3/400/400',
  'https://picsum.photos/seed/zombie4/400/400',
  'https://picsum.photos/seed/zombie5/400/400',
]

function randomPastDate(maxDaysAgo: number): Date {
  const ms = Math.random() * maxDaysAgo * 24 * 3600000
  return new Date(Date.now() - ms)
}

function fakeUserIds(count: number): mongoose.Types.ObjectId[] {
  return Array.from({ length: count }, () => new mongoose.Types.ObjectId())
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'
  await mongoose.connect(uri)
  console.log('📦 MongoDB 연결:', uri)

  const game = await GameModel.findById(GAME_ID)
  if (!game) throw new Error(`게임을 찾을 수 없습니다: ${GAME_ID}`)
  console.log(`🎮 대상 게임: ${game.title} (${game.serviceType})`)

  const developerId = game.developerId
  const users = await UserModel.find({}).select('_id role')
  if (users.length === 0) throw new Error('유저가 없습니다')
  const authorPool = users.map(u => u._id)

  // 기존 샘플 데이터 정리 (재실행 대비)
  const delAnn = await GameAnnouncementModel.deleteMany({ gameId: GAME_ID, title: { $regex: `^${TITLE_MARK.replace(/[[\]]/g, '\\$&')}` } })
  const delPosts = await PostModel.deleteMany({ gameId: GAME_ID, title: { $regex: `^${TITLE_MARK.replace(/[[\]]/g, '\\$&')}` } })
  console.log(`🗑️ 기존 샘플 삭제: 공지 ${delAnn.deletedCount}개, 게시물 ${delPosts.deletedCount}개`)

  // ── 공지 50개 ──
  const announcements = Array.from({ length: 50 }, (_, i) => {
    const n = i + 1
    const type = ANN_TYPES[i % ANN_TYPES.length]
    const createdAt = randomPastDate(90)
    return {
      gameId: game._id,
      developerId,
      title: `${TITLE_MARK} 좀비 우다다 공지 ${String(n).padStart(3, '0')}`,
      content: `<p>좀비 우다다 테스트용 샘플 공지 내용입니다. (${n}번째)</p>`,
      type,
      priority: ANN_PRIORITIES[i % ANN_PRIORITIES.length],
      sendPush: false,
      recipients: 0,
      views: Math.floor(Math.random() * 2000),
      createdAt,
      updatedAt: createdAt,
    }
  })
  const annResult = await GameAnnouncementModel.insertMany(announcements)
  console.log(`✅ 게임 공지 ${annResult.length}개 생성 완료`)

  // ── 게시물 100개 ──
  const posts = Array.from({ length: 100 }, (_, i) => {
    const n = i + 1
    const createdAt = randomPastDate(60)
    const hasImage = i % 3 === 0 // 100개 중 약 1/3만 썸네일 있음 (있는/없는 케이스 둘 다 테스트)
    const likeCount = Math.floor(Math.random() * 500)
    const author = authorPool[Math.floor(Math.random() * authorPool.length)]
    return {
      title: `${TITLE_MARK} 좀비 우다다 게시물 ${String(n).padStart(3, '0')}`,
      content: `<p>좀비 우다다 테스트용 샘플 게시물 내용입니다. (${n}번째)</p>`,
      author,
      gameId: game._id,
      channel: 'live-game' as const,
      images: hasImage ? [sampleImages[i % sampleImages.length]] : [],
      thumbnailIndex: 0,
      videoUrl: '',
      tags: ['dummy-seed', 'zombie-wooddada-sample'],
      likes: fakeUserIds(likeCount),
      views: Math.floor(Math.random() * 3000),
      commentCount: Math.floor(Math.random() * 60),
      status: 'active' as const,
      isHot: Math.random() < 0.15,
      hotScore: Math.random() * 60,
      reportCount: 0,
      reports: [],
      createdAt,
      updatedAt: createdAt,
    }
  })
  const postResult = await PostModel.insertMany(posts)
  console.log(`✅ 게시물 ${postResult.length}개 생성 완료`)

  console.log('\n🎉 완료! /community?channel=live-game&gameId=' + GAME_ID + '&gameTitle=' + encodeURIComponent(game.title) + '&gameServiceType=live 에서 확인하세요.')
}

main()
  .catch(err => { console.error('❌ 실패:', err); process.exitCode = 1 })
  .finally(async () => { await mongoose.disconnect() })
