import { Router } from 'express'
import { startUserSession, heartbeat, endUserSession } from '../controllers/sessionController'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/session/start', authenticateToken, startUserSession)
router.post('/session/heartbeat', authenticateToken, heartbeat)
// sendBeacon은 Authorization 헤더를 보낼 수 없으므로 인증 없이 sessionId만으로 종료
router.post('/session/end', endUserSession)

export default router
