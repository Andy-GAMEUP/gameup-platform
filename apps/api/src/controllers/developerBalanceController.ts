import { Request, Response } from 'express'
import {
  DeveloperPointBalanceModel,
  DeveloperPointTransactionModel,
  PointPackageModel,
} from '@gameup/db'
import {
  getOrCreateBalance,
  addBalance,
  adminAdjustBalance,
} from '../services/developerBalanceService'

interface AuthRequest extends Request {
  user?: { id: string; role: string }
}

// ─── 개발사 API ────────────────────────────────────────────────

/**
 * GET /api/developer/point-balance
 */
export async function getMyBalance(req: AuthRequest, res: Response) {
  try {
    const balance = await getOrCreateBalance(req.user!.id)
    return res.json({ balance })
  } catch (error) {
    console.error('잔액 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET /api/developer/point-transactions
 */
export async function getMyTransactions(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 20, type } = req.query
    const filter: Record<string, unknown> = { developerId: req.user!.id }
    if (type) filter.type = type

    const skip = (Number(page) - 1) * Number(limit)
    const [transactions, total] = await Promise.all([
      DeveloperPointTransactionModel.find(filter)
        .populate('relatedGameId', 'title')
        .populate('relatedUserId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DeveloperPointTransactionModel.countDocuments(filter),
    ])

    return res.json({
      transactions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error) {
    console.error('거래 내역 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/developer/point-purchase
 * 포인트 구매 (패키지 기반)
 */
export async function purchasePoints(req: AuthRequest, res: Response) {
  try {
    const { packageId } = req.body
    if (!packageId) return res.status(400).json({ message: 'packageId는 필수입니다' })

    const pkg = await PointPackageModel.findById(packageId).lean()
    if (!pkg || !pkg.isActive) {
      return res.status(404).json({ message: '유효하지 않은 상품입니다' })
    }

    // 실제 결제 처리 생략 (Toss Payments 연동은 별도)
    const result = await addBalance(
      req.user!.id,
      pkg.points,
      `포인트 구매: ${pkg.name} (${pkg.points.toLocaleString()}P)`,
      undefined,
      packageId
    )

    return res.json(result)
  } catch (error) {
    console.error('포인트 구매 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET /api/point-packages
 * 상품 목록 (공개)
 */
export async function getPointPackages(req: Request, res: Response) {
  try {
    const packages = await PointPackageModel.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
    return res.json({ packages })
  } catch (error) {
    console.error('상품 목록 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

// ─── 관리자 API ────────────────────────────────────────────────

/**
 * GET /api/admin/developer-balances
 */
export async function adminGetAllBalances(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const [balances, total] = await Promise.all([
      DeveloperPointBalanceModel.find()
        .populate('developerId', 'username email')
        .sort({ balance: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DeveloperPointBalanceModel.countDocuments(),
    ])

    return res.json({
      balances,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    })
  } catch (error) {
    console.error('개발사 잔액 목록 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/admin/developer-balances/:developerId/adjust
 */
export async function adminAdjust(req: AuthRequest, res: Response) {
  try {
    const { developerId } = req.params
    const { amount, type, description } = req.body

    if (!amount || !type || !description) {
      return res.status(400).json({ message: 'amount, type, description은 필수입니다' })
    }

    if (!['admin_grant', 'admin_deduct'].includes(type)) {
      return res.status(400).json({ message: 'type은 admin_grant 또는 admin_deduct이어야 합니다' })
    }

    const result = await adminAdjustBalance(developerId, amount, description, type)
    return res.json(result)
  } catch (error) {
    console.error('잔액 조정 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET/POST/PUT /api/admin/point-packages
 * 포인트 상품 CRUD
 */
export async function adminGetPackages(req: AuthRequest, res: Response) {
  try {
    const packages = await PointPackageModel.find().sort({ sortOrder: 1 }).lean()
    return res.json({ packages })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류' })
  }
}

export async function adminCreatePackage(req: AuthRequest, res: Response) {
  try {
    const { name, points, price, description, sortOrder } = req.body
    if (!name || !points || !price) {
      return res.status(400).json({ message: 'name, points, price는 필수입니다' })
    }

    const pkg = await PointPackageModel.create({
      name,
      points,
      price,
      unitPrice: Math.round(price / points * 10) / 10,
      description: description || '',
      sortOrder: sortOrder || 0,
    })

    return res.json({ package: pkg })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류' })
  }
}

export async function adminUpdatePackage(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const updates = req.body

    if (updates.points && updates.price) {
      updates.unitPrice = Math.round(updates.price / updates.points * 10) / 10
    }

    const pkg = await PointPackageModel.findByIdAndUpdate(id, updates, { new: true })
    if (!pkg) return res.status(404).json({ message: '상품을 찾을 수 없습니다' })

    return res.json({ package: pkg })
  } catch (error) {
    return res.status(500).json({ message: '서버 오류' })
  }
}
