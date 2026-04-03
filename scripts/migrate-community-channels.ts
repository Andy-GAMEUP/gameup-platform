/**
 * 커뮤니티 채널 마이그레이션 스크립트
 * 기존 7개 채널 → 4개 채널 (notice, free, beta-game, live-game)
 *
 * 매핑:
 *   notice     → notice (유지)
 *   general    → free
 *   dev        → free
 *   daily      → free
 *   game-talk  → free
 *   info-share → live-game
 *   new-game   → beta-game
 *
 * 실행: npx ts-node scripts/migrate-community-channels.ts
 */

import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

const channelMapping: Record<string, string> = {
  'general': 'free',
  'dev': 'free',
  'daily': 'free',
  'game-talk': 'free',
  'info-share': 'live-game',
  'new-game': 'beta-game',
  // notice는 유지
}

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('📦 MongoDB 연결 성공')

    const db = mongoose.connection.db
    if (!db) throw new Error('DB 연결 실패')
    const postsCol = db.collection('posts')

    // 현재 채널별 게시글 수 확인
    console.log('\n📊 마이그레이션 전 채널별 게시글 수:')
    const beforeStats = await postsCol.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
    beforeStats.forEach((s) => console.log(`  ${s._id}: ${s.count}개`))

    // 채널 마이그레이션 실행
    let totalUpdated = 0
    for (const [oldChannel, newChannel] of Object.entries(channelMapping)) {
      const result = await postsCol.updateMany(
        { channel: oldChannel },
        { $set: { channel: newChannel } }
      )
      if (result.modifiedCount > 0) {
        console.log(`\n✅ ${oldChannel} → ${newChannel}: ${result.modifiedCount}개 변경`)
        totalUpdated += result.modifiedCount
      }
    }

    // 마이그레이션 후 확인
    console.log('\n📊 마이그레이션 후 채널별 게시글 수:')
    const afterStats = await postsCol.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray()
    afterStats.forEach((s) => console.log(`  ${s._id}: ${s.count}개`))

    console.log(`\n🎉 마이그레이션 완료! 총 ${totalUpdated}개 게시글 변경됨`)
  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err)
  } finally {
    await mongoose.disconnect()
    console.log('📦 MongoDB 연결 해제')
  }
}

migrate()
