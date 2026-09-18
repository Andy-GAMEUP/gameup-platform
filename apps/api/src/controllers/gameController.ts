import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { GameModel as Game, UserModel as User, GameDeletionLogModel as GameDeletionLog, PaymentModel as Payment, GameMediaModel as GameMedia, GameRankingModel, GameTesterApplicationModel as GameTesterApplication } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { grantGameAccessPoint } from '../services/pointService'

export const getAllGames = async (req: AuthRequest, res: Response) => {
  try {
    const { status, genre, search, sort = 'newest', page = 1, limit = 12, serviceType, featuredNew, developerId, includeDeleted, ids } = req.query

    // 관리자이거나 본인 게임을 조회하는 경우 — 심사 상태와 무관하게 전부 볼 수 있어야 하므로, 아래 공개용 승인 안전장치를 건너뜀
    const isPrivileged = req.user?.role === 'admin' || (!!req.user && !!developerId && developerId === req.user.id)

    // 공개 목록의 기본 노출 상태는 getGameById와 동일하게 'published'/'beta' 둘 다 공개로 취급한다
    // (베타 게임은 심사 승인 후에도 status가 'beta'에 머무르고 별도로 'published'로 바뀌지 않으므로, 'published'만 필터링하면 베타존에서 누락됨)
    const filter: Record<string, unknown> = {
      status: { $in: ['published', 'beta'] },
    }

    if (includeDeleted !== 'true') {
      filter.isDeleted = { $ne: true }
    } else {
      // 삭제된 게임을 커뮤니티 탭에 계속 보여줄 때도, 관리자가 수동으로 숨긴 건 제외
      filter.hiddenFromCommunity = { $ne: true }
    }

    if (developerId) {
      filter.developerId = developerId
    }

    if (ids) {
      const idList = (Array.isArray(ids) ? ids : String(ids).split(',')).filter(Boolean)
      filter._id = { $in: idList }
    }

    if (featuredNew === 'true') {
      filter.isNewFeatured = true
    }

    if (serviceType && serviceType !== 'all') {
      // 재심사 중인 published 게임은 스냅샷의 serviceType으로 판단해야 하므로 DB 필터에서 제외하고 앱 레이어에서 처리
      filter.$or = [
        { serviceType },
        { approvalStatus: { $nin: ['approved'] } }
      ]
    }

    if (status && status !== 'all') {
      // 🔒 비공개 상태(draft/pending/review/archived 등) 조회는 본인 게임이거나 관리자일 때만 허용
      if (isPrivileged) {
        filter.status = status
      }
    }

    if (genre && genre !== 'all') {
      // 구버전 DB는 영문 소문자로 저장돼 있어서 한글/영문 모두 매칭
      const genreAliases: Record<string, string> = {
        '시뮬레이션': 'simulation', '액션': 'action', 'RPG': 'rpg',
        'FPS': 'fps', '전략': 'strategy', '레이싱': 'racing',
        '어드벤처': 'adventure', '퍼즐': 'puzzle', '스포츠': 'sports', '호러': 'horror',
      }
      const enAlias = genreAliases[genre as string]
      filter.genre = enAlias ? { $in: [genre, enAlias] } : genre
    }

    if (search) {
      // 🔒 정규식 특수문자 이스케이프 (ReDoS 방지)
      const safeSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ]
    }

    const sortOption: Record<string, 1 | -1> =
      sort === 'popular' ? { playCount: -1 }
      : sort === 'rating' ? { rating: -1 }
      : { createdAt: -1 }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit))) // 최대 50개 제한
    const skip = (pageNum - 1) * limitNum

    const games = await Game.find(filter)
      .populate('developerId', 'username')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)

    const total = await Game.countDocuments(filter)

    const applySnapshot = (obj: any) => {
      if (['published', 'beta'].includes(obj.status) && obj.approvalStatus !== 'approved' && obj.publishedSnapshot) {
        return { ...obj, ...obj.publishedSnapshot, _id: obj._id, developerId: obj.developerId, status: obj.status, approvalStatus: obj.approvalStatus, suspendedAt: obj.suspendedAt, approvedAt: obj.approvedAt, approvedBy: obj.approvedBy, publishedSnapshot: obj.publishedSnapshot, createdAt: obj.createdAt, updatedAt: obj.updatedAt, playCount: obj.playCount }
      }
      return obj
    }

    const processedGames = games
      .map(g => applySnapshot((g as any).toObject()))
      .filter(g => !serviceType || serviceType === 'all' || g.serviceType === serviceType)
      // 🔒 심사 승인 이력이 전혀 없는(한 번도 approved였던 적 없는) 게임은 공개 목록에서 제외 — 최초 심사 승인이 곧 공개 활성화 시점
      .filter(g => isPrivileged || g.approvalStatus === 'approved' || !!g.publishedSnapshot)

    res.json({
      success: true,
      games: processedGames,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 메인페이지 베타존/라이브존 순위 — 매일 09:00(KST) 배치(apps/api/src/jobs/updateZoneRankings.ts)로 미리 계산된 값을 조회만 함
export const getZoneRankings = async (req: AuthRequest, res: Response) => {
  try {
    const zone = String(req.query.zone || '').trim()
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5))
    if (zone !== 'beta' && zone !== 'live') {
      return res.status(400).json({ message: 'zone은 beta 또는 live여야 합니다' })
    }

    const rankings = await GameRankingModel.find({ zone }).sort({ rank: 1 }).limit(limit).lean()
    const gameIds = rankings.map(r => r.gameId)
    const games = await Game.find({ _id: { $in: gameIds } }).select('_id title thumbnail rating genre serviceType').lean()
    const gameMap = Object.fromEntries(games.map(g => [g._id.toString(), g]))

    const result = rankings
      .map(r => {
        const game = gameMap[r.gameId.toString()]
        return game ? { ...game, rank: r.rank, score: r.score } : null
      })
      .filter(Boolean)

    res.json({ games: result, computedAt: rankings[0]?.computedAt || null })
  } catch (error) {
    console.error('Get zone rankings error:', error)
    res.status(500).json({ message: '순위 조회에 실패했습니다' })
  }
}

