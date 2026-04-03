import { Response } from 'express'
import { MiniHomeModel as MiniHome, PartnerReviewModel as PartnerReview, UserModel as User } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// 파트너 프로필 목록 (MiniHome 기반)
export const getPartnerProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const { search, expertise, availability, tab, page = 1, limit = 12 } = req.query

    const filter: Record<string, unknown> = { isPublic: true }

    if (search) {
      const safeSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { companyName: { $regex: safeSearch, $options: 'i' } },
        { skills: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    if (expertise && expertise !== 'all') {
      filter.expertiseArea = expertise
    }

    if (availability && availability !== 'all') {
      filter.availability = availability
    }

    if (tab === 'developer') {
      filter.expertiseArea = { $in: ['developer', 'publisher'] }
    } else if (tab === 'partner') {
      filter.expertiseArea = { $nin: ['developer', 'publisher'] }
    } else if (tab === 'verified') {
      filter.isVerified = true
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const profiles = await MiniHome.find(filter)
      .populate('userId', 'username companyInfo memberType')
      .sort({ isVerified: -1, rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const total = await MiniHome.countDocuments(filter)

    res.json({
      success: true,
      profiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get partner profiles error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 파트너 프로필 통계
export const getPartnerProfileStats = async (req: AuthRequest, res: Response) => {
  try {
    const total = await MiniHome.countDocuments({ isPublic: true })
    const verified = await MiniHome.countDocuments({ isPublic: true, isVerified: true })
    const developers = await MiniHome.countDocuments({
      isPublic: true,
      expertiseArea: { $in: ['developer', 'publisher'] },
    })

    const avgRatingResult = await MiniHome.aggregate([
      { $match: { isPublic: true, rating: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ])
    const avgRating = avgRatingResult.length > 0 ? Math.round(avgRatingResult[0].avgRating * 10) / 10 : 0

    res.json({ success: true, stats: { total, verified, developers, avgRating } })
  } catch (error) {
    console.error('Get partner profile stats error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 파트너 프로필 상세
export const getPartnerProfileById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }

    const profile = await MiniHome.findById(id)
      .populate('userId', 'username companyInfo memberType contactPerson')
      .populate('representativeGameId')

    if (!profile) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }

    res.json({ success: true, profile })
  } catch (error) {
    console.error('Get partner profile by id error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 파트너 리뷰 목록
export const getPartnerReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 10 } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const reviews = await PartnerReview.find({ targetMinihomeId: id })
      .populate('reviewerId', 'username companyInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const total = await PartnerReview.countDocuments({ targetMinihomeId: id })

    res.json({
      success: true,
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Get partner reviews error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 리뷰 작성
export const createPartnerReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { rating, content, projectTitle } = req.body

    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: '평점은 1~5 사이여야 합니다' })
    }

    const profile = await MiniHome.findById(id)
    if (!profile) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }

    const review = await PartnerReview.create({
      reviewerId: req.user.id,
      targetMinihomeId: id,
      rating,
      content,
      projectTitle,
    })

    // 평점 업데이트
    const allReviews = await PartnerReview.find({ targetMinihomeId: id })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await MiniHome.findByIdAndUpdate(id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    })

    res.status(201).json({ success: true, review })
  } catch (error) {
    console.error('Create partner review error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
