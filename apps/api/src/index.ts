import http from 'http'
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
import minihomeRoutes from './routes/minihomeRoutes'
import adminMinihomeRoutes from './routes/adminMinihomeRoutes'
import supportRoutes from './routes/supportRoutes'
import adminSupportRoutes from './routes/adminSupportRoutes'
import messageRoutes from './routes/messageRoutes'
import notificationRoutes from './routes/notificationRoutes'
import adminNotificationRoutes from './routes/adminNotificationRoutes'
import solutionRoutes from './routes/solutionRoutes'
import adminSolutionRoutes from './routes/adminSolutionRoutes'
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes'
import adminUserEnhancedRoutes from './routes/adminUserEnhancedRoutes'
import adminLevelRoutes from './routes/adminLevelRoutes'
import adminActivityScoreRoutes from './routes/adminActivityScoreRoutes'
import adminTermsRoutes from './routes/adminTermsRoutes'
import eventBannerRoutes from './routes/eventBannerRoutes'
import adminEventBannerRoutes from './routes/adminEventBannerRoutes'
import partnerMatchingRoutes from './routes/partnerMatchingRoutes'
import partnerProjectRoutes from './routes/partnerProjectRoutes'
import analyticsTrackRoutes from './routes/analyticsRoutes'
import sessionRoutes from './routes/sessionRoutes'
import gameEventRoutes from './routes/gameEventRoutes'
import gamePointRoutes from './routes/gamePointRoutes'
import adminGamePointRoutes from './routes/adminGamePointRoutes'
import { TermsModel } from '@gameup/db'
import { errorHandler, notFound } from './middleware/errorHandler'
import { initSocket } from './socket'

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
app.use('/api', partnerMatchingRoutes)
app.use('/api', partnerProjectRoutes)
app.use('/api', partnerRoutes)
app.use('/api/admin', adminPartnerRoutes)
app.use('/api', publishingRoutes)
app.use('/api/admin', adminPublishingRoutes)
app.use('/api', minihomeRoutes)
app.use('/api/admin', adminMinihomeRoutes)
app.use('/api', supportRoutes)
app.use('/api/admin', adminSupportRoutes)
app.use('/api', messageRoutes)
app.use('/api', notificationRoutes)
app.use('/api/admin', adminNotificationRoutes)
app.use('/api', solutionRoutes)
app.use('/api/admin', adminSolutionRoutes)
app.use('/api', sessionRoutes)
app.use('/api', gameEventRoutes)
app.use('/api/analytics', analyticsTrackRoutes)
app.use('/api/admin/analytics', adminAnalyticsRoutes)
app.use('/api/admin/users-enhanced', adminUserEnhancedRoutes)
app.use('/api/admin/levels', adminLevelRoutes)
app.use('/api/admin/activity-scores', adminActivityScoreRoutes)
app.use('/api/admin/terms', adminTermsRoutes)
app.use('/api', eventBannerRoutes)
app.use('/api/admin', adminEventBannerRoutes)
app.use('/api', gamePointRoutes)
app.use('/api/admin', adminGamePointRoutes)

// 공개 약관 조회 (회원가입 시 사용)
app.get('/api/terms', async (req, res) => {
  try {
    const { type } = req.query
    const filter: Record<string, unknown> = {}
    if (type) filter.type = type
    const terms = await TermsModel.find(filter).select('type content updatedAt')
    res.json({ terms })
  } catch {
    res.status(500).json({ message: '약관 조회 실패' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// ── 에러 핸들러 ──────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

const server = http.createServer(app)
initSocket(server)
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default server