// 헤더 검색창 드롭다운 전용 — 게임 카드 목록은 건드리지 않고 검색 결과만 따로 내려줌
// 라이브존: 결제 매출 높은 순 / 베타존: 아직 시작 안 한 테스트 우선 + 시작일 가까운 순
export const quickSearchGames = async (req: AuthRequest, res: Response) => {
  try {
    const { q, serviceType, limit } = req.query
    if (serviceType !== 'beta' && serviceType !== 'live') {
      return res.status(400).json({ message: 'serviceType은 beta 또는 live여야 합니다' })
    }
    const take = Math.min(20, Math.max(1, Number(limit) || 8))
    const filter: Record<string, unknown> = {
      isDeleted: { $ne: true },
      status: { $in: ['published', 'beta'] },
      serviceType,
    }
    if (q) {
      const safeQ = (q as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safeQ, $options: 'i' } },
        { description: { $regex: safeQ, $options: 'i' } },
        { genre: { $regex: safeQ, $options: 'i' } },
      ]
    }

    const games = await Game.find(filter)
      .select('_id title thumbnail subIcon genre rating testers maxTesters startDate endDate')
      .limit(50)
      .lean()

    let sorted = games
    if (serviceType === 'live') {
      const revenues = await Payment.aggregate([
        { $match: { gameId: { $in: games.map(g => g._id) }, status: 'completed' } },
        { $group: { _id: '$gameId', total: { $sum: '$amount' } } },
      ])
      const revenueMap = new Map(revenues.map((r: any) => [r._id.toString(), r.total]))
      sorted = [...games].sort((a: any, b: any) =>
        (revenueMap.get(b._id.toString()) || 0) - (revenueMap.get(a._id.toString()) || 0)
      )
    } else {
      const now = Date.now()
      const phaseRank = (g: any) => {
        const start = g.startDate ? new Date(g.startDate).getTime() : null
        const end = g.endDate ? new Date(g.endDate).getTime() : null
        if (end && now > end) return 2 // 종료
        if (start && now >= start) return 1 // 진행 중
        return 0 // 시작 전 (최우선)
      }
      const isFull = (g: any) => (g.maxTesters || 0) > 0 && (g.testers || 0) >= g.maxTesters
      sorted = [...games].sort((a: any, b: any) => {
        const rankDiff = phaseRank(a) - phaseRank(b)
        if (rankDiff !== 0) return rankDiff
        // 시작 전 그룹 안에서는 모집 완료된 게임을 맨 아래로 밀어냄
        if (phaseRank(a) === 0) {
          const fullDiff = Number(isFull(a)) - Number(isFull(b))
          if (fullDiff !== 0) return fullDiff
        }
        const aStart = a.startDate ? new Date(a.startDate).getTime() : Infinity
        const bStart = b.startDate ? new Date(b.startDate).getTime() : Infinity
        return aStart - bStart
      })
    }

    res.json({ games: sorted.slice(0, take) })
  } catch (error) {
    console.error('Quick search games error:', error)
    res.status(500).json({ message: '검색에 실패했습니다' })
  }
}

