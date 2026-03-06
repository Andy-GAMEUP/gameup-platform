import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middleware/auth'
import Review from '../models/Review'
import Game from '../models/Game'
import PlayerActivity from '../models/PlayerActivity'

const VALID_FEEDBACK_TYPES = ['general', 'bug', 'suggestion', 'praise']
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical']

// 게임 리뷰 목록 조회 (공개)
export const getGameReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { page = 1, limit = 10, sort = 'recent', feedbackType } = req.query

    // 🔒 차단된 리뷰 제외 (버그 수정)
    const filter: Record<string, unknown> = {
      gameId,
      isBlocked: { $ne: true }
    }
    if (feedbackType) filter.feedbackType = feedbackType

    const sortOption: Record<string, 1 | -1> =
      sort === 'helpful' ? { helpfulCount: -1 } : { createdAt: -1 }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))

    const total = await Review.countDocuments(filter)
    const reviews = await Review.find(filter)
      .populate('userId', 'username')
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)

    const ratingDist = await Review.aggregate([
      { $match: { gameId: new mongoose.Types.ObjectId(gameId as string), isBlocked: { $ne: true } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ])
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratingDist.forEach((d) => { distribution[d._id] = d.count })

    res.json({
      reviews,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      distribution
    })
  } catch (error) {
    res.status(500).json({ message: '리뷰 조회 실패' })
  }
}

// 내 리뷰 작성/수정
export const upsertReview = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { rating, title, content, feedbackType, bugSeverity } = req.body
    const userId = req.user!.id

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: '별점은 1~5점 사이여야 합니다' })
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: '리뷰 제목을 입력해주세요' })
    }
    if (title.trim().length > 100) {
      return res.status(400).json({ message: '제목은 100자 이내여야 합니다' })
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: '리뷰 내용을 입력해주세요' })
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ message: '내용은 2000자 이내여야 합니다' })
    }
    if (feedbackType && !VALID_FEEDBACK_TYPES.includes(feedbackType)) {
      return res.status(400).json({ message: '유효하지 않은 피드백 유형입니다' })
    }
    if (feedbackType === 'bug' && bugSeverity && !VALID_SEVERITIES.includes(bugSeverity)) {
      return res.status(400).json({ message: '유효하지 않은 버그 심각도입니다' })
    }

    const game = await Game.findById(gameId)
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    const existing = await Review.findOne({ userId, gameId })

    if (existing) {
      existing.rating = rating
      existing.title = title.trim()
      existing.content = content.trim()
      existing.feedbackType = feedbackType || 'general'
      existing.bugSeverity = bugSeverity || undefined
      if (!existing.isVerifiedTester) {
        const hasPlayed = await PlayerActivity.exists({ userId, gameId, type: 'play' })
        existing.isVerifiedTester = !!hasPlayed
      }
      await existing.save()
      await updateGameRating(gameId)
      return res.json({ message: '리뷰가 수정되었습니다', review: existing })
    }

    const hasPlayed = await PlayerActivity.exists({ userId, gameId, type: 'play' })

    const review = await Review.create({
      userId,
      gameId,
      rating,
      title: title.trim(),
      content: content.trim(),
      feedbackType: feedbackType || 'general',
      bugSeverity: bugSeverity || undefined,
      isVerifiedTester: !!hasPlayed
    })

    await Game.findByIdAndUpdate(gameId, { $inc: { feedbackCount: 1 } })
    await updateGameRating(gameId)
    await PlayerActivity.create({ userId, gameId, type: 'review' })

    res.status(201).json({ message: '리뷰가 등록되었습니다', review })
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({ message: '이미 리뷰를 작성하셨습니다' })
    }
    res.status(500).json({ message: '리뷰 등록 실패' })
  }
}

// 내 리뷰 삭제
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id

    const review = await Review.findOneAndDelete({ userId, gameId })
    if (!review) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' })

    await Game.findByIdAndUpdate(gameId, { $inc: { feedbackCount: -1 } })
    await updateGameRating(gameId)

    res.json({ message: '리뷰가 삭제되었습니다' })
  } catch (error) {
    res.status(500).json({ message: '리뷰 삭제 실패' })
  }
}

// 리뷰 도움됨 토글
export const toggleHelpful = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params
    const userId = req.user!.id

    const review = await Review.findById(reviewId)
    if (!review) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' })

    // 🔒 자신의 리뷰에 도움됨 불가
    if (review.userId.toString() === userId) {
      return res.status(400).json({ message: '자신의 리뷰에는 도움됨을 누를 수 없습니다' })
    }

    const mongoUserId = new mongoose.Types.ObjectId(userId)
    const alreadyHelped = review.helpfulUsers.some((id) => id.toString() === userId)

    if (alreadyHelped) {
      review.helpfulUsers = review.helpfulUsers.filter((id) => id.toString() !== userId)
      review.helpfulCount = Math.max(0, review.helpfulCount - 1)
    } else {
      review.helpfulUsers.push(mongoUserId)
      review.helpfulCount += 1
      await PlayerActivity.create({ userId, gameId: review.gameId, type: 'helpful' })
    }

    await review.save()
    res.json({ helpful: !alreadyHelped, helpfulCount: review.helpfulCount })
  } catch (error) {
    res.status(500).json({ message: '처리 실패' })
  }
}

// 내가 작성한 리뷰 조회
export const getMyReview = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const userId = req.user!.id
    const review = await Review.findOne({ userId, gameId })
    res.json({ review })
  } catch (error) {
    res.status(500).json({ message: '조회 실패' })
  }
}

async function updateGameRating(gameId: string) {
  const result = await Review.aggregate([
    { $match: { gameId: new mongoose.Types.ObjectId(gameId), isBlocked: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: '$rating' } } }
  ])
  const avg = result[0]?.avg || 0
  await Game.findByIdAndUpdate(gameId, { rating: Math.round(avg * 10) / 10 })
}