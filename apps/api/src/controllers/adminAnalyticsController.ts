import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  UserModel,
  GameModel,
  PostModel,
  PartnerModel,
  PartnerPostModel,
  PublishingModel,
  MiniHomeModel,
  SeasonModel,
  GameApplicationModel,
  MessageModel,
  SolutionModel,
  PageVisitModel,
} from '@gameup/db'

// ── 대시보드 요약 (KPI + 추이 + 인기페이지 + 메뉴별) ──────────────
export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    // --- 오늘 지표 ---
    const [
      todayVisits,
      todayUniqueVisitors,
      todayNewSessions,
      todayAvgDuration,
      todaySignups,
      todayLogins,
      // 어제 비교용
      yesterdayUniqueVisitors,
      yesterdayPageViews,
      yesterdayAvgDuration,
    ] = await Promise.all([
      PageVisitModel.countDocuments({ createdAt: { $gte: todayStart } }),
      PageVisitModel.distinct('sessionId', { createdAt: { $gte: todayStart } }).then(a => a.length),
      // 신규 방문자: 오늘 처음 등장한 sessionId
      PageVisitModel.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: { _id: '$sessionId', firstVisit: { $min: '$createdAt' } } },
        { $lookup: { from: 'pagevisits', localField: '_id', foreignField: 'sessionId', pipeline: [{ $match: { createdAt: { $lt: todayStart } } }, { $limit: 1 }], as: 'prev' } },
        { $match: { prev: { $size: 0 } } },
        { $count: 'count' },
      ]).then(r => r[0]?.count ?? 0),
      PageVisitModel.aggregate([
        { $match: { createdAt: { $gte: todayStart }, duration: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]).then(r => Math.round(r[0]?.avg ?? 0)),
      UserModel.countDocuments({ createdAt: { $gte: todayStart } }),
      UserModel.countDocuments({ lastLoginAt: { $gte: todayStart } }),
      // 어제 비교
      PageVisitModel.distinct('sessionId', { createdAt: { $gte: yesterdayStart, $lt: todayStart } }).then(a => a.length),
      PageVisitModel.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      PageVisitModel.aggregate([
        { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart }, duration: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]).then(r => Math.round(r[0]?.avg ?? 0)),
    ])

    const todayReturning = todayUniqueVisitors - todayNewSessions

    // --- WAU / MAU ---
    const [wau, mau] = await Promise.all([
      PageVisitModel.distinct('sessionId', { createdAt: { $gte: sevenDaysAgo } }).then(a => a.length),
      PageVisitModel.distinct('sessionId', { createdAt: { $gte: thirtyDaysAgo } }).then(a => a.length),
    ])

    // --- 최근 7일 DAU 추이 ---
    const dau7d = await PageVisitModel.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      { $project: { _id: 0, date: '$_id', count: { $size: '$sessions' } } },
      { $sort: { date: 1 } },
    ])

    // --- 인기 페이지 Top 10 ---
    const topPages = await PageVisitModel.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: '$page',
          menu: { $first: '$menu' },
          views: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $project: {
          _id: 0,
          page: '$_id',
          menu: 1,
          views: 1,
          uniqueVisitors: { $size: '$sessions' },
          avgDuration: { $round: ['$avgDuration', 0] },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ])

    // --- 메뉴별 방문 비율 ---
    const menuBreakdownRaw = await PageVisitModel.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$menu', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
    ])
    const totalMenuViews = menuBreakdownRaw.reduce((s, m) => s + m.views, 0)
    const menuBreakdown = menuBreakdownRaw.map(m => ({
      menu: m._id,
      views: m.views,
      percentage: totalMenuViews > 0 ? Math.round((m.views / totalMenuViews) * 1000) / 10 : 0,
    }))

    // --- 방문자 구성 (회원 vs 비회원) ---
    const memberVisits = await PageVisitModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      userId: { $ne: null },
    })
    const guestVisits = await PageVisitModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      userId: null,
    })

    res.json({
      today: {
        dau: todayUniqueVisitors,
        newVisitors: todayNewSessions,
        returningVisitors: todayReturning,
        avgDuration: todayAvgDuration,
        totalPageViews: todayVisits,
        newSignups: todaySignups,
        activeLogins: todayLogins,
      },
      yesterday: {
        dau: yesterdayUniqueVisitors,
        totalPageViews: yesterdayPageViews,
        avgDuration: yesterdayAvgDuration,
      },
      trends: {
        dau7d,
        wau,
        mau,
      },
      topPages,
      menuBreakdown,
      visitorComposition: {
        members: memberVisits,
        guests: guestVisits,
      },
    })
  } catch (err) {
    console.error('대시보드 요약 조회 실패:', err)
    res.status(500).json({ message: '대시보드 요약 조회 실패' })
  }
}

