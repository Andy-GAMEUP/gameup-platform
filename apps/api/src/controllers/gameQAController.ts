import { Response } from 'express'
import { GameQAModel, GameModel, NotificationModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// 공개 Q&A 목록 조회 (게임 상세 페이지)
export const getGameQAs = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { page = 1, limit = 10 } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const filter = { gameId, isPublic: true }
    const total = await GameQAModel.countDocuments(filter)
    const qas = await GameQAModel.find(filter)
      .populate('userId', 'username')
      .populate('developerId', 'username')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    res.json({ success: true, qas, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    console.error('Get game QAs error:', error)
    res.status(500).json({ message: 'Q&A 조회 실패' })
  }
}

// Q&A 질문 작성 (로그인 회원)
export const createGameQA = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { question } = req.body

    if (!question || !question.trim()) {
      return res.status(400).json({ message: '질문 내용을 입력해주세요' })
    }

    const game = await GameModel.findById(gameId)
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    const qa = await GameQAModel.create({
      gameId,
      userId: req.user!.id,
      developerId: game.developerId,
      question: question.trim(),
    })

    const populated = await GameQAModel.findById(qa._id)
      .populate('userId', 'username')
      .populate('developerId', 'username')

    // 개발자에게 알림 전송
    await NotificationModel.create({
      userId: game.developerId,
      type: 'comment',
      title: `[${game.title}] 새 Q&A 질문`,
      content: question.trim().substring(0, 100),
      linkUrl: `/dashboard/games/${gameId}`,
    }).catch(() => {})

    res.status(201).json({ success: true, qa: populated })
  } catch (error) {
    console.error('Create game QA error:', error)
    res.status(500).json({ message: 'Q&A 작성 실패' })
  }
}

// 개발자: 자기 게임 Q&A 목록 (피드백 관리)
export const getDeveloperQAs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, gameId, answered } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const filter: Record<string, unknown> = { developerId: req.user!.id }
    if (gameId) filter.gameId = gameId
    if (answered === 'true') filter.answer = { $exists: true, $ne: '' }
    if (answered === 'false') filter.answer = { $in: [null, ''] }

    const total = await GameQAModel.countDocuments(filter)
    const qas = await GameQAModel.find(filter)
      .populate('userId', 'username email')
      .populate('gameId', 'title')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    res.json({ success: true, qas, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    console.error('Get developer QAs error:', error)
    res.status(500).json({ message: 'Q&A 조회 실패' })
  }
}

// 개발자: Q&A 답변 작성
export const answerGameQA = async (req: AuthRequest, res: Response) => {
  try {
    const { qaId } = req.params
    const { answer } = req.body

    if (!answer || !answer.trim()) {
      return res.status(400).json({ message: '답변 내용을 입력해주세요' })
    }

    const qa = await GameQAModel.findById(qaId).populate('gameId', 'title')
    if (!qa) return res.status(404).json({ message: 'Q&A를 찾을 수 없습니다' })
    if (qa.developerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: '답변 권한이 없습니다' })
    }

    qa.answer = answer.trim()
    qa.answeredAt = new Date()
    await qa.save()

    // 질문 작성자에게 알림 전송 (마이페이지 메시지로 수신)
    const gameTitle = (qa.gameId as any)?.title || '게임'
    await NotificationModel.create({
      userId: qa.userId,
      type: 'comment',
      title: `[${gameTitle}] Q&A 답변이 도착했습니다`,
      content: answer.trim().substring(0, 100),
      linkUrl: `/games/${qa.gameId}`,
    }).catch(() => {})

    const populated = await GameQAModel.findById(qaId)
      .populate('userId', 'username')
      .populate('developerId', 'username')
      .populate('gameId', 'title')

    res.json({ success: true, qa: populated })
  } catch (error) {
    console.error('Answer game QA error:', error)
    res.status(500).json({ message: '답변 작성 실패' })
  }
}

// 사용자: 내 Q&A 목록 (마이페이지)
export const getMyQAs = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const filter = { userId: req.user!.id }
    const total = await GameQAModel.countDocuments(filter)
    const qas = await GameQAModel.find(filter)
      .populate('gameId', 'title thumbnail')
      .populate('developerId', 'username')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    res.json({ success: true, qas, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (error) {
    console.error('Get my QAs error:', error)
    res.status(500).json({ message: 'Q&A 조회 실패' })
  }
}
