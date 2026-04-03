import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { UserModel as User, GameModel as Game, AnnouncementModel as Announcement, ReviewModel as Review, PlayerActivityModel as PlayerActivity } from '@gameup/db'
import { hashPassword } from '../services/authService'

// ── 플랫폼 전체 통계 ──────────────────────────────────────────────
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalDevelopers = await User.countDocuments({ role: 'developer' })
    const totalPlayers = await User.countDocuments({ role: 'player' })
    const bannedUsers = await User.countDocuments({ isActive: false })
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    })

    const totalGames = await Game.countDocuments()
    const pendingGames = await Game.countDocuments({ approvalStatus: 'pending' })
    const approvedGames = await Game.countDocuments({ approvalStatus: 'approved' })
    const rejectedGames = await Game.countDocuments({ approvalStatus: 'rejected' })
    const archivedGames = await Game.countDocuments({ status: 'archived' })
    const publishedGames = await Game.countDocuments({ status: 'published' })
    const betaGames = await Game.countDocuments({ status: 'beta' })

    const totalPlayAgg = await Game.aggregate([{ $group: { _id: null, total: { $sum: '$playCount' } } }])
    const totalPlayCount = totalPlayAgg[0]?.total || 0

    const totalReviews = await Review.countDocuments()
    const blockedReviews = await Review.countDocuments({ isBlocked: true })

    // 최근 7일 플레이 트렌드
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const playTrend = await PlayerActivity.aggregate([
      { $match: { type: 'play', createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ])

    // 인기 게임 TOP 5
    const topGames = await Game.find({ approvalStatus: 'approved' })
      .sort({ playCount: -1 }).limit(5)
      .select('title playCount rating status genre')

    res.json({
      users: { total: totalUsers, developers: totalDevelopers, players: totalPlayers, banned: bannedUsers, newToday: newUsersToday },
      games: { total: totalGames, pending: pendingGames, approved: approvedGames, rejected: rejectedGames, archived: archivedGames, published: publishedGames, beta: betaGames },
      totalPlayCount,
      reviews: { total: totalReviews, blocked: blockedReviews },
      playTrend,
      topGames
    })
  } catch (error) {
    res.status(500).json({ message: '통계 조회 실패' })
  }
}

// ── 전체 사용자 목록 ──────────────────────────────────────────────
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, role, search, isActive, memberType, isPartner, approvalStatus } = req.query
    const filter: Record<string, unknown> = {}
    if (role) filter.role = role
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    if (memberType) filter.memberType = memberType
    if (isPartner === 'true') filter.isPartner = true
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(String(approvalStatus))) {
      filter.approvalStatus = String(approvalStatus)
    }
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    const total = await User.countDocuments(filter)
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '사용자 목록 조회 실패' })
  }
}

// ── 사용자 역할 변경 ──────────────────────────────────────────────
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body
    if (!['developer', 'player', 'admin'].includes(role))
      return res.status(400).json({ message: '유효하지 않은 역할입니다' })
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    res.json({ message: '역할이 변경되었습니다', user })
  } catch {
    res.status(500).json({ message: '역할 변경 실패' })
  }
}

// ── 사용자 정지/해제 ──────────────────────────────────────────────
export const banUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isActive, banReason, bannedUntil, banDuration } = req.body
    let updateOp: Record<string, unknown>
    if (!isActive) {
      const bannedUntilDate = bannedUntil
        ? new Date(bannedUntil)
        : banDuration ? new Date(Date.now() + banDuration * 24 * 60 * 60 * 1000) : undefined
      updateOp = { $set: { isActive: false, banReason: banReason || '관리자에 의해 정지됨', ...(bannedUntilDate ? { bannedUntil: bannedUntilDate } : {}) } }
    } else {
      updateOp = { $set: { isActive: true }, $unset: { banReason: '', bannedUntil: '' } }
    }
    const user = await User.findByIdAndUpdate(id, updateOp, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    res.json({ message: isActive ? '정지가 해제되었습니다' : '정지되었습니다', user })
  } catch {
    res.status(500).json({ message: '정지 처리 실패' })
  }
}