export const getGameById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    const game = await Game.findById(id).populate('developerId', 'username email companyInfo profileImage')

    if (!game || game.isDeleted) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    // 게임 접속 포인트 (로그인 유저, 게임별 1일 1회)
    if (req.user?.id) {
      grantGameAccessPoint(req.user.id, id).catch(() => {})
    }

    const gameObj = (game as any).toObject()
    const developerIdStr = gameObj.developerId?._id?.toString() ?? gameObj.developerId?.toString()
    const isOwner = req.user && (req.user.id === developerIdStr || req.user.role === 'admin')

    // 🔒 비공개 상태(draft/pending/review/archived 등)는 본인/관리자만 조회 가능
    if (!isOwner && !['published', 'beta'].includes(gameObj.status)) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    // 베타존 신청 여부 (로그인 유저, 본인 신청 기록 존재 여부)
    let hasApplied = false
    if (req.user?.id) {
      hasApplied = !!(await GameTesterApplication.exists({ gameId: id, userId: req.user.id }))
    }

    if (!isOwner && ['published', 'beta'].includes(gameObj.status) && gameObj.approvalStatus !== 'approved' && gameObj.publishedSnapshot) {
      const merged = { ...gameObj, ...gameObj.publishedSnapshot, _id: gameObj._id, developerId: gameObj.developerId, status: gameObj.status, approvalStatus: gameObj.approvalStatus, suspendedAt: gameObj.suspendedAt, approvedAt: gameObj.approvedAt, approvedBy: gameObj.approvedBy, publishedSnapshot: gameObj.publishedSnapshot, createdAt: gameObj.createdAt, updatedAt: gameObj.updatedAt }
      return res.json({ success: true, game: { ...merged, hasApplied } })
    }

    res.json({ success: true, game: { ...gameObj, hasApplied } })
  } catch (error) {
    console.error('Get game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 베타존 참가 신청 — 선착순 즉시 확정. 목표 인원 마감 직전 동시 신청은 전부 받아준다(엄격한 동시성 잠금 없음, 의도된 정책)
export const applyBetaTester = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const { id } = req.params
    const game = await Game.findById(id)
    if (!game || game.isDeleted) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.serviceType !== 'beta') return res.status(400).json({ message: '베타 게임만 신청할 수 있습니다' })
    if (game.approvalStatus !== 'approved') return res.status(400).json({ message: '아직 심사 승인 전입니다' })

    if (game.startDate) {
      const cutoff = new Date(game.startDate)
      cutoff.setHours(0, 0, 0, 0)
      if (new Date() >= cutoff) return res.status(400).json({ message: '신청이 마감되었습니다' })
    }

    const existing = await GameTesterApplication.findOne({ gameId: id, userId: req.user.id })
    if (existing) return res.json({ success: true, alreadyApplied: true })

    if (game.maxTesters && game.maxTesters > 0) {
      const currentCount = await GameTesterApplication.countDocuments({ gameId: id })
      if (currentCount >= game.maxTesters) return res.status(400).json({ message: '모집이 마감되었습니다' })
    }

    await GameTesterApplication.create({ gameId: id, userId: req.user.id })
    await Game.findByIdAndUpdate(id, { $inc: { testers: 1 } })

    res.json({ success: true })
  } catch (error: any) {
    if (error?.code === 11000) return res.json({ success: true, alreadyApplied: true })
    console.error('Apply beta tester error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 관리자 — 베타존 게임별 테스터 모집 현황 목록 (선착순 확정 방식이라 승인 대기 개념은 없음)
export const getBetaTesterGames = async (_req: AuthRequest, res: Response) => {
  try {
    const games = await Game.find({ serviceType: 'beta', isDeleted: { $ne: true } })
      .select('_id title thumbnail testers maxTesters startDate endDate approvalStatus status')
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, games })
  } catch (error) {
    console.error('Get beta tester games error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 관리자 — 특정 게임의 베타 테스터 신청자 목록
export const getBetaTesterApplicants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const applications = await GameTesterApplication.find({ gameId: id })
      .populate('userId', 'username email profileImage')
      .sort({ appliedAt: -1 })
      .lean()

    const applicants = applications
      .filter((a: any) => a.userId)
      .map((a: any) => ({
        applicationId: a._id,
        appliedAt: a.appliedAt,
        user: a.userId,
      }))

    res.json({ success: true, applicants })
  } catch (error) {
    console.error('Get beta tester applicants error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 관리자 — 베타 테스터를 유저 단위로 묶은 목록 (게임명/유저명 검색, 편지 발송용 체크리스트)
export const getBetaTesterUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query
    // 유저당 하나로 합쳐서 보여주던 것을, 동일 유저가 게임을 여러 개 등록했으면 유저+게임 조합별로 행을 따로 보여주도록 변경(2026-09-16) — $group 제거
    const rows = await GameTesterApplication.aggregate([
      { $lookup: { from: 'games', localField: 'gameId', foreignField: '_id', as: 'game' } },
      { $unwind: '$game' },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          applicationId: '$_id',
          user: { _id: '$user._id', username: '$user.username', email: '$user.email', profileImage: '$user.profileImage' },
          game: { _id: '$game._id', title: '$game.title' },
          appliedAt: 1,
        },
      },
      { $sort: { 'user.username': 1, appliedAt: -1 } },
    ])

    let users = rows
    if (search) {
      const safeSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(safeSearch, 'i')
      users = rows.filter((r: any) =>
        re.test(r.user.username) || re.test(r.game.title)
      )
    }

    res.json({ success: true, users })
  } catch (error) {
    console.error('Get beta tester users error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 관리자 — 베타 테스터 신청 제외(강제 취소)
export const removeBetaTester = async (req: AuthRequest, res: Response) => {
  try {
    const { id, applicationId } = req.params
    const application = await GameTesterApplication.findOne({ _id: applicationId, gameId: id })
    if (!application) return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다' })

    await application.deleteOne()
    const game = await Game.findByIdAndUpdate(id, { $inc: { testers: -1 } }, { new: true })
    if (game && game.testers < 0) {
      game.testers = 0
      await game.save()
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Remove beta tester error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const createGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { title, description, genre, price, isPaid, status, monetization, serviceType, gameDomain, startDate, endDate, maxTesters, testType, requirements } = req.body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    let resolvedTitle = title?.trim()
    if (!resolvedTitle) {
      const drafts = await Game.find({ developerId: req.user.id, title: { $regex: /^신규 초안 \d+$/ } }).select('title').lean()
      const nextNum = drafts.reduce((max, g) => {
        const n = Number(g.title.match(/\d+$/)?.[0] || 0)
        return Math.max(max, n)
      }, 0) + 1
      resolvedTitle = `신규 초안 ${nextNum}`
    }

    if (gameDomain?.trim()) {
      try {
        new URL(gameDomain.trim())
      } catch {
        return res.status(400).json({ message: '유효한 URL 형식으로 입력해주세요 (예: https://mygame.com)' })
      }
    }

    const gameData: Record<string, unknown> = {
      title: resolvedTitle,
      description: description?.trim() || '',
      genre: genre || '',
      developerId: req.user.id,
      gameDomain: gameDomain?.trim() || '',
      price: isPaid === 'true' ? Math.max(0, Number(price) || 0) : 0,
      isPaid: isPaid === 'true',
      status: status || 'beta',
      approvalStatus: 'not_submitted',
      monetization: monetization || 'free',
      serviceType: serviceType || 'beta'
    }

    if (startDate) gameData.startDate = startDate
    if (endDate) gameData.endDate = endDate
    if (maxTesters) gameData.maxTesters = Number(maxTesters) || 0
    if (testType) gameData.testType = testType
    if (requirements) gameData.requirements = requirements

    if (files && files.thumbnail) {
      gameData.thumbnail = '/uploads/thumbnails/' + files.thumbnail[0].filename
    }
    if (files && files.bannerImage) {
      gameData.bannerImage = '/uploads/banners/' + files.bannerImage[0].filename
    }
    if (files && files.subIcon) {
      gameData.subIcon = '/uploads/subicons/' + files.subIcon[0].filename
    }

    const game = await Game.create(gameData)

    res.status(201).json({
      success: true,
      message: '게임이 성공적으로 업로드되었습니다',
      game
    })
  } catch (error) {
    console.error('Create game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const updateGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id } = req.params
    const game = await Game.findById(id)

    if (!game || game.isDeleted) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '자신의 게임만 수정할 수 있습니다' })
    }

    const {
      title, description, genre, price, isPaid, status,
      serviceType, monetization, platform, engine,
      startDate, endDate, maxTesters, testType, requirements,
      trailer, website, discord, instagram, twitter, youtube, notes,
      requestReview, gameDomain
    } = req.body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    if (title) game.title = title.trim()
    if (description) game.description = description.trim()
    if (genre !== undefined) game.genre = genre
    if (price !== undefined) game.price = Math.max(0, Number(price))
    if (isPaid !== undefined) game.isPaid = isPaid === 'true'
    if (status) {
      if (status === 'published' && game.approvalStatus !== 'approved') {
        return res.status(400).json({ message: '심사 승인 후 출시할 수 있습니다' })
      }
      game.status = status
    }
    if (serviceType && serviceType !== game.serviceType) {
      game.serviceType = serviceType
      game.approvalStatus = 'not_submitted'
      if (game.status !== 'published') {
        game.status = 'draft'
      }
    }
    if (monetization) game.monetization = monetization

    // 확장 필드
    if (platform !== undefined) (game as any).platform = platform
    if (engine !== undefined) (game as any).engine = engine
    if (startDate !== undefined) (game as any).startDate = startDate || null
    if (endDate !== undefined) (game as any).endDate = endDate || null
    if (maxTesters !== undefined) (game as any).maxTesters = Number(maxTesters) || 0
    if (testType !== undefined) (game as any).testType = testType
    if (requirements !== undefined) (game as any).requirements = requirements
    if (trailer !== undefined) (game as any).trailer = trailer

    const SOCIAL_LINK_RULES: { field: string; value: unknown; test: RegExp; message: string }[] = [
      { field: 'website', value: website, test: /^https?:\/\/.+/i, message: '유효한 URL 형식으로 입력해주세요 (예: https://...)' },
      { field: 'discord', value: discord, test: /^https?:\/\/(www\.)?(discord\.gg|discord\.com)\/.+/i, message: 'discord.gg 또는 discord.com 링크만 입력할 수 있습니다' },
      { field: 'instagram', value: instagram, test: /^https?:\/\/(www\.)?instagram\.com\/.+/i, message: 'instagram.com 링크만 입력할 수 있습니다' },
      { field: 'twitter', value: twitter, test: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i, message: 'x.com(트위터) 링크만 입력할 수 있습니다' },
      { field: 'youtube', value: youtube, test: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i, message: 'youtube.com 링크만 입력할 수 있습니다' },
    ]
    for (const rule of SOCIAL_LINK_RULES) {
      if (rule.value === undefined) continue
      const trimmed = String(rule.value).trim()
      if (trimmed && !rule.test.test(trimmed)) {
        return res.status(400).json({ message: rule.message })
      }
      (game as any)[rule.field] = trimmed
    }
    if (notes !== undefined) (game as any).notes = notes
    if (gameDomain !== undefined) {
      if (gameDomain.trim()) {
        try { new URL(gameDomain.trim()) } catch {
          return res.status(400).json({ message: '유효한 URL 형식으로 입력해주세요 (예: https://mygame.com)' })
        }
      }
      (game as any).gameDomain = gameDomain.trim()
    }

    // 등급 인증서
    const { ratingClass, certNumber, certDate, otherPlatformLink } = req.body
    const certFileUploaded = files && files.certFile && files.certFile[0]
    const contentDescriptorsRaw = req.body['contentDescriptors']
    const contentDescriptorsProvided = req.body['contentDescriptorsProvided'] !== undefined
    if (
      ratingClass !== undefined || certNumber !== undefined || certDate !== undefined ||
      otherPlatformLink !== undefined || certFileUploaded || contentDescriptorsProvided
    ) {
      const existing = (game as any).ratingCertificate || {}
      const contentDescriptors = contentDescriptorsProvided
        ? (Array.isArray(contentDescriptorsRaw) ? contentDescriptorsRaw : (contentDescriptorsRaw !== undefined ? [contentDescriptorsRaw] : []))
        : (existing.contentDescriptors || [])
      ;(game as any).ratingCertificate = {
        ratingClass: ratingClass || existing.ratingClass,
        certNumber: certNumber !== undefined ? certNumber : existing.certNumber,
        certDate: certDate !== undefined ? certDate : existing.certDate,
        certFileUrl: certFileUploaded ? '/uploads/certs/' + certFileUploaded.filename : existing.certFileUrl,
        otherPlatformLink: otherPlatformLink !== undefined ? otherPlatformLink : existing.otherPlatformLink,
        isVerified: existing.isVerified || false,
        contentDescriptors,
      }
    }

    // 태그
    const rawTags = req.body['tags[]']
    if (rawTags !== undefined) {
      game.tags = Array.isArray(rawTags) ? rawTags : [rawTags]
    }

    // ✅ 재승인 프로세스: 개발자가 수정하면 승인 상태를 pending으로 재설정
    if (requestReview === 'true') {
      game.approvalStatus = 'pending'
    }

    if (files && files.thumbnail) {
      if (game.thumbnail) {
        const oldPath = game.thumbnail.startsWith('/uploads/')
          ? path.join(process.cwd(), game.thumbnail.slice(1))
          : game.thumbnail
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      game.thumbnail = '/uploads/thumbnails/' + files.thumbnail[0].filename
    }

    if (files && files.bannerImage) {
      if (game.bannerImage) {
        const oldPath = game.bannerImage.startsWith('/uploads/')
          ? path.join(process.cwd(), game.bannerImage.slice(1))
          : game.bannerImage
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      game.bannerImage = '/uploads/banners/' + files.bannerImage[0].filename
    }

    if (files && files.subIcon) {
      if (game.subIcon) {
        const oldPath = game.subIcon.startsWith('/uploads/')
          ? path.join(process.cwd(), game.subIcon.slice(1))
          : game.subIcon
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      game.subIcon = '/uploads/subicons/' + files.subIcon[0].filename
    }

    // 출시 중인 게임 기본 정보 수정 → 스냅샷도 동기화 (즉시 반영)
    if (game.status === 'published' && game.approvalStatus === 'approved') {
      const snap = (game as any).publishedSnapshot as Record<string, unknown> | undefined
      if (snap) {
        const syncFields = ['title', 'description', 'genre', 'thumbnail', 'bannerImage', 'subIcon', 'trailer', 'website', 'discord', 'instagram', 'twitter', 'youtube', 'notes', 'platform', 'engine', 'startDate', 'endDate', 'maxTesters', 'testType', 'requirements', 'gameDomain', 'monetization']
        for (const f of syncFields) {
          const val = (game as any)[f]
          if (val !== undefined) snap[f] = val
        }
        ;(game as any).markModified('publishedSnapshot')
      }
    }

    await game.save({ validateBeforeSave: false })

    const msg = game.status === 'published' && game.approvalStatus === 'approved'
      ? '수정 사항이 바로 반영되었습니다.'
      : '게임이 수정되었습니다. 관리자 재승인 후 반영됩니다.'
    res.json({ success: true, message: msg, game })
  } catch (error) {
    console.error('Update game error:', error)
    res.status(500).json({ message: (error as Error)?.message || '서버 오류가 발생했습니다' })
  }
}

export const uploadGameContentImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ message: '업로드할 이미지를 선택해주세요' })
    }
    const imageUrls = files.map(f => `/uploads/game-content/${f.filename}`)
    res.json({ success: true, images: imageUrls })
  } catch {
    res.status(500).json({ message: '이미지 업로드 실패' })
  }
}

