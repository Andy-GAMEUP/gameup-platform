import { Request, Response } from 'express'
import {
  GamePointPolicyModel,
  GamePointLogModel,
  GameModel,
} from '@gameup/db'
import type { GamePointType } from '@gameup/db'
import {
  grantGamePoint,
  getGamePointStats,
  invalidateGamePolicyCache,
} from '../services/gamePointService'

interface AuthRequest extends Request {
  user?: { id: string; role: string; adminLevel?: string }
}

// ─── 외부 게임 연동 API ────────────────────────────────────────────

/**
 * POST /api/game-points/grant
 * 게임 서버에서 호출하는 포인트 지급 API
 * Body: { gameId, userId, type, metadata? }
 */
export async function grantPoint(req: Request, res: Response) {
  try {
    const { gameId, userId, type, metadata } = req.body

    if (!gameId || !userId || !type) {
      return res.status(400).json({ success: false, message: 'gameId, userId, type은 필수입니다' })
    }

    const validTypes: GamePointType[] = [
      'game_account_create',
      'game_daily_login',
      'game_play_time',
      'game_purchase',
      'game_event_participate',
      'game_level_achieve',
      'game_ranking',
    ]

    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `유효하지 않은 type입니다. 허용: ${validTypes.join(', ')}` })
    }

    const apiKey = req.headers['x-api-key'] as string | undefined
    const result = await grantGamePoint(gameId, userId, type, metadata, apiKey)

    if (!result) {
      return res.status(500).json({ success: false, message: '포인트 처리 중 오류가 발생했습니다' })
    }

    return res.status(result.success ? 200 : 400).json(result)
  } catch (error) {
    console.error('게임 포인트 지급 오류:', error)
    return res.status(500).json({ success: false, message: '서버 오류' })
  }
}

/**
 * POST /api/game-points/batch-grant
 * 게임 서버에서 호출하는 일괄 포인트 지급 API
 * Body: { gameId, grants: [{ userId, type, metadata? }] }
 */
export async function batchGrantPoints(req: Request, res: Response) {
  try {
    const { gameId, grants } = req.body

    if (!gameId || !grants || !Array.isArray(grants)) {
      return res.status(400).json({ success: false, message: 'gameId, grants 배열은 필수입니다' })
    }

    if (grants.length > 100) {
      return res.status(400).json({ success: false, message: '일괄 처리는 최대 100건까지 가능합니다' })
    }

    const results = []
    for (const grant of grants) {
      const apiKey = req.headers['x-api-key'] as string | undefined
      const result = await grantGamePoint(
        gameId,
        grant.userId,
        grant.type,
        grant.metadata,
        apiKey
      )
      results.push({
        userId: grant.userId,
        type: grant.type,
        ...result,
      })
    }

    const successCount = results.filter(r => r.success).length
    return res.json({
      success: true,
      total: grants.length,
      successCount,
      failCount: grants.length - successCount,
      results,
    })
  } catch (error) {
    console.error('일괄 포인트 지급 오류:', error)
    return res.status(500).json({ success: false, message: '서버 오류' })
  }
}

/**
 * GET /api/game-points/:gameId/policies
 * 게임의 포인트 정책 조회 (공개)
 */
