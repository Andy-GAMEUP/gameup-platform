import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameup-betazone'

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully')
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB 연결이 끊겼습니다. 재연결 시도 중...')
      setTimeout(() => connectDB(), 5000)
    })

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 연결 오류:', err)
    })

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
  } catch (error) {
    console.error('MongoDB 초기 연결 실패:', error)
    process.exit(1)
  }
}

export default connectDB
