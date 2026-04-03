import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { GameEventModel, GameEventClaimModel, GameModel } from '@gameup/db'
import { grantPoints } from '../services/pointService'

// 게임 이벤트 목록 (특정 게임)
export const getGameEvents = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { active } = req.query
    const filter: Record<string, unknown> = { gameId }
    if (active === 'true') {
      const now = new Date()
      filter.isActive = true
      filter.startDate = { $lte: now }
      filter.endDate = { $gte: now }
    }
    const events = await GameEventModel.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, events })
  } catch {
    res.status(500).json({ message: '게임 이벤트 조회 실패' })
  }
}

// 게임 이벤트 생성 (개발사)
export const createGameEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, title, description, conditionType, conditionValue, rewardPoints, startDate, endDate } = req.body

    // 본인 게임인지 확인
    const game = await GameModel.findById(gameId)
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '본인 게임에만 이벤트를 생성할 수 있습니다' })
    }

    const event = await GameEventModel.create({
      gameId,
      developerId: req.user!.id,
      title,
      description,
      conditionType,
      conditionValue,
      rewardPoints,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
    })

    res.status(201).json({ success: true, event })
  } catch {
    res.status(500).json({ message: '게임 이벤트 생성 실패' })
  }
}

// 게임 이벤트 수정
export const updateGameEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const event = await GameEventModel.findById(id)
    if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다' })
    if (event.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '수정 권한이 없습니다' })
    }

    const { title, description, conditionType, conditionValue, rewardPoints, startDate, endDate, isActive } = req.body
    if (title !== undefined) event.title = title
    if (description !== undefined) event.description = description
    if (conditionType !== undefined) event.conditionType = conditionType
    if (conditionValue !== undefined) event.conditionValue = conditionValue
    if (rewardPoints !== undefined) event.rewardPoints = rewardPoints
    if (startDate !== undefined) event.startDate = new Date(startDate)
    if (endDate !== undefined) event.endDate = new Date(endDate)
    if (isActive !== undefined) event.isActive = isActive

    await event.save()
    res.json({ success: true, event })
  } catch {
    res.status(500).json({ message: '게임 이벤트 수정 실패' })
  }
}

// 이벤트 보상 청구 (플레이어)
export const claimEventReward = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params
    const userId = req.user!.id

    const event = await GameEventModel.findById(eventId)
    if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다' })

    // 이벤트 활성 상태 및 기간 확인
    const now = new Date()
    if (!event.isActive || now < event.startDate || now > event.endDate) {
      return res.status(400).json({ message: '현재 진행 중인 이벤트가 아닙니다' })
    }

    // 중복 청구 확인
    const existingClaim = await GameEventClaimModel.findOne({ eventId, userId })
    if (existingClaim) {
      return res.status(400).json({ message: '이미 보상을 받았습니다' })
    }

    // 보상 지급
    const result = await grantPoints(
      userId,
      'game_event_reward',
      `게임 이벤트 보상: ${event.title}`,
      event.gameId.toString(),
      event.rewardPoints
    )

    if (!result) {
      return res.status(400).json({ message: '포인트 지급에 실패했습니다' })
    }

    // 청구 기록 생성
    await GameEventClaimModel.create({
      eventId,
      userId,
      pointsAwarded: event.rewardPoints,
    })

    res.json({ success: true, pointsAwarded: event.rewardPoints })
  } catch {
    res.status(500).json({ message: '이벤트 보상 청구 실패' })
  }
}

// 이벤트 삭제
export const deleteGameEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const event = await GameEventModel.findById(id)
    if (!event) return res.status(404).json({ message: '이벤트를 찾을 수 없습니다' })
    if (event.developerId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다' })
    }

    await GameEventModel.findByIdAndDelete(id)
    res.json({ success: true, message: '이벤트가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '게임 이벤트 삭제 실패' })
  }
}
