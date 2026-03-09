import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  UserModel,
  GameModel,
  PostModel,
  PartnerModel,
  SeasonModel,
  MessageModel,
  SolutionModel,
} from '@gameup/db'

// ── 방문자/활동 통계 ──────────────────────────────────────────────
export const getVisitorStats = async (req: AuthRequest, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      period = 'day',
    } = req.query

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(String(endDate)) : new Date()
    end.setHours(23, 59, 59, 999)

    let groupFormat: string
    if (period === 'month') {
      groupFormat = '%Y-%m'
    } else if (period === 'week') {
      groupFormat = '%Y-%U'
    } else {
      groupFormat = '%Y-%m-%d'
    }

    // 날짜별 신규 가입자 집계
    const newSignupsAgg = await UserModel.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 날짜별 로그인(마지막 접속) 집계
    const loginAgg = await UserModel.aggregate([
      { $match: { lastLoginAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$lastLoginAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // 날짜 범위 내 모든 날짜 키 수집
    const dateSet = new Set<string>()
    newSignupsAgg.forEach((d) => dateSet.add(d._id))
    loginAgg.forEach((d) => dateSet.add(d._id))

    const signupMap: Record<string, number> = {}
    newSignupsAgg.forEach((d) => { signupMap[d._id] = d.count })
    const loginMap: Record<string, number> = {}
    loginAgg.forEach((d) => { loginMap[d._id] = d.count })

    const stats = Array.from(dateSet)
      .sort()
      .map((date) => ({
        date,
        totalVisitors: (loginMap[date] ?? 0) + (signupMap[date] ?? 0),
        newVisitors: signupMap[date] ?? 0,
        memberAccess: loginMap[date] ?? 0,
        nonMemberVisit: 0,
        newSignups: signupMap[date] ?? 0,
        avgPageViews: 0,
      }))

    res.json({ stats, period })
  } catch {
    res.status(500).json({ message: '방문자 통계 조회 실패' })
  }
}

// ── 메뉴별 통계 ──────────────────────────────────────────────────
export const getMenuStats = async (req: AuthRequest, res: Response) => {
  try {
    const { menu = 'community', startDate, endDate } = req.query

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(String(endDate)) : new Date()
    end.setHours(23, 59, 59, 999)

    const dateFilter = { createdAt: { $gte: start, $lte: end } }

    let result: Record<string, unknown> = {}

    if (menu === 'community') {
      const [postCount, totalViews] = await Promise.all([
        PostModel.countDocuments({ ...dateFilter, status: { $ne: 'deleted' } }),
        PostModel.aggregate([
          { $match: { ...dateFilter, status: { $ne: 'deleted' } } },
          { $group: { _id: null, total: { $sum: '$views' } } },
        ]),
      ])
      result = { menu: 'community', postCount, totalViews: totalViews[0]?.total ?? 0 }
    } else if (menu === 'partner') {
      const partnerCount = await PartnerModel.countDocuments(dateFilter)
      result = { menu: 'partner', partnerCount }
    } else if (menu === 'solutions') {
      const solutionCount = await SolutionModel.countDocuments(dateFilter)
      result = { menu: 'solutions', solutionCount }
    } else {
      result = { menu, message: '해당 메뉴의 통계를 지원하지 않습니다' }
    }

    res.json({ result })
  } catch {
    res.status(500).json({ message: '메뉴 통계 조회 실패' })
  }
}

// ── 대시보드 요약 ────────────────────────────────────────────────
export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      individualUsers,
      corporateUsers,
      totalGamesByStatus,
      totalPosts,
      totalPartners,
      activeSeasons,
      totalMessages,
      totalSolutions,
      recentSignups,
      todaySignups,
      todayLogins,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ memberType: 'individual' }),
      UserModel.countDocuments({ memberType: 'corporate' }),
      GameModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PostModel.countDocuments({ status: { $ne: 'deleted' } }),
      PartnerModel.countDocuments({ status: 'approved' }),
      SeasonModel.countDocuments({ status: 'active' }),
      MessageModel.countDocuments(),
      SolutionModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      UserModel.countDocuments({ createdAt: { $gte: todayStart } }),
      UserModel.countDocuments({ lastLoginAt: { $gte: todayStart } }),
    ])

    const gamesByStatus: Record<string, number> = {}
    for (const item of totalGamesByStatus) {
      gamesByStatus[item._id as string] = item.count
    }

    res.json({
      users: {
        total: totalUsers,
        individual: individualUsers,
        corporate: corporateUsers,
        recentSignups,
      },
      games: {
        total: Object.values(gamesByStatus).reduce((a, b) => a + b, 0),
        byStatus: gamesByStatus,
      },
      totalPosts,
      totalPartners,
      activeSeasons,
      totalMessages,
      totalSolutions,
      today: {
        newSignups: todaySignups,
        logins: todayLogins,
      },
    })
  } catch {
    res.status(500).json({ message: '대시보드 요약 조회 실패' })
  }
}