export async function getGamePolicies(req: Request, res: Response) {
  try {
    const { gameId } = req.params
    const policies = await GamePointPolicyModel.find({
      gameId,
      approvalStatus: 'approved',
      isActive: true,
    }).select('type label description amount multiplier dailyLimit').lean()

    return res.json({ policies })
  } catch (error) {
    console.error('게임 포인트 정책 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET /api/game-points/:gameId/stats
 * 게임 포인트 통계 (개발사/관리자)
 */
export async function getGameStats(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const stats = await getGamePointStats(gameId)
    return res.json(stats)
  } catch (error) {
    console.error('게임 포인트 통계 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * GET /api/game-points/:gameId/logs
 * 게임 포인트 지급 이력 (개발사/관리자)
 */
export async function getGamePointLogs(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const { page = 1, limit = 20, type } = req.query

    const filter: Record<string, unknown> = { gameId }
    if (type) filter.type = type

    const skip = (Number(page) - 1) * Number(limit)
    const [logs, total] = await Promise.all([
      GamePointLogModel.find(filter)
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      GamePointLogModel.countDocuments(filter),
    ])

    return res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    console.error('게임 포인트 로그 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

// ─── 개발사 콘솔 API ────────────────────────────────────────────────

/**
 * GET /api/games/:gameId/point-policies
 * 개발사: 내 게임의 포인트 정책 조회
 */
export async function getMyGamePolicies(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const policies = await GamePointPolicyModel.find({ gameId }).sort({ type: 1 }).lean()
    return res.json({ policies })
  } catch (error) {
    console.error('개발사 포인트 정책 조회 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/games/:gameId/point-policies
 * 개발사: 포인트 정책 생성/수정 (draft 상태)
 */
export async function upsertGamePolicy(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const {
      type, label, description, amount, multiplier, dailyLimit,
      startDate, endDate, estimatedDailyUsage, developerNote, conditionConfig,
    } = req.body

    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    // 기간 검증
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: '시작일은 종료일보다 이전이어야 합니다' })
    }

    const policy = await GamePointPolicyModel.findOneAndUpdate(
      { gameId, type },
      {
        $set: {
          label,
          description: description || '',
          amount: amount || 1,
          multiplier: multiplier || 1,
          dailyLimit: dailyLimit || null,
          startDate: startDate || null,
          endDate: endDate || null,
          estimatedDailyUsage: estimatedDailyUsage || 0,
          developerNote: developerNote || '',
          conditionConfig: conditionConfig || null,
          developerId: req.user!.id,
        },
        $setOnInsert: {
          approvalStatus: 'draft',
          isActive: false,
        },
      },
      { upsert: true, new: true }
    )

    return res.json({ policy })
  } catch (error) {
    console.error('포인트 정책 생성/수정 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/games/:gameId/point-policies/submit
 * 개발사: 포인트 정책 승인 요청 제출
 */
export async function submitPoliciesForApproval(req: AuthRequest, res: Response) {
  try {
    const { gameId } = req.params
    const game = await GameModel.findById(gameId).select('developerId title').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    // 제출할 정책 조회
    const drafts = await GamePointPolicyModel.find({
      gameId,
      developerId: req.user!.id,
      approvalStatus: { $in: ['draft', 'rejected'] },
    }).lean()

    if (drafts.length === 0) {
      return res.status(400).json({ message: '제출할 정책이 없습니다' })
    }

    // 신청서 검증: 모든 정책에 필수 필드가 있는지 확인
    const invalidPolicies = drafts.filter(
      (p) => !p.label || !p.amount || p.amount <= 0
    )
    if (invalidPolicies.length > 0) {
      return res.status(400).json({
        message: '모든 정책에 이름(label)과 유효한 금액(amount)이 필요합니다',
        invalidTypes: invalidPolicies.map((p) => p.type),
      })
    }

    // 기간 검증
    for (const p of drafts) {
      if (p.startDate && p.endDate && new Date(p.startDate) >= new Date(p.endDate)) {
        return res.status(400).json({
          message: `${p.type} 정책의 시작일이 종료일보다 같거나 이후입니다`,
        })
      }
    }

    // draft 또는 rejected 상태인 정책을 pending으로 변경
    const result = await GamePointPolicyModel.updateMany(
      {
        gameId,
        developerId: req.user!.id,
        approvalStatus: { $in: ['draft', 'rejected'] },
      },
      {
        $set: { approvalStatus: 'pending' },
        $unset: { rejectionReason: '', rejectedAt: '', rejectedBy: '' },
      }
    )

    return res.json({ message: '승인 요청이 제출되었습니다', updatedCount: result.modifiedCount })
  } catch (error) {
    console.error('승인 요청 제출 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * DELETE /api/games/:gameId/point-policies/:type
 * 개발사: 포인트 정책 삭제 (draft/rejected만)
 */
export async function deleteGamePolicy(req: AuthRequest, res: Response) {
  try {
    const { gameId, type } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const result = await GamePointPolicyModel.findOneAndDelete({
      gameId,
      type,
      approvalStatus: { $in: ['draft', 'rejected'] },
    })

    if (!result) {
      return res.status(400).json({ message: '삭제할 수 없는 상태의 정책입니다' })
    }

    return res.json({ message: '정책이 삭제되었습니다' })
  } catch (error) {
    console.error('정책 삭제 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

// ─── 관리자 API ────────────────────────────────────────────────────

/**
 * GET /api/admin/game-point-policies
 * 관리자: 전체 게임 포인트 정책 조회
 */
export async function adminGetAllPolicies(req: AuthRequest, res: Response) {
  try {
    const { status, gameId, page = 1, limit = 20 } = req.query
    const filter: Record<string, unknown> = {}
    if (status) filter.approvalStatus = status
    if (gameId) filter.gameId = gameId

    const skip = (Number(page) - 1) * Number(limit)
    const [policies, total] = await Promise.all([
      GamePointPolicyModel.find(filter)
        .populate('gameId', 'title thumbnail serviceType')
        .populate('developerId', 'username email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      GamePointPolicyModel.countDocuments(filter),
    ])

    return res.json({
      policies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    console.error('관리자 정책 목록 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * PUT /api/admin/game-point-policies/:id/approve
 * 관리자: 포인트 정책 승인
 */
export async function adminApprovePolicy(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const { adminNote } = req.body

    const policy = await GamePointPolicyModel.findByIdAndUpdate(
      id,
      {
        $set: {
          approvalStatus: 'approved',
          isActive: true,
          approvedAt: new Date(),
          approvedBy: req.user!.id,
          adminNote: adminNote || undefined,
        },
      },
      { new: true }
    )

    if (!policy) return res.status(404).json({ message: '정책을 찾을 수 없습니다' })

    invalidateGamePolicyCache()
    return res.json({ policy, message: '정책이 승인되었습니다' })
  } catch (error) {
    console.error('정책 승인 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * PUT /api/admin/game-point-policies/:id/reject
 * 관리자: 포인트 정책 거절
 */
export async function adminRejectPolicy(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body

    if (!rejectionReason) {
      return res.status(400).json({ message: '거절 사유를 입력해주세요' })
    }

    const policy = await GamePointPolicyModel.findByIdAndUpdate(
      id,
      {
        $set: {
          approvalStatus: 'rejected',
          isActive: false,
          rejectedAt: new Date(),
          rejectedBy: req.user!.id,
          rejectionReason,
        },
      },
      { new: true }
    )

    if (!policy) return res.status(404).json({ message: '정책을 찾을 수 없습니다' })

    invalidateGamePolicyCache()
    return res.json({ policy, message: '정책이 거절되었습니다' })
  } catch (error) {
    console.error('정책 거절 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * PUT /api/admin/game-point-policies/:id/toggle
 * 관리자: 승인된 정책 활성/비활성 토글
 */
export async function adminTogglePolicy(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params
    const policy = await GamePointPolicyModel.findById(id)
    if (!policy) return res.status(404).json({ message: '정책을 찾을 수 없습니다' })

    if (policy.approvalStatus !== 'approved') {
      return res.status(400).json({ message: '승인된 정책만 활성/비활성 전환이 가능합니다' })
    }

    policy.isActive = !policy.isActive
    await policy.save()

    invalidateGamePolicyCache()
    return res.json({ policy, message: `정책이 ${policy.isActive ? '활성화' : '비활성화'}되었습니다` })
  } catch (error) {
    console.error('정책 토글 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/admin/game-point-policies/batch-approve
 * 관리자: 일괄 승인
 */
export async function adminBatchApprove(req: AuthRequest, res: Response) {
  try {
    const { ids } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '승인할 정책 ID 목록이 필요합니다' })
    }

    const result = await GamePointPolicyModel.updateMany(
      { _id: { $in: ids }, approvalStatus: 'pending' },
      {
        $set: {
          approvalStatus: 'approved',
          isActive: true,
          approvedAt: new Date(),
          approvedBy: req.user!.id,
        },
      }
    )

    invalidateGamePolicyCache()
    return res.json({ message: `${result.modifiedCount}건 승인 완료`, modifiedCount: result.modifiedCount })
  } catch (error) {
    console.error('일괄 승인 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

/**
 * POST /api/admin/game-point-policies/batch-reject
 * 관리자: 일괄 거절
 */
export async function adminBatchReject(req: AuthRequest, res: Response) {
  try {
    const { ids, rejectionReason } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: '거절할 정책 ID 목록이 필요합니다' })
    }
    if (!rejectionReason) {
      return res.status(400).json({ message: '거절 사유를 입력해주세요' })
    }

    const result = await GamePointPolicyModel.updateMany(
      { _id: { $in: ids }, approvalStatus: 'pending' },
      {
        $set: {
          approvalStatus: 'rejected',
          isActive: false,
          rejectedAt: new Date(),
          rejectedBy: req.user!.id,
          rejectionReason,
        },
      }
    )

    invalidateGamePolicyCache()
    return res.json({ message: `${result.modifiedCount}건 거절 완료`, modifiedCount: result.modifiedCount })
  } catch (error) {
    console.error('일괄 거절 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}

// ─── 개발사: 승인된 정책 독립 토글 ─────────────────────────────────

/**
 * PUT /api/games/:gameId/point-policies/:type/toggle
 * 개발사: 승인된 정책의 활성/비활성 토글
 */
export async function developerTogglePolicy(req: AuthRequest, res: Response) {
  try {
    const { gameId, type } = req.params
    const game = await GameModel.findById(gameId).select('developerId').lean()
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const policy = await GamePointPolicyModel.findOne({ gameId, type })
    if (!policy) return res.status(404).json({ message: '정책을 찾을 수 없습니다' })

    if (policy.approvalStatus !== 'approved') {
      return res.status(400).json({ message: '승인된 정책만 활성/비활성 전환이 가능합니다' })
    }

    policy.isActive = !policy.isActive
    await policy.save()

    invalidateGamePolicyCache()
    return res.json({ policy, message: `정책이 ${policy.isActive ? '활성화' : '비활성화'}되었습니다` })
  } catch (error) {
    console.error('개발사 정책 토글 오류:', error)
    return res.status(500).json({ message: '서버 오류' })
  }
}
