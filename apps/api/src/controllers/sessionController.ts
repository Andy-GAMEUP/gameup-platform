import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  startSession,
  heartbeatSession,
  endSession,
  grantGameAccessPoint,
} from '../services/pointService'

export const startUserSession = async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'web', gameId } = req.body
    const sessionId = await startSession(req.user!.id, type, gameId)

    // 게임 접속 시 일일 1회 포인트
    if (type === 'game' && gameId) {
      await grantGameAccessPoint(req.user!.id, gameId)
    }

    res.json({ success: true, sessionId })
  } catch {
    res.status(500).json({ message: '세션 시작 실패' })
  }
}

export const heartbeat = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ message: 'sessionId가 필요합니다' })

    const result = await heartbeatSession(sessionId)
    if (!result) return res.status(404).json({ message: '활성 세션을 찾을 수 없습니다' })

    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '하트비트 처리 실패' })
  }
}

export const endUserSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) return res.status(400).json({ message: 'sessionId가 필요합니다' })

    const pointsEarned = await endSession(sessionId)
    res.json({ success: true, pointsEarned })
  } catch {
    res.status(500).json({ message: '세션 종료 실패' })
  }
}
