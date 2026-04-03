import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserModel as User } from '@gameup/db'
import { grantLoginPoint } from '../services/pointService'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: 'developer' | 'player' | 'admin'
    adminLevel?: 'super' | 'normal' | 'monitor' | null
  }
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다' })
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: '유효하지 않은 토큰입니다' })
      }

      req.user = decoded as {
        id: string
        email: string
        role: 'developer' | 'player' | 'admin'
        adminLevel?: 'super' | 'normal' | 'monitor' | null
      }

      // 일일 접속 포인트 (비동기, 응답 차단 안함)
      grantLoginPoint(req.user.id).catch(() => {})

      next()
    })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const requireRole = (...roles: Array<'developer' | 'player' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: '이 작업을 수행할 권한이 없습니다' 
      })
    }

    next()
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: '인증이 필요합니다' })
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다' })
  }
  next()
}

// Super: 모든 권한
// Normal: 승인/삭제 제외 모든 권한
// Monitor: 조회 + 공지사항/알림 작성만 가능
export const requireAdminLevel = (...levels: Array<'super' | 'normal' | 'monitor'>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다' })
    }
    let userLevel = req.user.adminLevel
    // 이전 토큰에 adminLevel이 없을 경우 DB에서 조회
    if (!userLevel) {
      try {
        const dbUser = await User.findById(req.user.id).select('adminLevel').lean()
        userLevel = (dbUser as any)?.adminLevel || null
        if (userLevel) req.user.adminLevel = userLevel
      } catch { /* noop */ }
    }
    if (!userLevel || !levels.includes(userLevel)) {
      return res.status(403).json({ message: '해당 작업에 대한 권한이 없습니다' })
    }
    next()
  }
}