// ── 사용자 삭제 (소프트 삭제) ──────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })
    if (user.role === 'admin') return res.status(400).json({ message: '관리자 계정은 삭제할 수 없습니다' })
    await User.findByIdAndUpdate(id, { $set: { isActive: false, deletedAt: new Date() } })
    res.json({ message: '사용자가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '사용자 삭제 실패' })
  }
}

// ── 회원 상세 조회 ────────────────────────────────────────────────
export const getUserDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const user = await User.findById(id).select('-password')
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    // 해당 유저의 활동 통계
    const [gameCount, reviewCount, playCount, favoriteCount] = await Promise.all([
      Game.countDocuments({ developerId: id }),
      Review.countDocuments({ userId: id }),
      PlayerActivity.countDocuments({ userId: id, type: 'play' }),
      PlayerActivity.countDocuments({ userId: id, type: 'favorite' })
    ])

    res.json({ success: true, user, stats: { gameCount, reviewCount, playCount, favoriteCount } })
  } catch {
    res.status(500).json({ message: '회원 상세 조회 실패' })
  }
}

// ── 게임 승인 대기 목록 ───────────────────────────────────────────
export const getPendingGames = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, approvalStatus } = req.query
    const filter: Record<string, unknown> = {}
    if (approvalStatus) filter.approvalStatus = approvalStatus
    else filter.approvalStatus = { $in: ['pending', 'review'] }
    const total = await Game.countDocuments(filter)
    const games = await Game.find(filter)
      .populate('developerId', 'username email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ games, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '게임 목록 조회 실패' })
  }
}

// ── 전체 게임 목록 (관리자) ───────────────────────────────────────
export const getAllGamesAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, approvalStatus, search } = req.query
    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (approvalStatus) filter.approvalStatus = approvalStatus
    if (search) filter.title = { $regex: search, $options: 'i' }
    const total = await Game.countDocuments(filter)
    const games = await Game.find(filter)
      .populate('developerId', 'username email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ games, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '게임 목록 조회 실패' })
  }
}

// ── 게임 승인/거부/검토 ───────────────────────────────────────────
export const approveGame = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { action, rejectionReason, adminNote } = req.body
    if (!['approve', 'reject', 'review'].includes(action))
      return res.status(400).json({ message: '유효하지 않은 액션입니다' })
    const update: Record<string, unknown> = {}
    if (action === 'approve') {
      update.approvalStatus = 'approved'
      update.status = 'beta'
      update.approvedAt = new Date()
      update.approvedBy = req.user!.id
    } else if (action === 'reject') {
      update.approvalStatus = 'rejected'
      update.rejectionReason = rejectionReason || '심사 기준 미충족'
    } else {
      update.approvalStatus = 'review'
    }
    if (adminNote) update.adminNote = adminNote
    const game = await Game.findByIdAndUpdate(id, update, { new: true }).populate('developerId', 'username email')
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    res.json({ message: `게임이 ${action === 'approve' ? '승인' : action === 'reject' ? '거부' : '검토 중으로 변경'}되었습니다`, game })
  } catch {
    res.status(500).json({ message: '게임 승인 처리 실패' })
  }
}

// ── 게임 상태 제어 (중지/재활성화/종료) ──────────────────────────
export const controlGameStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body

    const VALID = ['suspend', 'reactivate', 'archive', 'set_beta', 'set_published']
    if (!VALID.includes(action))
      return res.status(400).json({ message: '유효하지 않은 액션입니다' })

    const update: Record<string, unknown> = {}
    let msg = ''

    if (action === 'suspend') {
      update.status = 'draft'
      update.suspendReason = reason || '관리자에 의해 중지됨'
      update.suspendedAt = new Date()
      msg = '게임 서비스가 중지되었습니다'
    } else if (action === 'reactivate') {
      const game = await Game.findByIdAndUpdate(
        id,
        { $set: { status: 'beta' }, $unset: { suspendReason: '', suspendedAt: '' } },
        { new: true }
      ).populate('developerId', 'username email')
      if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
      return res.json({ success: true, message: '게임이 재활성화되었습니다', game })
    } else if (action === 'archive') {
      update.status = 'archived'
      update.archivedAt = new Date()
      update.archiveReason = reason || '베타 서비스 종료'
      msg = '게임이 종료 처리되었습니다'
    } else if (action === 'set_beta') {
      update.status = 'beta'
      msg = '게임 상태가 베타로 변경되었습니다'
    } else if (action === 'set_published') {
      update.status = 'published'
      msg = '게임이 정식 출시 상태로 변경되었습니다'
    }

    const game = await Game.findByIdAndUpdate(id, update, { new: true }).populate('developerId', 'username email')
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    res.json({ success: true, message: msg, game })
  } catch {
    res.status(500).json({ message: '게임 상태 변경 실패' })
  }
}