// ── 방문자/활동 통계 (기간별 추이) ────────────────────────────────
export const getVisitorStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, period = 'day', platform } = req.query

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 86400000)
    const end = endDate ? new Date(String(endDate)) : new Date()
    end.setHours(23, 59, 59, 999)

    let groupFormat: string
    if (period === 'month') groupFormat = '%Y-%m'
    else if (period === 'week') groupFormat = '%Y-%U'
    else groupFormat = '%Y-%m-%d'

    const matchFilter: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } }
    if (platform && platform !== '전체') matchFilter.platform = String(platform)

    // PageVisit 기반 방문자 통계
    const visitAgg = await PageVisitModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          totalPageViews: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          memberSessions: {
            $addToSet: {
              $cond: [{ $ne: ['$userId', null] }, '$sessionId', '$$REMOVE'],
            },
          },
          guestSessions: {
            $addToSet: {
              $cond: [{ $eq: ['$userId', null] }, '$sessionId', '$$REMOVE'],
            },
          },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: { $size: '$sessions' },
          members: { $size: '$memberSessions' },
          guests: { $size: '$guestSessions' },
          avgPageviews: {
            $cond: [
              { $gt: [{ $size: '$sessions' }, 0] },
              { $round: [{ $divide: ['$totalPageViews', { $size: '$sessions' }] }, 1] },
              0,
            ],
          },
          avgDuration: { $round: ['$avgDuration', 0] },
        },
      },
      { $sort: { date: 1 } },
    ])

    // User 모델에서 신규 가입/신규 방문자 집계
    const userMatchFilter: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } }
    const signupAgg = await UserModel.aggregate([
      { $match: userMatchFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ])
    const signupMap: Record<string, number> = {}
    signupAgg.forEach(d => { signupMap[d._id] = d.count })

    // 날짜 기반 머지
    const stats = visitAgg.map(row => ({
      ...row,
      newSignups: signupMap[row.date] ?? 0,
      newVisitors: 0, // 신규 방문자는 세션 첫 등장 기준 — 추후 고도화 가능
    }))

    // visitAgg에 없지만 가입만 있는 날짜도 포함
    for (const [date, count] of Object.entries(signupMap)) {
      if (!stats.find(s => s.date === date)) {
        stats.push({
          date,
          total: 0,
          members: 0,
          guests: 0,
          avgPageviews: 0,
          avgDuration: 0,
          newSignups: count,
          newVisitors: 0,
        })
      }
    }
    stats.sort((a, b) => a.date.localeCompare(b.date))

    res.json({ stats, period })
  } catch (err) {
    console.error('방문자 통계 조회 실패:', err)
    res.status(500).json({ message: '방문자 통계 조회 실패' })
  }
}

// ── 메뉴별 통계 ──────────────────────────────────────────────────
const MENU_LABELS: Record<string, string> = {
  community: '커뮤니티',
  partner: '파트너 채널',
  publishing: '퍼블리싱',
  minihome: '미니홈',
  support: '지원 프로그램',
  solution: '솔루션',
}

const MENU_KEYS = Object.keys(MENU_LABELS)

