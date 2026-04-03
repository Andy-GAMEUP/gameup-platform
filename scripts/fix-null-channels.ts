/**
 * null 채널 게시글을 'free'로 수정하는 스크립트
 */
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

async function fix() {
  await mongoose.connect(MONGO_URI)
  console.log('📦 MongoDB 연결 성공')

  const db = mongoose.connection.db
  if (!db) throw new Error('DB 연결 실패')

  const result = await db.collection('posts').updateMany(
    { $or: [{ channel: null }, { channel: { $exists: false } }, { channel: '' }] },
    { $set: { channel: 'free' } }
  )
  console.log(`✅ null/빈 채널 → free 변경: ${result.modifiedCount}개`)

  console.log('\n📊 최종 채널별 게시글 수:')
  const stats = await db.collection('posts').aggregate([
    { $group: { _id: '$channel', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray()
  stats.forEach(s => console.log(`  ${s._id}: ${s.count}개`))

  await mongoose.disconnect()
  console.log('📦 MongoDB 연결 해제')
}

fix()