// ── 게임 아카이브 (기존 호환) ─────────────────────────────────────
export const archiveGame = async (req: AuthRequest, res: Response) => {
  req.body = { ...req.body, action: 'archive', reason: req.body.archiveReason || req.body.reason || '베타 서비스 종료' }
  return controlGameStatus(req, res)
}

// ── 게임별 세부 지표 ──────────────────────────────────────────────
export const getGameMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const game = await Game.findById(id).populate('developerId', 'username email')
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })

    const gameObjId = game._id

    // 리뷰 통계 — aggregation으로 메모리 효율화
    const [reviewStats] = await Review.aggregate([
      { $match: { gameId: gameObjId } },
      { $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        totalRating: { $sum: '$rating' },
        verifiedTesterCount: { $sum: { $cond: ['$isVerifiedTester', 1, 0] } }
      }}
    ])
    const totalReviews = reviewStats?.totalReviews || 0
    const avgRating = totalReviews > 0
      ? Math.round((reviewStats.totalRating / totalReviews) * 10) / 10 : 0
    const verifiedTesterCount = reviewStats?.verifiedTesterCount || 0

    // 별점 분포
    const ratingDistRaw = await Review.aggregate([
      { $match: { gameId: gameObjId } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ])
    const ratingDist = [1,2,3,4,5].map((n) => ({
      rating: n,
      count: ratingDistRaw.find((r) => r._id === n)?.count || 0
    }))

    // 피드백 유형 분포
    const feedbackRaw = await Review.aggregate([
      { $match: { gameId: gameObjId } },
      { $group: { _id: '$feedbackType', count: { $sum: 1 } } }
    ])
    const feedbackTypes = feedbackRaw.reduce((acc: Record<string, number>, r) => {
      acc[r._id] = r.count; return acc
    }, {})

    // 버그 심각도 분포
    const bugSeverityRaw = await Review.aggregate([
      { $match: { gameId: gameObjId, feedbackType: 'bug', bugSeverity: { $exists: true, $ne: null } } },
      { $group: { _id: '$bugSeverity', count: { $sum: 1 } } }
    ])
    const bugSeverityDist = ['low', 'medium', 'high', 'critical']
      .map((s) => ({ severity: s, count: bugSeverityRaw.find((r) => r._id === s)?.count || 0 }))
      .filter((s) => s.count > 0)

    // 플레이 관련 aggregation 병렬 실행
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [playTrend, weeklyTrend, uniqueTesterAgg, sessionAgg] = await Promise.all([
      PlayerActivity.aggregate([
        { $match: { gameId: gameObjId, type: 'play', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          plays: { $sum: 1 },
          avgDuration: { $avg: '$sessionDuration' }
        }},
        { $sort: { _id: 1 } }
      ]),
      PlayerActivity.aggregate([
        { $match: { gameId: gameObjId, type: 'play', createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          plays: { $sum: 1 },
          avgDuration: { $avg: '$sessionDuration' },
          uniqueUsers: { $addToSet: '$userId' }
        }},
        { $project: { _id: 1, plays: 1, avgDuration: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
        { $sort: { _id: 1 } }
      ]),
      PlayerActivity.aggregate([
        { $match: { gameId: gameObjId, type: 'play' } },
        { $group: { _id: '$userId' } },
        { $count: 'total' }
      ]),
      PlayerActivity.aggregate([
        { $match: { gameId: gameObjId, type: 'play', sessionDuration: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$sessionDuration' }, total: { $sum: '$sessionDuration' } } }
      ])
    ])
    const uniqueTesters = uniqueTesterAgg[0]?.total || 0
    const avgSessionDuration = Math.round(sessionAgg[0]?.avg || 0)
    const totalPlayTime = Math.round((sessionAgg[0]?.total || 0) / 60)

    // 즐겨찾기 수 + 최근 리뷰 + 도움됨 TOP 병렬 실행
    const [favoriteCount, recentReviews, topHelpfulReviews] = await Promise.all([
      PlayerActivity.countDocuments({ gameId: gameObjId, type: 'favorite' }),
      Review.find({ gameId: id })
        .populate('userId', 'username')
        .sort({ createdAt: -1 }).limit(10),
      Review.find({ gameId: id, isBlocked: { $ne: true }, helpfulCount: { $gt: 0 } })
        .populate('userId', 'username')
        .sort({ helpfulCount: -1 }).limit(3)
    ])

    res.json({
      success: true,
      game,
      metrics: {
        totalPlayCount: game.playCount || 0,
        uniqueTesters,
        avgSessionDuration,
        totalPlayTime,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        favoriteCount,
        verifiedTesterCount,
        ratingDist,
        feedbackTypes,
        bugSeverityDist,
        playTrend,
        weeklyTrend,
        recentReviews,
        topHelpfulReviews
      }
    })
  } catch {
    res.status(500).json({ message: '지표 조회 실패' })
  }
}

// ── 리뷰 전체 목록 (커뮤니티 모니터링) ───────────────────────────
export const getAllReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, isBlocked, gameId } = req.query
    const filter: Record<string, unknown> = {}
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true'
    if (gameId) filter.gameId = gameId
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ]
    const total = await Review.countDocuments(filter)
    const reviews = await Review.find(filter)
      .populate('userId', 'username email')
      .populate('gameId', 'title')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ reviews, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '리뷰 목록 조회 실패' })
  }
}

