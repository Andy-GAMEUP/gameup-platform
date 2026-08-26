/**
 * 홈 탭 "자유게시판" 카드 테스트용 샘플 데이터 (Post, channel=free) 20개
 * 실행: npx tsx src/scripts/seed-free-board-sample.ts
 * 재실행 시 이전에 이 스크립트가 만든 [샘플] 데이터만 삭제 후 다시 생성 (멱등)
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
import { PostModel, UserModel } from '@gameup/db'

const TITLE_MARK = '[샘플]'

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

  const users = await UserModel.find({}).select('_id role')
  if (users.length === 0) throw new Error('유저가 없습니다')
  const authorPool = users.map(u => u._id)

  const delPosts = await PostModel.deleteMany({ channel: 'free', title: { $regex: `^${TITLE_MARK.replace(/[[\]]/g, '\\$&')}` } })
  console.log(`🗑️ 기존 샘플 삭제: 게시물 ${delPosts.deletedCount}개`)

  const posts = Array.from({ length: 20 }, (_, i) => {
    const n = i + 1
    const createdAt = randomPastDate(30)
    const author = authorPool[Math.floor(Math.random() * authorPool.length)]
    const likeCount = Math.floor(Math.random() * 100)
    return {
      title: `${TITLE_MARK} 자유게시판 글 ${String(n).padStart(3, '0')}`,
      content: `<p>자유게시판 테스트용 샘플 게시물 내용입니다. (${n}번째)</p>`,
      author,
      channel: 'free' as const,
      images: [],
      thumbnailIndex: 0,
      videoUrl: '',
      tags: ['dummy-seed', 'free-board-sample'],
      likes: fakeUserIds(likeCount),
      views: Math.floor(Math.random() * 1000),
      commentCount: Math.floor(Math.random() * 30),
      status: 'active' as const,
      isHot: false,
      hotScore: Math.random() * 20,
      reportCount: 0,
      reports: [],
      createdAt,
      updatedAt: createdAt,
    }
  })
  const postResult = await PostModel.insertMany(posts)
  console.log(`✅ 자유게시판 게시물 ${postResult.length}개 생성 완료`)
  console.log('\n🎉 완료! /community?channel=free 에서 확인하세요.')
}

main()
  .catch(err => { console.error('❌ 실패:', err); process.exitCode = 1 })
  .finally(async () => { await mongoose.disconnect() })
