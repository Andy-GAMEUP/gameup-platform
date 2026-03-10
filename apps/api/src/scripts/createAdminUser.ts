import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { UserModel as User } from '@gameup/db'
import { hashPassword } from '../services/authService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const createAdminUser = async () => {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'
    await mongoose.connect(mongoUri)
    console.log('MongoDB 연결 성공')

    // Admin 계정 정보
    const adminData = {
      email: 'admin@gameup.com',
      username: 'admin',
      password: 'admin123456',
      role: 'admin' as const
    }

    // 기존 admin 계정 확인
    const existingAdmin = await User.findOne({ email: adminData.email })
    
    if (existingAdmin) {
      console.log('⚠️  Admin 계정이 이미 존재합니다.')
      console.log('이메일:', existingAdmin.email)
      console.log('사용자명:', existingAdmin.username)
      console.log('역할:', existingAdmin.role)
      
      // 비밀번호 재설정 옵션
      const hashedPassword = await hashPassword(adminData.password)
      existingAdmin.password = hashedPassword
      await existingAdmin.save()
      console.log('\n✅ Admin 계정 비밀번호가 재설정되었습니다.')
    } else {
      // 비밀번호 해시화
      const hashedPassword = await hashPassword(adminData.password)

      // Admin 사용자 생성
      const adminUser = await User.create({
        email: adminData.email,
        username: adminData.username,
        password: hashedPassword,
        role: adminData.role
      })

      console.log('\n✅ Admin 계정이 성공적으로 생성되었습니다!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📧 이메일:', adminUser.email)
      console.log('👤 사용자명:', adminUser.username)
      console.log('🔑 비밀번호:', adminData.password)
      console.log('👔 역할:', adminUser.role)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    console.log('\n🔐 로그인 정보:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('이메일: admin@gameup.com')
    console.log('비밀번호: admin123456')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n로그인 URL: http://localhost:3000/login')

    await mongoose.connection.close()
    console.log('\nMongoDB 연결 종료')
    process.exit(0)
  } catch (error) {
    console.error('❌ Admin 계정 생성 중 오류 발생:', error)
    process.exit(1)
  }
}

createAdminUser()
