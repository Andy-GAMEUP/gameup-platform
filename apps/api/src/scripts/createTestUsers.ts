import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import User from '../models/User'
import { hashPassword } from '../services/authService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const createTestUsers = async () => {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'
    await mongoose.connect(mongoUri)
    console.log('MongoDB 연결 성공\n')

    // 테스트 계정 목록
    const testUsers = [
      {
        email: 'developer@test.com',
        username: 'testdev',
        password: 'test123456',
        role: 'developer' as const
      },
      {
        email: 'player@test.com',
        username: 'testplayer',
        password: 'test123456',
        role: 'player' as const
      }
    ]

    console.log('🔧 테스트 계정 생성 중...\n')

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email })
      
      if (existingUser) {
        console.log(`⚠️  ${userData.email} 계정이 이미 존재합니다. (비밀번호 재설정)`)
        const hashedPassword = await hashPassword(userData.password)
        existingUser.password = hashedPassword
        await existingUser.save()
      } else {
        const hashedPassword = await hashPassword(userData.password)
        await User.create({
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          role: userData.role
        })
        console.log(`✅ ${userData.email} 계정 생성 완료`)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 테스트 계정 목록')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n👨‍💻 개발자 계정:')
    console.log('   이메일: developer@test.com')
    console.log('   비밀번호: test123456')
    console.log('\n🎮 플레이어 계정:')
    console.log('   이메일: player@test.com')
    console.log('   비밀번호: test123456')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await mongoose.connection.close()
    console.log('MongoDB 연결 종료')
    process.exit(0)
  } catch (error) {
    console.error('❌ 테스트 계정 생성 중 오류 발생:', error)
    process.exit(1)
  }
}

createTestUsers()
