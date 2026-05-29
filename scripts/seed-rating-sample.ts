import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameModel as Game } from '@gameup/db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') })

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup'

async function main() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB 연결 성공')

  // 공개/베타 게임 중 첫 번째에 샘플 인증서 삽입
  const game = await Game.findOne({ status: { $in: ['beta', 'published'] } })

  if (!game) {
    console.log('공개된 게임이 없습니다. 먼저 게임을 등록하세요.')
    await mongoose.disconnect()
    return
  }

  ;(game as any).ratingCertificate = {
    ratingClass: '18세이용가',
    certNumber: '2024-게-18001',
    certDate: '2024-03-15',
    isVerified: true,
  }

  await game.save()
  console.log(`✅ "${game.title}" (${game._id}) 에 18세이용가 인증서 샘플 추가 완료`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