export const deleteGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    if (req.user.role === 'admin') {
      // adminLevel 미설정 admin은 super로 처리 (기존 계정 하위 호환, requireAdminLevel과 동일 규칙)
      const callerLevel = req.user.adminLevel || 'super'
      if (callerLevel !== 'super') {
        return res.status(403).json({ message: '게임 삭제는 최고 관리자만 가능합니다' })
      }
    }

    const { id } = req.params
    const game = await Game.findById(id)
    if (!game || game.isDeleted) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '자신의 게임만 삭제할 수 있습니다' })
    }

    if (req.user.role !== 'admin' && game.status === 'published') {
      return res.status(403).json({ message: '운영 중인 게임은 개발사가 직접 삭제할 수 없습니다. 관리자에게 문의하세요.' })
    }

    const actor = await User.findById(req.user.id).select('username email')

    // 감사로그 기록 (삭제 전)
    let developerUsername: string | undefined
    let developerCompanyName: string | undefined
    try {
      const developer = await User.findById(game.developerId).select('username email companyInfo')
      developerUsername = (developer as { username?: string } | null)?.username
      developerCompanyName = (developer as unknown as { companyInfo?: { companyName?: string } } | null)?.companyInfo?.companyName
    } catch { /* no-op */ }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress
    const userAgent = req.headers['user-agent'] as string | undefined

    await GameDeletionLog.create({
      gameId: game._id,
      gameTitle: game.title,
      gameGenre: game.genre,
      developerId: game.developerId,
      developerUsername,
      developerCompanyName,
      deletedBy: req.user.id,
      deletedByUsername: (actor as { username?: string })?.username,
      deletedByEmail: (actor as { email?: string })?.email,
      deletedByRole: req.user.role,
      ipAddress,
      userAgent,
      gameSnapshot: game.toObject(),
      deletedAt: new Date(),
    })

    // 소프트 삭제: 게임 문서와 파일은 그대로 두고 isDeleted만 표시
    // (커뮤니티 탭/게시물/공지는 삭제 후에도 기존과 동일하게 열람·작성 가능해야 하므로 하드 삭제하지 않음)
    game.isDeleted = true
    game.deletedAt = new Date()
    await game.save({ validateBeforeSave: false })

    res.json({ success: true, message: '게임이 삭제되었습니다' })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 게임 삭제 감사로그 조회 (admin만)
