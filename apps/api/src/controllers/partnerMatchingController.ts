import { Response } from 'express'
import mongoose from 'mongoose'
import { PartnerModel as Partner, PartnerReviewModel as PartnerReview, UserModel as User } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// companyCategory 없는 구계정은 companyType에 'developer' 포함 여부로 판단 (하위 호환)
const DEVELOPER_CONDITION = {
  $or: [
    { 'companyInfo.companyCategory': 'developer' },
    { 'companyInfo.companyCategory': { $exists: false }, 'companyInfo.companyType': 'developer' },
  ],
}

// 파트너 프로필 목록 (Partner/내채널 기반)
export const getPartnerProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const { search, companyType, tab, page = 1, limit = 12, sort } = req.query

    const filter: Record<string, unknown> = { status: 'approved', isProfilePublic: true }

    if (search) {
      const safeSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { displayNameOverride: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    if (tab === 'verified') {
      filter.isVerified = true
    }

    // 기업 형태(User.companyInfo.companyType) / 탭 필터는 User 조회 후 userId 교집합으로 적용
    let userIdFilter: string[] | null = null

    if (companyType && companyType !== 'all') {
      // 다중 선택 시 콤마로 구분된 값이 넘어옴 — 선택된 기업 형태 중 하나라도 포함되면 매치
      const types = String(companyType).split(',').filter(Boolean)
      const matchedUsers = await User.find({ 'companyInfo.companyType': { $in: types } }).select('_id')
      userIdFilter = matchedUsers.map(u => String(u._id))
    }

    if (tab === 'developer' || tab === 'partner') {
      const query = tab === 'developer' ? DEVELOPER_CONDITION : { $nor: [DEVELOPER_CONDITION] }
      const matchedUsers = await User.find(query).select('_id')
      const tabIds = matchedUsers.map(u => String(u._id))
      userIdFilter = userIdFilter ? userIdFilter.filter(id => tabIds.includes(id)) : tabIds
    }

    if (userIdFilter) {
      filter.userId = { $in: userIdFilter }
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const sortParam = String(sort || 'default')
    const populateOpts = { path: 'userId', select: 'username memberType companyInfo.companyName companyInfo.companyCategory companyInfo.companyType' }

    let profiles
    if (sortParam === 'portfolio') {
      // 배열 길이로 정렬해야 해서 find().sort()로는 안 되고 aggregate가 필요함
      const matchFilter: Record<string, unknown> = { ...filter }
      if (matchFilter.userId && typeof matchFilter.userId === 'object' && '$in' in (matchFilter.userId as Record<string, unknown>)) {
        const ids = (matchFilter.userId as { $in: string[] }).$in
        matchFilter.userId = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }
      }
      profiles = await Partner.aggregate([
        { $match: matchFilter },
        { $addFields: { portfolioCount: { $size: { $ifNull: ['$portfolio', []] } } } },
        { $sort: { portfolioCount: -1, rating: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ])
      await Partner.populate(profiles, populateOpts)
    } else {
      const sortObj: Record<string, 1 | -1> =
        sortParam === 'rating' ? { rating: -1, reviewCount: -1 } :
        sortParam === 'recent' ? { updatedAt: -1 } :
        { isVerified: -1, rating: -1, createdAt: -1 }
      profiles = await Partner.find(filter)
        .populate(populateOpts)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
    }

    const total = await Partner.countDocuments(filter)

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
    const total = await Partner.countDocuments({ status: 'approved', isProfilePublic: true })
    const verified = await Partner.countDocuments({ status: 'approved', isProfilePublic: true, isVerified: true })

    const publicPartners = await Partner.find({ status: 'approved', isProfilePublic: true }).select('userId')
    const developerUserIds = await User.find({
      $and: [{ _id: { $in: publicPartners.map(p => p.userId) } }, DEVELOPER_CONDITION],
    }).select('_id')
    const developers = developerUserIds.length

    const avgRatingResult = await Partner.aggregate([
      { $match: { status: 'approved', isProfilePublic: true, rating: { $gt: 0 } } },
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

    const profile = await Partner.findById(id)
      .populate('userId', 'username memberType companyInfo.companyName companyInfo.companyCategory companyInfo.companyType')
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

    const reviews = await PartnerReview.find({ targetPartnerId: id })
      .populate('reviewerId', 'username companyInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const total = await PartnerReview.countDocuments({ targetPartnerId: id })

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

    const profile = await Partner.findById(id)
    if (!profile) {
      return res.status(404).json({ message: '파트너를 찾을 수 없습니다' })
    }

    const review = await PartnerReview.create({
      reviewerId: req.user.id,
      targetPartnerId: id,
      rating,
      content,
      projectTitle,
    })

    // 평점 업데이트
    const allReviews = await PartnerReview.find({ targetPartnerId: id })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await Partner.findByIdAndUpdate(id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    })

    res.status(201).json({ success: true, review })
  } catch (error) {
    console.error('Create partner review error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
