import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import connectDB from './config/database'
import gameRoutes from './routes/gameRoutes'
import userRoutes from './routes/userRoutes'
import paymentRoutes from './routes/paymentRoutes'
import adminRoutes from './routes/adminRoutes'
import playerRoutes from './routes/playerRoutes'
import communityRoutes from './routes/communityRoutes'
import authRoutes from './routes/authRoutes'
import followRoutes from './routes/followRoutes'
import partnerRoutes from './routes/partnerRoutes'
import adminPartnerRoutes from './routes/adminPartnerRoutes'
import publishingRoutes from './routes/publishingRoutes'
import adminPublishingRoutes from './routes/adminPublishingRoutes'
import { errorHandler, notFound } from './middleware/errorHandler'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ── DB 연결 ───────────────────────────────────────────────────────
connectDB()

// ── CORS 설정 ─────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS 정책에 의해 차단된 요청입니다'))
    }
  },
  credentials: true
}))

// ── Rate Limiting ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false
})

app.use(globalLimiter)


// ── 일반 미들웨어 ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── 정적 파일 ─────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── 라우트 ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api', followRoutes)
app.use('/api/users', authLimiter, userRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', playerRoutes)
app.use('/api/community', communityRoutes)
app.use('/api', partnerRoutes)
app.use('/api', adminPartnerRoutes)
app.use('/api', publishingRoutes)
app.use('/api', adminPublishingRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// ── 에러 핸들러 ──────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