// ── 리뷰 차단/해제 ────────────────────────────────────────────────
export const blockReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { isBlocked, blockReason } = req.body
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked는 boolean이어야 합니다' })
    }
    let updateOp: Record<string, unknown>
    if (isBlocked) {
      updateOp = { $set: { isBlocked: true, blockReason: blockReason || '관리자에 의해 차단됨', blockedAt: new Date() } }
    } else {
      updateOp = { $set: { isBlocked: false }, $unset: { blockReason: '', blockedAt: '' } }
    }
    const review = await Review.findByIdAndUpdate(id, updateOp, { new: true })
      .populate('userId', 'username')
      .populate('gameId', 'title')
    if (!review) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' })
    res.json({ success: true, message: isBlocked ? '리뷰가 차단되었습니다' : '차단이 해제되었습니다', review })
  } catch {
    res.status(500).json({ message: '리뷰 처리 실패' })
  }
}

// ── 리뷰 삭제 ────────────────────────────────────────────────────
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const review = await Review.findByIdAndDelete(id)
    if (!review) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' })
    res.json({ success: true, message: '리뷰가 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '리뷰 삭제 실패' })
  }
}

// ── 공지사항 CRUD ─────────────────────────────────────────────────
export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, type, isPublished } = req.query
    const filter: Record<string, unknown> = {}
    if (type) filter.type = type
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true'
    const total = await Announcement.countDocuments(filter)
    const announcements = await Announcement.find(filter)
      .populate('authorId', 'username')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    res.json({ announcements, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) })
  } catch {
    res.status(500).json({ message: '공지사항 조회 실패' })
  }
}

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, priority, isPinned, isPublished, expiresAt, targetRole } = req.body
    const announcement = new Announcement({
      title, content,
      type: type || 'notice',
      priority: priority || 'normal',
      authorId: req.user!.id,
      isPinned: isPinned || false,
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      targetRole: targetRole || 'all'
    })
    await announcement.save()
    res.status(201).json({ message: '공지사항이 생성되었습니다', announcement })
  } catch {
    res.status(500).json({ message: '공지사항 생성 실패' })
  }
}

