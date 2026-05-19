import { Response } from 'express'
import mongoose from 'mongoose'
import {
  GameModel as Game,
  PaymentModel as Payment,
  PlayerActivityModel as PlayerActivity,
  GamePointLogModel as GamePointLog,
  GameShopItemModel as GameShopItem,
} from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { buildAnalyticsWorkbook, buildDashboardWorkbook, GameAnalyticsExportData, DailyPoint, RetentionPoint } from '../services/analyticsExportService'

// ============================================================================
// 공통 유틸
// ============================================================================
function parseRange(req: AuthRequest, defaultDays = 30): { from: Date; to: Date } {
  const to = req.query.to ? new Date(String(req.query.to)) : new Date()
  to.setHours(23, 59, 59, 999)
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(to.getTime() - (defaultDays - 1) * 24 * 60 * 60 * 1000)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

function ymd(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function ensureGameAccess(gameId: string, req: AuthRequest): Promise<{ ok: boolean; game?: { _id: mongoose.Types.ObjectId; title: string }; error?: string; status?: number }> {
  if (!mongoose.isValidObjectId(gameId)) return { ok: false, error: '잘못된 게임 ID', status: 400 }
  const game = await Game.findById(gameId).select('_id title developerId')
  if (!game) return { ok: false, error: '게임을 찾을 수 없습니다', status: 404 }
  if (req.user!.role !== 'admin' && game.developerId.toString() !== req.user!.id) {
    return { ok: false, error: '권한이 없습니다', status: 403 }
  }
  return { ok: true, game: { _id: game._id as mongoose.Types.ObjectId, title: game.title } }
}

// ============================================================================
// 게임 단위 지표 계산 (overview & analytics 공용)
// ============================================================================
interface GameMetrics {
  cumulativeMembers: number
  newMembers: number
  avgDau: number
  mau: number
  totalRevenue: number
  payingUsers: number
  pur: number       // 결제 유저 / DAU * 100
  arppu: number     // 매출 / 결제 유저
  arpu: number      // 매출 / DAU
  activeUsers: number  // 기간 내 distinct 활동 유저
}

async function computeGameMetrics(gameId: mongoose.Types.ObjectId, from: Date, to: Date): Promise<GameMetrics> {
  // 누적 회원: GamePointLog game_account_create distinct userId (전 기간)
  const cumulativeArr = await GamePointLog.distinct('userId', {
    gameId, type: 'game_account_create',
  })
  const cumulativeMembers = cumulativeArr.length

  // 신규 가입: 기간 내 game_account_create distinct userId
  const newArr = await GamePointLog.distinct('userId', {
    gameId, type: 'game_account_create',
    createdAt: { $gte: from, $lte: to },
  })
  const newMembers = newArr.length

  // 일별 DAU 산출 (PlayerActivity + GamePointLog game_daily_login 통합)
  const dauPipeline = [
    { $match: { gameId, createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' },
      },
    },
    { $group: { _id: '$_id.date', users: { $sum: 1 } } },
  ]
  const [activityDaily, loginDaily] = await Promise.all([
    PlayerActivity.aggregate(dauPipeline as never),
    GamePointLog.aggregate([
      { $match: { gameId, type: 'game_daily_login', createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
      { $group: { _id: '$_id.date', users: { $sum: 1 } } },
    ] as never),
  ])
  const dauMap = new Map<string, number>()
  for (const r of [...activityDaily, ...loginDaily]) {
    const cur = dauMap.get(r._id) || 0
    dauMap.set(r._id, Math.max(cur, r.users))
  }
  const dauValues = Array.from(dauMap.values())
  const avgDau = dauValues.length ? Math.round(dauValues.reduce((s, v) => s + v, 0) / dauValues.length) : 0

  // MAU: 기간 내 distinct active userId
  const [activityUsers, loginUsers] = await Promise.all([
    PlayerActivity.distinct('userId', { gameId, createdAt: { $gte: from, $lte: to } }),
    GamePointLog.distinct('userId', { gameId, type: 'game_daily_login', createdAt: { $gte: from, $lte: to } }),
  ])
  const activeUserSet = new Set<string>([
    ...activityUsers.map(String),
    ...loginUsers.map(String),
  ])
  const mau = activeUserSet.size
  const activeUsers = mau

  // 매출 & 결제 유저
  const revenueAgg = await Payment.aggregate([
    { $match: { gameId, status: 'completed', createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, revenue: { $sum: '$amount' }, payers: { $addToSet: '$userId' } } },
  ])
  const totalRevenue = revenueAgg[0]?.revenue || 0
  const payingUsers = revenueAgg[0]?.payers?.length || 0

  // PUR = 결제유저 / DAU * 100  (avgDau 분모)
  const pur = avgDau > 0 ? Number(((payingUsers / avgDau) * 100).toFixed(2)) : 0
  // ARPPU = revenue / payingUsers
  const arppu = payingUsers > 0 ? Math.round(totalRevenue / payingUsers) : 0
  // ARPU = revenue / DAU
  const arpu = avgDau > 0 ? Math.round(totalRevenue / avgDau) : 0

  return {
    cumulativeMembers, newMembers, avgDau, mau, totalRevenue, payingUsers,
    pur, arppu, arpu, activeUsers,
  }
}

// ============================================================================
// 1) 개발자 대시보드 Overview
//    Query: from?, to?, mode? ('range' | 'lifetime')
//    - lifetime: 게임 등록일부터 현재까지 (개별 게임마다 상이)
// ============================================================================
// ============================================================================
// 0) 개발자 일별 집계 (대시보드 차트용)
// ============================================================================
export const getDeveloperDaily = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const mode = req.query.mode === 'lifetime' ? 'lifetime' : 'range'
    const { from, to } = parseRange(req, 30)

    const filter = req.user.role === 'admin' ? {} : { developerId: req.user.id }
    const games = await Game.find(filter).select('_id createdAt')
    const gameIds = games.map(g => g._id)

    const effectiveFrom = mode === 'lifetime'
      ? games.reduce((min, g) => g.createdAt < min ? g.createdAt : min, new Date())
      : from
    const effectiveTo = to

    // 날짜 배열 생성
    const days: string[] = []
    for (let d = new Date(effectiveFrom); d <= effectiveTo; d.setDate(d.getDate() + 1)) {
      days.push(ymd(new Date(d)))
    }

    const [revenueDaily, activityDaily, loginDaily, newMembersDaily] = await Promise.all([
      Payment.aggregate([
        { $match: { gameId: { $in: gameIds }, status: 'completed', createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' }, payers: { $addToSet: '$userId' } } },
      ]),
      PlayerActivity.aggregate([
        { $match: { gameId: { $in: gameIds }, createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
        { $group: { _id: '$_id.date', dau: { $sum: 1 } } },
      ]),
      GamePointLog.aggregate([
        { $match: { gameId: { $in: gameIds }, type: 'game_daily_login', createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
        { $group: { _id: '$_id.date', dau: { $sum: 1 } } },
      ]),
      GamePointLog.aggregate([
        { $match: { gameId: { $in: gameIds }, type: 'game_account_create', createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
    ])

    const revMap = new Map<string, { revenue: number; payers: number }>(
      revenueDaily.map((r: { _id: string; revenue: number; payers: unknown[] }) => [r._id, { revenue: r.revenue, payers: r.payers.length }])
    )
    const dauMap = new Map<string, number>()
    for (const r of [...activityDaily, ...loginDaily] as { _id: string; dau: number }[]) {
      dauMap.set(r._id, Math.max(dauMap.get(r._id) || 0, r.dau))
    }
    const newMap = new Map<string, number>(newMembersDaily.map((r: { _id: string; count: number }) => [r._id, r.count]))

    const daily = days.map(date => ({
      date,
      revenue: revMap.get(date)?.revenue || 0,
      payingUsers: revMap.get(date)?.payers || 0,
      dau: dauMap.get(date) || 0,
      newMembers: newMap.get(date) || 0,
    }))

    res.json({ success: true, from: ymd(effectiveFrom), to: ymd(effectiveTo), daily })
  } catch (error) {
    console.error('Get developer daily error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// ============================================================================
// 1) 개발자 대시보드 Overview
export const getDeveloperOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const mode = req.query.mode === 'lifetime' ? 'lifetime' : 'range'
    const { from, to } = parseRange(req, 30)

    // 권한: 개발자 → 자기 게임만, admin → 전체
    const filter = req.user.role === 'admin' ? {} : { developerId: req.user.id }
    const games = await Game.find(filter).sort({ createdAt: -1 })

    let summary = {
      totalRevenue: 0,
      totalActiveUsers: 0,
      totalNewMembers: 0,
      avgPUR: 0,
      revenueChange: 0,
      activeChange: 0,
      newMembersChange: 0,
      purChange: 0,
    }

    const gameRows = await Promise.all(games.map(async (g) => {
      const range = mode === 'lifetime'
        ? { from: g.createdAt, to: new Date() }
        : { from, to }
      const metrics = await computeGameMetrics(g._id as mongoose.Types.ObjectId, range.from, range.to)
      return {
        id: String(g._id),
        title: g.title,
        genre: g.genre,
        serviceType: g.serviceType,
        monetization: g.monetization,
        rating: g.rating,
        approvalStatus: g.approvalStatus,
        status: g.status,
        revenue: metrics.totalRevenue,
        activeUsers: metrics.activeUsers,
        avgDau: metrics.avgDau,
        arppu: metrics.arppu,
        pur: metrics.pur,
        cumulativeMembers: metrics.cumulativeMembers,
        newMembers: metrics.newMembers,
      }
    }))

    summary.totalRevenue = gameRows.reduce((s, g) => s + g.revenue, 0)
    summary.totalActiveUsers = gameRows.reduce((s, g) => s + g.activeUsers, 0)
    summary.totalNewMembers = gameRows.reduce((s, g) => s + g.newMembers, 0)
    const purVals = gameRows.filter(g => g.pur > 0).map(g => g.pur)
    summary.avgPUR = purVals.length ? Number((purVals.reduce((s, v) => s + v, 0) / purVals.length).toFixed(2)) : 0

    // 증감률: 직전 동일 기간 대비 (range 모드일 때만)
    if (mode === 'range') {
      const span = to.getTime() - from.getTime()
      const prevTo = new Date(from.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - span)
      const prevMetricsArr = await Promise.all(
        games.map(g => computeGameMetrics(g._id as mongoose.Types.ObjectId, prevFrom, prevTo))
      )
      const prevRevenue = prevMetricsArr.reduce((s, m) => s + m.totalRevenue, 0)
      const prevActive = prevMetricsArr.reduce((s, m) => s + m.activeUsers, 0)
      const prevNewMembers = prevMetricsArr.reduce((s, m) => s + m.newMembers, 0)
      const prevPurVals = prevMetricsArr.filter(m => m.pur > 0).map(m => m.pur)
      const prevPur = prevPurVals.length ? prevPurVals.reduce((s, v) => s + v, 0) / prevPurVals.length : 0

      const pct = (cur: number, prev: number) =>
        prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : (cur > 0 ? 100 : 0)

      summary.revenueChange = pct(summary.totalRevenue, prevRevenue)
      summary.activeChange = pct(summary.totalActiveUsers, prevActive)
      summary.newMembersChange = pct(summary.totalNewMembers, prevNewMembers)
      summary.purChange = pct(summary.avgPUR, prevPur)
    }

    res.json({
      success: true,
      mode,
      from: ymd(from),
      to: ymd(to),
      summary,
      games: gameRows,
    })
  } catch (error) {
    console.error('Get developer overview error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// ============================================================================
// 1-b) 개발자 대시보드 엑셀 다운로드
// ============================================================================
export const exportDeveloperDashboard = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const mode = req.query.mode === 'lifetime' ? 'lifetime' : 'range'
    const { from, to } = parseRange(req, 30)

    const filter = req.user.role === 'admin' ? {} : { developerId: req.user.id }
    const games = await Game.find(filter).sort({ createdAt: -1 })
    const gameIds = games.map(g => g._id)

    const effectiveFrom = mode === 'lifetime'
      ? games.reduce((min, g) => g.createdAt < min ? g.createdAt : min, new Date())
      : from
    const effectiveTo = to

    // 일별 데이터
    const days: string[] = []
    for (let d = new Date(effectiveFrom); d <= effectiveTo; d.setDate(d.getDate() + 1)) {
      days.push(ymd(new Date(d)))
    }

    const [revenueDaily, activityDaily, loginDaily] = await Promise.all([
      Payment.aggregate([
        { $match: { gameId: { $in: gameIds }, status: 'completed', createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
      ]),
      PlayerActivity.aggregate([
        { $match: { gameId: { $in: gameIds }, createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
        { $group: { _id: '$_id.date', dau: { $sum: 1 } } },
      ]),
      GamePointLog.aggregate([
        { $match: { gameId: { $in: gameIds }, type: 'game_daily_login', createdAt: { $gte: effectiveFrom, $lte: effectiveTo } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
        { $group: { _id: '$_id.date', dau: { $sum: 1 } } },
      ]),
    ])

    const revMap = new Map<string, number>(revenueDaily.map((r: { _id: string; revenue: number }) => [r._id, r.revenue]))
    const dauMap = new Map<string, number>()
    for (const r of [...activityDaily, ...loginDaily] as { _id: string; dau: number }[]) {
      dauMap.set(r._id, Math.max(dauMap.get(r._id) || 0, r.dau))
    }
    const daily = days.map(date => ({ date, revenue: revMap.get(date) || 0, dau: dauMap.get(date) || 0 }))

    // 게임별 지표
    const gameRows = await Promise.all(games.map(async (g) => {
      const range = mode === 'lifetime' ? { from: g.createdAt, to: new Date() } : { from, to }
      const metrics = await computeGameMetrics(g._id as mongoose.Types.ObjectId, range.from, range.to)
      return {
        title: g.title,
        serviceType: g.serviceType,
        monetization: g.monetization,
        revenue: metrics.totalRevenue,
        activeUsers: metrics.activeUsers,
        avgDau: metrics.avgDau,
        arppu: metrics.arppu,
        pur: metrics.pur,
        cumulativeMembers: metrics.cumulativeMembers,
        newMembers: metrics.newMembers,
      }
    }))

    const totalRevenue = gameRows.reduce((s, g) => s + g.revenue, 0)
    const totalActiveUsers = gameRows.reduce((s, g) => s + g.activeUsers, 0)
    const totalNewMembers = gameRows.reduce((s, g) => s + g.newMembers, 0)
    const purVals = gameRows.filter(g => g.pur > 0).map(g => g.pur)
    const avgPUR = purVals.length ? Number((purVals.reduce((s, v) => s + v, 0) / purVals.length).toFixed(2)) : 0

    const buffer = buildDashboardWorkbook({
      from: ymd(effectiveFrom),
      to: ymd(effectiveTo),
      summary: { totalRevenue, totalActiveUsers, totalNewMembers, avgPUR },
      daily,
      games: gameRows,
    })

    const filename = `dashboard_${ymd(effectiveFrom)}_${ymd(effectiveTo)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.send(buffer)
  } catch (error) {
    console.error('Export developer dashboard error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// ============================================================================
// 2) 게임 단일 분석
// ============================================================================
async function buildFullAnalytics(gameId: mongoose.Types.ObjectId, gameTitle: string, from: Date, to: Date) {
  const metrics = await computeGameMetrics(gameId, from, to)

  // 일별 시계열 (DAU/신규/매출)
  const days: string[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.push(ymd(d))
  }

  const [activityDaily, loginDaily, newDaily, revenueDaily, sessionDaily] = await Promise.all([
    PlayerActivity.aggregate([
      { $match: { gameId, type: { $ne: 'play' }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
      { $group: { _id: '$_id.date', users: { $sum: 1 } } },
    ] as never),
    GamePointLog.aggregate([
      { $match: { gameId, type: 'game_daily_login', createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, userId: '$userId' } } },
      { $group: { _id: '$_id.date', users: { $sum: 1 } } },
    ] as never),
    GamePointLog.aggregate([
      { $match: { gameId, type: 'game_account_create', createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    ] as never),
    Payment.aggregate([
      { $match: { gameId, status: 'completed', createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          payers: { $addToSet: '$userId' },
        },
      },
    ] as never),
    PlayerActivity.aggregate([
      { $match: { gameId, type: 'play', sessionDuration: { $exists: true, $gt: 0 }, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avgSession: { $avg: '$sessionDuration' },
        },
      },
    ] as never),
  ])

  // 기간 내 결제 완료 유저 ID 목록
  const payerDocs = await Payment.distinct('userId', { gameId, status: 'completed', createdAt: { $gte: from, $lte: to } }) as mongoose.Types.ObjectId[]
  const payerSet = new Set(payerDocs.map(id => String(id)))

  const [sessionPayerDaily, sessionNonPayerDaily] = await Promise.all([
    PlayerActivity.aggregate([
      { $match: { gameId, type: 'play', sessionDuration: { $exists: true, $gt: 0 }, userId: { $in: payerDocs }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, avgSession: { $avg: '$sessionDuration' } } },
    ] as never),
    PlayerActivity.aggregate([
      { $match: { gameId, type: 'play', sessionDuration: { $exists: true, $gt: 0 }, userId: { $nin: payerDocs }, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, avgSession: { $avg: '$sessionDuration' } } },
    ] as never),
  ])

  const dauByDate = new Map<string, number>()
  for (const r of [...activityDaily, ...loginDaily]) {
    const cur = dauByDate.get(r._id) || 0
    dauByDate.set(r._id, Math.max(cur, r.users))
  }
  const newByDate = new Map<string, number>(newDaily.map((r: { _id: string; count: number }) => [r._id, r.count]))
  const revByDate = new Map<string, { revenue: number; payers: number }>(
    revenueDaily.map((r: { _id: string; revenue: number; payers: unknown[] }) => [r._id, { revenue: r.revenue, payers: r.payers.length }])
  )
  const sessionByDate = new Map<string, number>(
    (sessionDaily as Array<{ _id: string; avgSession: number }>).map(r => [r._id, Math.round(r.avgSession)])
  )
  const sessionPayerByDate = new Map<string, number>(
    (sessionPayerDaily as Array<{ _id: string; avgSession: number }>).map(r => [r._id, Math.round(r.avgSession)])
  )
  const sessionNonPayerByDate = new Map<string, number>(
    (sessionNonPayerDaily as Array<{ _id: string; avgSession: number }>).map(r => [r._id, Math.round(r.avgSession)])
  )
  const daily: DailyPoint[] = days.map(date => ({
    date,
    dau: dauByDate.get(date) || 0,
    newMembers: newByDate.get(date) || 0,
    payingUsers: revByDate.get(date)?.payers || 0,
    revenue: revByDate.get(date)?.revenue || 0,
    avgSession: sessionByDate.get(date) || 0,
    avgSessionPayer: sessionPayerByDate.get(date) || 0,
    avgSessionNonPayer: sessionNonPayerByDate.get(date) || 0,
  }))

  // D+0 ~ D+30 리텐션 (롤링 평균)
  // 기간 내 각 날짜의 활동 유저를 일별 코호트로 삼아 D+N 재방문율을 구한 뒤 평균
  const DAY_MS = 24 * 60 * 60 * 1000
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  // D+30 계산을 위해 to 이후 30일까지 데이터 필요
  const extendedTo = new Date(Math.min(to.getTime() + 30 * DAY_MS, today.getTime()))

  const retActs = await PlayerActivity.find({
    gameId, type: { $ne: 'play' }, createdAt: { $gte: from, $lte: extendedTo },
  }).select('userId createdAt').lean()
  const retLogs = await GamePointLog.find({
    gameId, type: 'game_daily_login', createdAt: { $gte: from, $lte: extendedTo },
  }).select('userId createdAt').lean()

  // date string -> Set<userId>
  const activeByDate = new Map<string, Set<string>>()
  const retAllActs = [...retActs, ...retLogs] as Array<{ userId: mongoose.Types.ObjectId; createdAt: Date }>
  for (const a of retAllActs) {
    const key = ymd(a.createdAt)
    if (!activeByDate.has(key)) activeByDate.set(key, new Set())
    activeByDate.get(key)!.add(String(a.userId))
  }

  // 기간 내 날짜 배열
  const periodDays: string[] = []
  for (let t = new Date(from); t <= to; t = new Date(t.getTime() + DAY_MS)) {
    periodDays.push(ymd(t))
  }

  const retention: RetentionPoint[] = []
  for (let day = 0; day <= 30; day++) {
    let sumRate = 0
    let validDays = 0
    let sumCohort = 0

    for (const d of periodDays) {
      const targetDate = new Date(new Date(d).getTime() + day * DAY_MS)
      if (targetDate > today) continue

      const cohort = activeByDate.get(d)
      if (!cohort || cohort.size === 0) continue

      const active = activeByDate.get(ymd(targetDate))
      let returned = 0
      if (active) {
        for (const uid of cohort) {
          if (active.has(uid)) returned++
        }
      }

      sumRate += returned / cohort.size
      sumCohort += cohort.size
      validDays++
    }

    retention.push({
      day,
      rate: validDays > 0 ? Number(((sumRate / validDays) * 100).toFixed(2)) : 0,
      cohortSize: validDays > 0 ? Math.round(sumCohort / validDays) : 0,
    })
  }

  // 결제 상품 판매 순위
  const topItems = await GameShopItem.find({ gameId, active: true })
    .sort({ sales: -1 })
    .select('name price sales currency')
    .lean()

  // 날짜별 코호트 테이블 (히트맵용)
  const numCols = Math.min(periodDays.length + 1, 31)
  const cohortRows = periodDays.map(d => {
    const cohort = activeByDate.get(d)
    const retentions: Array<number | null> = []
    for (let n = 0; n < numCols; n++) {
      const targetDate = new Date(new Date(d).getTime() + n * DAY_MS)
      if (targetDate > today) {
        retentions.push(null)
      } else {
        const active = activeByDate.get(ymd(targetDate))
        let count = 0
        if (cohort && active) {
          for (const uid of cohort) { if (active.has(uid)) count++ }
        }
        retentions.push(count)
      }
    }
    return { date: d, cohortSize: cohort?.size ?? 0, retentions }
  })

  return {
    gameTitle,
    from: ymd(from),
    to: ymd(to),
    overview: metrics,
    daily,
    retention,
    cohortTable: { rows: cohortRows, numCols },
    topItems: topItems.map(i => ({ name: i.name, price: i.price, sales: i.sales, currency: i.currency })),
  }
}

export const getGameAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const access = await ensureGameAccess(req.params.gameId, req)
    if (!access.ok) return res.status(access.status!).json({ message: access.error })

    const { from, to } = parseRange(req, 30)
    const data = await buildFullAnalytics(access.game!._id, access.game!.title, from, to)

    res.json({ success: true, ...data })
  } catch (error) {
    console.error('Get game analytics error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// ============================================================================
// 3) 엑셀 다운로드
// ============================================================================
export const exportGameAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const access = await ensureGameAccess(req.params.gameId, req)
    if (!access.ok) return res.status(access.status!).json({ message: access.error })

    const { from, to } = parseRange(req, 30)
    const data = await buildFullAnalytics(access.game!._id, access.game!.title, from, to)

    const exportData: GameAnalyticsExportData = {
      gameTitle: data.gameTitle,
      from: data.from,
      to: data.to,
      cumulativeMembers: data.overview.cumulativeMembers,
      newMembers: data.overview.newMembers,
      avgDau: data.overview.avgDau,
      mau: data.overview.mau,
      pur: data.overview.pur,
      arppu: data.overview.arppu,
      arpu: data.overview.arpu,
      totalRevenue: data.overview.totalRevenue,
      payingUsers: data.overview.payingUsers,
      daily: data.daily,
      retention: data.retention,
    }

    const buffer = buildAnalyticsWorkbook(exportData)
    const safeTitle = data.gameTitle.replace(/[^\w가-힣\-_]/g, '_').slice(0, 40)
    const filename = `analytics_${safeTitle}_${data.from}_${data.to}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.send(buffer)
  } catch (error) {
    console.error('Export game analytics error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}