export const getGameDeletionLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자만 접근할 수 있습니다' })
    }

    const { page = 1, limit = 20, search, developerId, deletedByRole } = req.query
    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const filter: Record<string, unknown> = { restoredAt: { $exists: false } }
    if (search) {
      const safe = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { gameTitle: { $regex: safe, $options: 'i' } },
        { developerUsername: { $regex: safe, $options: 'i' } },
        { deletedByUsername: { $regex: safe, $options: 'i' } },
        { deletedByEmail: { $regex: safe, $options: 'i' } },
      ]
    }
    if (developerId) filter.developerId = developerId
    if (deletedByRole) filter.deletedByRole = deletedByRole

    const [logs, total] = await Promise.all([
      GameDeletionLog.find(filter).sort({ deletedAt: -1 }).skip(skip).limit(limitNum).populate('developerId', 'username companyInfo'),
      GameDeletionLog.countDocuments(filter),
    ])

    const gameIds = logs.map(l => l.gameId)
    const revenueAgg = await Payment.aggregate([
      { $match: { gameId: { $in: gameIds }, status: 'completed' } },
      { $group: { _id: '$gameId', total: { $sum: '$amount' } } },
    ])
    const revenueMap: Record<string, number> = {}
    revenueAgg.forEach(r => { revenueMap[String(r._id)] = r.total })

    // 소프트 삭제된 게임은 문서가 그대로 남아있으므로, 현재 커뮤니티 탭 숨김 여부를 같이 내려준다
    const games = await Game.find({ _id: { $in: gameIds } }).select('hiddenFromCommunity')
    const hiddenMap = new Map(games.map(g => [String(g._id), !!g.hiddenFromCommunity]))

    const logsWithRevenue = logs.map(l => {
      const obj = l.toObject() as unknown as Record<string, unknown>
      const dev = obj.developerId as { username?: string; companyInfo?: { companyName?: string } } | null
      return {
        ...obj,
        developerCompanyName: (obj.developerCompanyName as string | undefined) || dev?.companyInfo?.companyName || null,
        totalRevenue: revenueMap[String(l.gameId)] ?? 0,
        hiddenFromCommunity: hiddenMap.get(String(l.gameId)) ?? false,
      }
    })

    res.json({
      success: true,
      logs: logsWithRevenue,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    })
  } catch (error) {
    console.error('Get deletion logs error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const restoreGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자만 복구할 수 있습니다' })
    }

    const { logId } = req.params
    const log = await GameDeletionLog.findById(logId)
    if (!log) return res.status(404).json({ message: '삭제 로그를 찾을 수 없습니다' })

    const existing = await Game.findById(log.gameId)

    // 소프트 삭제된 게임(문서가 그대로 남아있는 경우): isDeleted 플래그만 해제
    if (existing) {
      if (!existing.isDeleted) return res.status(409).json({ message: '이미 해당 ID의 게임이 존재합니다' })
      existing.isDeleted = false
      existing.deletedAt = undefined
      existing.hiddenFromCommunity = false
      await existing.save({ validateBeforeSave: false })
      await GameDeletionLog.findByIdAndUpdate(logId, { restoredAt: new Date() })
      return res.json({ success: true, message: '게임이 복구되었습니다' })
    }

    // 과거 하드 삭제 로그(문서가 완전히 삭제된 경우): 스냅샷으로 재생성
    if (!log.gameSnapshot) return res.status(400).json({ message: '스냅샷 데이터가 없습니다' })

    const { _id, __v, id, ...snapshot } = log.gameSnapshot as Record<string, unknown>
    const VALID_STATUS = ['draft', 'beta', 'published', 'archived']
    const VALID_APPROVAL = ['not_submitted', 'pending', 'review', 'approved', 'rejected']
    const VALID_SERVICE_TYPE = ['beta', 'live', 'review', 'ended']
    const VALID_MONETIZATION = ['free', 'ad', 'paid', 'freemium']
    if (!VALID_STATUS.includes(snapshot.status as string)) snapshot.status = 'draft'
    if (!VALID_APPROVAL.includes(snapshot.approvalStatus as string)) snapshot.approvalStatus = 'not_submitted'
    if (!VALID_SERVICE_TYPE.includes(snapshot.serviceType as string)) snapshot.serviceType = 'beta'
    if (!VALID_MONETIZATION.includes(snapshot.monetization as string)) snapshot.monetization = 'free'
    snapshot.isDeleted = false
    snapshot.hiddenFromCommunity = false
    await Game.create({ _id: log.gameId, ...snapshot })

    // deleted 폴더의 파일을 원래 경로로 복원
    const deletedDir = path.join(process.cwd(), 'uploads', 'deleted', logId)
    if (fs.existsSync(deletedDir)) {
      const restoreFile = (filePath: string) => {
        const absPath = filePath.startsWith('/uploads/')
          ? path.join(process.cwd(), filePath.slice(1))
          : filePath
        const src = path.join(deletedDir, path.basename(absPath))
        if (fs.existsSync(src)) {
          const dir = path.dirname(absPath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.renameSync(src, absPath)
        }
      }
      const snap = snapshot as { thumbnail?: string; bannerImage?: string; subIcon?: string; gameFile?: string }
      if (snap.thumbnail) restoreFile(snap.thumbnail)
      if (snap.bannerImage) restoreFile(snap.bannerImage)
      if (snap.subIcon) restoreFile(snap.subIcon)
      if (snap.gameFile) restoreFile(snap.gameFile)
    }

    await GameDeletionLog.findByIdAndUpdate(logId, { restoredAt: new Date() })

    res.json({ success: true, message: '게임이 복구되었습니다' })
  } catch (error) {
    console.error('Restore game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

// 삭제된(소프트 삭제) 게임의 커뮤니티 탭 노출 여부를 관리자가 수동으로 전환
export const updateGameCommunityVisibility = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자만 변경할 수 있습니다' })
    }

    const { logId } = req.params
    const { hidden } = req.body as { hidden?: boolean }

    const log = await GameDeletionLog.findById(logId)
    if (!log) return res.status(404).json({ message: '삭제 로그를 찾을 수 없습니다' })

    const game = await Game.findById(log.gameId)
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다 (완전 삭제된 게임은 변경할 수 없습니다)' })

    game.hiddenFromCommunity = !!hidden
    await game.save({ validateBeforeSave: false })

    res.json({ success: true, hiddenFromCommunity: game.hiddenFromCommunity })
  } catch (error) {
    console.error('Update game community visibility error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getPaymentProviders = async (req: AuthRequest, res: Response) => {
  try {
    const gameQuery = req.user?.role === 'admin'
      ? {}
      : { developerId: req.user?.id }
    const games = await Game.find(gameQuery).select('_id')
    const gameIds = games.map(g => g._id)
    const providers = await Payment.distinct('pgProvider', {
      gameId: { $in: gameIds },
      pgProvider: { $exists: true, $ne: '' },
    })
    res.json({ success: true, providers: providers.filter(Boolean).sort() })
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getPaymentGames = async (req: AuthRequest, res: Response) => {
  try {
    const gameQuery = req.user?.role === 'admin'
      ? {}
      : { developerId: req.user?.id }
    const games = await Game.find(gameQuery).select('_id')
    const gameIds = games.map(g => g._id)
    const paidGameIds = await Payment.distinct('gameId', { gameId: { $in: gameIds } })
    const paidGames = await Game.find({ _id: { $in: paidGameIds } })
      .select('title thumbnail developerId')
      .populate('developerId', 'username companyInfo')
    res.json({ success: true, games: paidGames })
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getGamePayments = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.params
    const { startDate, endDate, status, pgProvider, search, page = 1, limit = 50 } = req.query

    const game = await Game.findById(gameId).select('developerId')
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (req.user?.role !== 'admin' && String(game.developerId) !== req.user?.id) {
      return res.status(403).json({ message: '권한이 없습니다' })
    }

    const filter: Record<string, unknown> = { gameId }
    if (status && status !== 'all') filter.status = status
    if (pgProvider && pgProvider !== 'all') filter.pgProvider = pgProvider
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        dateFilter.$lte = end
      }
      filter.createdAt = dateFilter
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(200, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    let query = Payment.find(filter)
      .populate('userId', 'username email')
      .populate('gameId', 'title thumbnail shopCurrencyName')
      .sort({ createdAt: -1 })

    if (search) {
      const safe = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const userIds = await (await import('@gameup/db')).UserModel
        .find({ username: { $regex: safe, $options: 'i' } })
        .select('_id')
      const { $in: gameIdFilter, ...baseFilter } = filter as any
      filter.$or = [
        { userId: { $in: userIds.map((u: { _id: unknown }) => u._id) } },
        { 'metadata.itemName': { $regex: safe, $options: 'i' } },
      ]
      query = Payment.find(filter)
        .populate('userId', 'username email')
        .populate('gameId', 'title thumbnail shopCurrencyName')
        .sort({ createdAt: -1 })
    }

    const [payments, total] = await Promise.all([
      query.skip(skip).limit(limitNum),
      Payment.countDocuments(filter),
    ])

    const completedPayments = await Payment.find({ ...filter, status: 'completed' })
    const totalAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const uniqueBuyers = new Set(completedPayments.map(p => String(p.userId))).size

    const providers = (await Payment.distinct('pgProvider', { gameId, pgProvider: { $ne: '' } })).filter(Boolean).sort()

    res.json({
      success: true,
      payments,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      summary: { totalAmount, totalCount: total, uniqueBuyers },
      providers,
    })
  } catch (error) {
    console.error('Get game payments error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getAllDeveloperPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status, pgProvider, search, page = 1, limit = 50 } = req.query

    const gameQuery = req.user?.role === 'admin'
      ? {}
      : { developerId: req.user?.id }
    const games = await Game.find(gameQuery).select('_id')
    const gameIds = games.map(g => g._id)

    const filter: Record<string, unknown> = { gameId: { $in: gameIds } }
    if (status && status !== 'all') filter.status = status
    if (pgProvider && pgProvider !== 'all') filter.pgProvider = pgProvider
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.$gte = new Date(startDate as string)
      if (endDate) {
        const end = new Date(endDate as string)
        end.setHours(23, 59, 59, 999)
        dateFilter.$lte = end
      }
      filter.createdAt = dateFilter
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(200, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const gamePopulate = {
      path: 'gameId',
      select: 'title thumbnail shopCurrencyName developerId',
      populate: { path: 'developerId', select: 'username companyInfo' },
    }

    let query = Payment.find(filter)
      .populate('userId', 'username email')
      .populate(gamePopulate)
      .sort({ createdAt: -1 })

    if (search) {
      const safe = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const userIds = await (await import('@gameup/db')).UserModel
        .find({ username: { $regex: safe, $options: 'i' } })
        .select('_id')
      const { $in: gameIdFilter, ...baseFilter } = filter as any
      filter.$or = [
        { userId: { $in: userIds.map((u: { _id: unknown }) => u._id) } },
        { 'metadata.itemName': { $regex: safe, $options: 'i' } },
      ]
      query = Payment.find(filter)
        .populate('userId', 'username email')
        .populate(gamePopulate)
        .sort({ createdAt: -1 })
    }

    const [payments, total] = await Promise.all([
      query.skip(skip).limit(limitNum),
      Payment.countDocuments(filter),
    ])

    const completedPayments = await Payment.find({ ...filter, status: 'completed' })
    const totalAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const uniqueBuyers = new Set(completedPayments.map(p => String(p.userId))).size

    const baseFilter = { gameId: { $in: gameIds } }
    const providers = (await Payment.distinct('pgProvider', { ...baseFilter, pgProvider: { $ne: '' } })).filter(Boolean).sort()

    res.json({
      success: true,
      payments,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      summary: { totalAmount, totalCount: total, uniqueBuyers },
      providers,
    })
  } catch (error) {
    console.error('Get all developer payments error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getMyGames = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const gameQuery: Record<string, unknown> = req.user.role === 'admin' ? {} : { developerId: req.user.id }
    gameQuery.isDeleted = { $ne: true }
    const gamesQuery = Game.find(gameQuery).sort({ createdAt: -1 })
    if (req.user.role === 'admin') {
      gamesQuery.populate('developerId', 'username companyInfo')
    }
    const games = await gamesQuery
    const gameIds = games.map(g => g._id)
    const screenshotGameIds = await GameMedia.distinct('gameId', { gameId: { $in: gameIds }, type: 'screenshot' })
    const screenshotSet = new Set(screenshotGameIds.map(id => id.toString()))
    const result = games.map(g => ({
      ...g.toObject(),
      hasScreenshots: screenshotSet.has(g._id.toString()),
    }))
    res.json({ success: true, games: result })
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getDeveloperStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })

    const games = await Game.find({ developerId: req.user.id })
    const totalGames = games.length
    const totalPlays = games.reduce((sum, g) => sum + (g.playCount || 0), 0)

    // ✅ 실제 Payment 모델에서 결제 완료된 매출 합산
    const gameIds = games.map(g => g._id)
    const revenueAgg = await Payment.aggregate([
      { $match: { gameId: { $in: gameIds }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const totalRevenue = revenueAgg[0]?.total || 0

    const publishedGames = games.filter(g => g.status === 'published' || g.status === 'beta').length
    const draftGames = games.filter(g => g.status === 'draft').length

    const recentGames = games.slice(0, 5).map(g => ({
      id: g._id,
      title: g.title,
      status: g.status,
      playCount: g.playCount || 0,
      price: g.price || 0,
      isPaid: g.isPaid,
      createdAt: g.createdAt,
      thumbnail: g.thumbnail
    }))

    res.json({
      success: true,
      stats: { totalGames, totalPlays, totalRevenue, publishedGames, draftGames },
      recentGames
    })
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const requestReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const game = await Game.findById(req.params.id)
    if (!game || game.isDeleted) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: '자신의 게임만 심사 요청할 수 있습니다' })
    if (game.approvalStatus === 'pending' || game.approvalStatus === 'review') return res.status(400).json({ message: '이미 심사 중입니다' })
    if (!game.gameDomain?.trim()) return res.status(400).json({ message: '게임 URL을 먼저 등록해주세요' })
    game.approvalStatus = 'pending'
    await game.save()
    res.json({ success: true, message: '심사가 요청되었습니다. 관리자 검토 후 승인됩니다.' })
  } catch (error) {
    console.error('Request review error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const cancelReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const game = await Game.findById(req.params.id)
    if (!game || game.isDeleted) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: '자신의 게임만 취소할 수 있습니다' })
    if (game.approvalStatus !== 'pending' && game.approvalStatus !== 'review') return res.status(400).json({ message: '심사 중인 게임만 취소할 수 있습니다' })
    const snapshot = (game as any).publishedSnapshot
    if (snapshot) {
      // 운영 중이던 게임의 심사 취소 → 스냅샷 데이터 복원 + approved 상태로 복귀
      const SKIP = new Set(['_id', 'id', '__v', 'developerId', 'status', 'approvalStatus', 'suspendedAt', 'approvedAt', 'approvedBy', 'publishedSnapshot', 'createdAt', 'updatedAt', 'playCount'])
      for (const key of Object.keys(snapshot)) {
        if (!SKIP.has(key)) (game as any)[key] = snapshot[key]
      }
      game.approvalStatus = 'approved'
    } else {
      game.approvalStatus = 'not_submitted'
    }
    await game.save({ validateBeforeSave: false })
    res.json({ success: true, message: '심사가 취소되었습니다.' })
  } catch (error) {
    console.error('Cancel review error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const incrementPlayCount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const game = await Game.findByIdAndUpdate(
      id,
      { $inc: { playCount: 1 } },
      { new: true }
    )

    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    res.json({ success: true, playCount: game.playCount })
  } catch (error) {
    console.error('Increment play count error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}