export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body
    if (updateData.isPublished && !updateData.publishedAt) updateData.publishedAt = new Date()
    const announcement = await Announcement.findByIdAndUpdate(id, updateData, { new: true })
    if (!announcement) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' })
    res.json({ message: '공지사항이 수정되었습니다', announcement })
  } catch {
    res.status(500).json({ message: '공지사항 수정 실패' })
  }
}

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const announcement = await Announcement.findByIdAndDelete(id)
    if (!announcement) return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' })
    res.json({ message: '공지사항이 삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '공지사항 삭제 실패' })
  }
}

export const getPublicAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const announcements = await Announcement.find({
      isPublished: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }]
    })
      .populate('authorId', 'username')
      .sort({ isPinned: -1, publishedAt: -1 })
      .limit(10)
    res.json({ announcements })
  } catch {
    res.status(500).json({ message: '공지사항 조회 실패' })
  }
}

// ── 신규 회원 승인/거절 (전체 회원 유형) ──────────────────────────
export const approveUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { approvalStatus, rejectedReason } = req.body

    if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'approvalStatus는 approved 또는 rejected여야 합니다' })
    }

    const user = await User.findById(id)
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' })

    const update: Record<string, unknown> = {
      approvalStatus,
      approvedAt: approvalStatus === 'approved' ? new Date() : undefined,
    }
    if (approvalStatus === 'rejected' && rejectedReason) {
      update.approvalRejectedReason = rejectedReason
    }

    // 기업회원인 경우 companyInfo.approvalStatus도 동기화
    if (user.memberType === 'corporate') {
      update['companyInfo.approvalStatus'] = approvalStatus
      update['companyInfo.isApproved'] = approvalStatus === 'approved'
      if (approvalStatus === 'rejected' && rejectedReason) {
        update['companyInfo.rejectedReason'] = rejectedReason
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, update, { new: true }).select('-password')
    res.json({
      message: approvalStatus === 'approved' ? '회원이 승인되었습니다' : '회원이 거절되었습니다',
      user: updatedUser,
    })
  } catch {
    res.status(500).json({ message: '회원 승인 처리 실패' })
  }
}

// ── 승인 대기 회원 수 통계 ──────────────────────────────────────
export const getPendingMemberCounts = async (req: AuthRequest, res: Response) => {
  try {
    const [total, admin, corporate, individual] = await Promise.all([
      User.countDocuments({ approvalStatus: 'pending' }),
      User.countDocuments({ approvalStatus: 'pending', role: 'admin' }),
      User.countDocuments({ approvalStatus: 'pending', memberType: 'corporate' }),
      User.countDocuments({ approvalStatus: 'pending', memberType: 'individual' }),
    ])
    res.json({ total, admin, corporate, individual })
  } catch {
    res.status(500).json({ message: '대기 회원 수 조회 실패' })
  }
}

// ── 관리자 계정 생성 ────────────────────────────────────────────
export const createAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, password, adminLevel } = req.body

    // super 관리자만 관리자 계정 생성 가능
    const currentUser = await User.findById(req.user!.id)
    if (!currentUser || currentUser.adminLevel !== 'super') {
      return res.status(403).json({ message: 'Super 관리자만 관리자 계정을 생성할 수 있습니다' })
    }

    if (!email || !username || !password) {
      return res.status(400).json({ message: '이메일, 사용자명, 비밀번호는 필수입니다' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '비밀번호는 최소 6자 이상이어야 합니다' })
    }
    if (!adminLevel || !['super', 'normal', 'monitor'].includes(adminLevel)) {
      return res.status(400).json({ message: '관리자 등급을 선택해주세요 (super/normal/monitor)' })
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 이메일 또는 사용자명입니다' })
    }

    const hashedPw = await hashPassword(password)
    const user = await User.create({
      email,
      username,
      password: hashedPw,
      role: 'admin',
      adminLevel,
      memberType: 'individual',
      approvalStatus: 'approved',
      approvedAt: new Date(),
      isActive: true,
    })

    res.status(201).json({
      message: '관리자 계정이 생성되었습니다',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        adminLevel: user.adminLevel,
      },
    })
  } catch {
    res.status(500).json({ message: '관리자 계정 생성 실패' })
  }
}
