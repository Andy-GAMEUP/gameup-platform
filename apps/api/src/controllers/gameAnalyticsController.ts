import { Response } from 'express'
import mongoose from 'mongoose'
import {
  GameModel as Game,
  PaymentModel as Payment,
  PlayerActivityModel as PlayerActivity,
  GamePointLogModel as GamePointLog,
} from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { buildAnalyticsWorkbook, GameAnalyticsExportData, DailyPoint, RetentionPoint } from '../services/analyticsExportService'

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
export const getDeveloperOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const mode = req.query.mode === 'lifetime' ? 'lifetime' : 'range'
    const { from, to } = parseRange(req, 30)

    // 권한: 개발자 → 자기 게임만, admin → 전체
    const filter = req.user.role === 'admin' ? {} : { developerId: req.user.id }
    const games = await Game.find(filter).sort({ createdAt: -1 })

    let summary = {
      totalGames: games.length,
      totalRevenue: 0,
      totalActiveUsers: 0,
      avgARPPU: 0,
      revenueChange: 0,
      activeChange: 0,
      arppuChange: 0,
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
    const arppuVals = gameRows.filter(g => g.arppu > 0).map(g => g.arppu)
    summary.avgARPPU = arppuVals.length ? Math.round(arppuVals.reduce((s, v) => s + v, 0) / arppuVals.length) : 0

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
      const prevArppuVals = prevMetricsArr.filter(m => m.arppu > 0).map(m => m.arppu)
      const prevArppu = prevArppuVals.length ? Math.round(prevArppuVals.reduce((s, v) => s + v, 0) / prevArppuVals.length) : 0

      const pct = (cur: number, prev: number) =>
        prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : (cur > 0 ? 100 : 0)

      summary.revenueChange = pct(summary.totalRevenue, prevRevenue)
      summary.activeChange = pct(summary.totalActiveUsers, prevActive)
      summary.arppuChange = pct(summary.avgARPPU, prevArppu)
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
// 2) 게임 단일 분석
// ============================================================================
async function buildFullAnalytics(gameId: mongoose.Types.ObjectId, gameTitle: string, from: Date, to: Date) {
  const metrics = await computeGameMetrics(gameId, from, to)

  // 일별 시계열 (DAU/신규/매출)
  const days: string[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days.push(ymd(d))
  }

  const [activityDaily, loginDaily, newDaily, revenueDaily] = await Promise.all([
    PlayerActivity.aggregate([
      { $match: { gameId, createdAt: { $gte: from, $lte: to } } },
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

  const daily: DailyPoint[] = days.map(date => ({
    date,
    dau: dauByDate.get(date) || 0,
    newMembers: newByDate.get(date) || 0,
    payingUsers: revByDate.get(date)?.payers || 0,
    revenue: revByDate.get(date)?.revenue || 0,
  }))

  // D+0 ~ D+30 리텐션 (코호트: from 기준 게임 가입 유저)
  // 코호트: 기간 내 game_account_create 한 유저들의 N일 후 활동 비율
  const cohortUsers = await GamePointLog.aggregate([
    { $match: { gameId, type: 'game_account_create', createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: '$userId', firstAt: { $min: '$createdAt' } } },
  ] as never) as Array<{ _id: mongoose.Types.ObjectId; firstAt: Date }>

  const retention: RetentionPoint[] = []
  if (cohortUsers.length > 0) {
    const userIds = cohortUsers.map(c => c._id)
    const firstAtMap = new Map(cohortUsers.map(c => [String(c._id), c.firstAt]))

    // 활동 데이터 한 번에 가져와 메모리에서 일자 차이 계산
    const acts = await PlayerActivity.find({
      gameId, userId: { $in: userIds },
    }).select('userId createdAt').lean()
    const logs = await GamePointLog.find({
      gameId, userId: { $in: userIds }, type: 'game_daily_login',
    }).select('userId createdAt').lean()

    // userId별 day-offset 집합
    const dayOffsetByUser = new Map<string, Set<number>>()
    const allActs = [...acts, ...logs] as Array<{ userId: mongoose.Types.ObjectId; createdAt: Date }>
    for (const a of allActs) {
      const uid = String(a.userId)
      const first = firstAtMap.get(uid)
      if (!first) continue
      const diff = Math.floor((a.createdAt.getTime() - first.getTime()) / (24 * 60 * 60 * 1000))
      if (diff < 0 || diff > 30) continue
      if (!dayOffsetByUser.has(uid)) dayOffsetByUser.set(uid, new Set())
      dayOffsetByUser.get(uid)!.add(diff)
    }

    for (let day = 0; day <= 30; day++) {
      let count = 0
      for (const set of dayOffsetByUser.values()) {
        if (set.has(day)) count++
      }
      retention.push({
        day,
        rate: Number(((count / cohortUsers.length) * 100).toFixed(2)),
        cohortSize: cohortUsers.length,
      })
    }
  } else {
    for (let day = 0; day <= 30; day++) {
      retention.push({ day, rate: 0, cohortSize: 0 })
    }
  }

  return {
    gameTitle,
    from: ymd(from),
    to: ymd(to),
    overview: metrics,
    daily,
    retention,
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