async function getContentChanges(menu: string, start: Date, end: Date, groupFormat: string) {
  const dateFilter = { $gte: start, $lte: end }

  let model: typeof PostModel | typeof PartnerPostModel | typeof PublishingModel | typeof MiniHomeModel | typeof SolutionModel | null = null
  let dateField = 'createdAt'

  switch (menu) {
    case 'community': model = PostModel; break
    case 'partner': model = PartnerPostModel; break
    case 'publishing': model = PublishingModel; break
    case 'minihome': model = MiniHomeModel; break
    case 'solution': model = SolutionModel; break
    case 'support': {
      // SeasonModel + GameApplicationModel 합산
      const [seasons, apps] = await Promise.all([
        SeasonModel.aggregate([
          { $match: { $or: [{ createdAt: dateFilter }, { updatedAt: dateFilter }] } },
          { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        ]),
        GameApplicationModel.aggregate([
          { $match: { createdAt: dateFilter } },
          { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        ]),
      ])
      const map: Record<string, number> = {}
      for (const s of seasons) map[s._id] = (map[s._id] ?? 0) + s.count
      for (const a of apps) map[a._id] = (map[a._id] ?? 0) + a.count
      return map
    }
  }

  if (!model) return {}

  const agg = await model.aggregate([
    { $match: { $or: [{ createdAt: dateFilter }, { updatedAt: dateFilter }] } },
    { $group: { _id: { $dateToString: { format: groupFormat, date: `$${dateField}` } }, count: { $sum: 1 } } },
  ])
  const map: Record<string, number> = {}
  agg.forEach(d => { map[d._id] = d.count })
  return map
}

export const getMenuStats = async (req: AuthRequest, res: Response) => {
  try {
    const { menu, startDate, endDate, period = 'day', platform } = req.query

    const start = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 86400000)
    const end = endDate ? new Date(String(endDate)) : new Date()
    end.setHours(23, 59, 59, 999)

    let groupFormat: string
    if (period === 'year') groupFormat = '%Y'
    else if (period === 'month') groupFormat = '%Y-%m'
    else groupFormat = '%Y-%m-%d'

    const matchBase: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } }
    if (platform && platform !== '전체') matchBase.platform = String(platform)

    // 특정 메뉴가 지정되지 않은 경우: 전체 메뉴 개요
    if (!menu) {
      const stats = await Promise.all(
        MENU_KEYS.map(async (menuKey) => {
          const filter = { ...matchBase, menu: menuKey }
          const [views, uniqueArr, avgDurAgg] = await Promise.all([
            PageVisitModel.countDocuments(filter),
            PageVisitModel.distinct('sessionId', filter),
            PageVisitModel.aggregate([
              { $match: { ...filter, duration: { $gt: 0 } } },
              { $group: { _id: null, avg: { $avg: '$duration' } } },
            ]),
          ])
          const contentMap = await getContentChanges(menuKey, start, end, groupFormat)
          const contentChanges = Object.values(contentMap).reduce((s, n) => s + n, 0)

          return {
            menu: menuKey,
            label: MENU_LABELS[menuKey],
            views,
            uniqueVisitors: uniqueArr.length,
            avgDuration: Math.round(avgDurAgg[0]?.avg ?? 0),
            contentChanges,
          }
        }),
      )
      return res.json({ stats })
    }

    // 특정 메뉴 지정: 날짜별 추이
    const menuKey = String(menu)
    const menuFilter = { ...matchBase, menu: menuKey }

    const daily = await PageVisitModel.aggregate([
      { $match: menuFilter },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          views: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$sessions' },
          avgDuration: { $round: ['$avgDuration', 0] },
        },
      },
      { $sort: { date: 1 } },
    ])

    // 콘텐츠 변동 합산
    const contentMap = await getContentChanges(menuKey, start, end, groupFormat)
    const dailyWithContent = daily.map(d => ({
      ...d,
      contentChanges: contentMap[d.date] ?? 0,
    }))

    // 인기 하위 페이지 Top 5
    const topSubPages = await PageVisitModel.aggregate([
      { $match: menuFilter },
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 },
          sessions: { $addToSet: '$sessionId' },
        },
      },
      {
        $project: {
          _id: 0,
          page: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$sessions' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 5 },
    ])

    res.json({
      menu: menuKey,
      label: MENU_LABELS[menuKey] ?? menuKey,
      daily: dailyWithContent,
      topSubPages,
    })
  } catch (err) {
    console.error('메뉴 통계 조회 실패:', err)
    res.status(500).json({ message: '메뉴 통계 조회 실패' })
  }
}
