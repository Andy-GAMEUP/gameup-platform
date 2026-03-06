import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: 'developer' | 'player' | 'admin'
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
      }

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
