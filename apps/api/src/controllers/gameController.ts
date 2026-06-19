import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { GameModel as Game, UserModel as User, GameDeletionLogModel as GameDeletionLog, PaymentModel as Payment, GameMediaModel as GameMedia } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'
import { grantGameAccessPoint } from '../services/pointService'

export const getAllGames = async (req: AuthRequest, res: Response) => {
  try {
    const { status, genre, search, sort = 'newest', page = 1, limit = 12, serviceType, featuredNew } = req.query

    const filter: Record<string, unknown> = {
      status: 'published',
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
      filter.status = status
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

export const getGameById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    const game = await Game.findById(id).populate('developerId', 'username email companyInfo')

    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    // 게임 접속 포인트 (로그인 유저, 게임별 1일 1회)
    if (req.user?.id) {
      grantGameAccessPoint(req.user.id, id).catch(() => {})
    }

    const gameObj = (game as any).toObject()
    const developerIdStr = gameObj.developerId?._id?.toString() ?? gameObj.developerId?.toString()
    const isOwner = req.user && (req.user.id === developerIdStr || req.user.role === 'admin')
    if (!isOwner && ['published', 'beta'].includes(gameObj.status) && gameObj.approvalStatus !== 'approved' && gameObj.publishedSnapshot) {
      const merged = { ...gameObj, ...gameObj.publishedSnapshot, _id: gameObj._id, developerId: gameObj.developerId, status: gameObj.status, approvalStatus: gameObj.approvalStatus, suspendedAt: gameObj.suspendedAt, approvedAt: gameObj.approvedAt, approvedBy: gameObj.approvedBy, publishedSnapshot: gameObj.publishedSnapshot, createdAt: gameObj.createdAt, updatedAt: gameObj.updatedAt }
      return res.json({ success: true, game: merged })
    }

    res.json({ success: true, game })
  } catch (error) {
    console.error('Get game error:', error)
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

    if (!title?.trim()) {
      return res.status(400).json({ message: '제목은 필수입니다' })
    }

    if (!gameDomain?.trim()) {
      return res.status(400).json({ message: '게임 도메인(URL)은 필수입니다' })
    }

    try {
      new URL(gameDomain.trim())
    } catch {
      return res.status(400).json({ message: '유효한 URL 형식으로 입력해주세요 (예: https://mygame.com)' })
    }

    const gameData: Record<string, unknown> = {
      title: title.trim(),
      description: description?.trim() || '',
      genre: genre || '',
      developerId: req.user.id,
      gameDomain: gameDomain.trim(),
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

    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '자신의 게임만 수정할 수 있습니다' })
    }

    const {
      title, description, genre, price, isPaid, status,
      serviceType, monetization, platform, engine,
      startDate, endDate, maxTesters, testType, requirements,
      trailer, website, discord, notes,
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
    if (website !== undefined) (game as any).website = website
    if (discord !== undefined) (game as any).discord = discord
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
    const { ratingClass, certNumber, certDate } = req.body
    const certFileUploaded = files && files.certFile && files.certFile[0]
    if (ratingClass !== undefined || certNumber !== undefined || certDate !== undefined || certFileUploaded) {
      const existing = (game as any).ratingCertificate || {}
      ;(game as any).ratingCertificate = {
        ratingClass: ratingClass || existing.ratingClass,
        certNumber: certNumber !== undefined ? certNumber : existing.certNumber,
        certDate: certDate !== undefined ? certDate : existing.certDate,
        certFileUrl: certFileUploaded ? '/uploads/certs/' + certFileUploaded.filename : existing.certFileUrl,
        isVerified: existing.isVerified || false,
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

    // 출시 중인 게임 기본 정보 수정 → 스냅샷도 동기화 (즉시 반영)
    if (game.status === 'published' && game.approvalStatus === 'approved') {
      const snap = (game as any).publishedSnapshot as Record<string, unknown> | undefined
      if (snap) {
        const syncFields = ['title', 'description', 'genre', 'thumbnail', 'bannerImage', 'trailer', 'website', 'discord', 'notes', 'platform', 'engine', 'startDate', 'endDate', 'maxTesters', 'testType', 'requirements', 'gameDomain', 'monetization']
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

export const deleteGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' })
    }

    const { id } = req.params
    const game = await Game.findById(id)
    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
    }

    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '자신의 게임만 삭제할 수 있습니다' })
    }

    const actor = await User.findById(req.user.id).select('username email')

    // 감사로그 기록 (삭제 전)
    let developerUsername: string | undefined
    try {
      const developer = await User.findById(game.developerId).select('username email')
      developerUsername = (developer as { username?: string } | null)?.username
    } catch { /* no-op */ }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress
    const userAgent = req.headers['user-agent'] as string | undefined

    const createdLog = await GameDeletionLog.create({
      gameId: game._id,
      gameTitle: game.title,
      gameGenre: game.genre,
      developerId: game.developerId,
      developerUsername,
      deletedBy: req.user.id,
      deletedByUsername: (actor as { username?: string })?.username,
      deletedByEmail: (actor as { email?: string })?.email,
      deletedByRole: req.user.role,
      ipAddress,
      userAgent,
      gameSnapshot: game.toObject(),
      deletedAt: new Date(),
    })

    // 파일을 삭제 대신 deleted 폴더로 이동 (복구 시 되돌리기 위해)
    const logId = (createdLog._id as { toString(): string }).toString()
    const deletedDir = path.join(process.cwd(), 'uploads', 'deleted', logId)
    if (!fs.existsSync(deletedDir)) fs.mkdirSync(deletedDir, { recursive: true })

    const moveFile = (filePath: string) => {
      const absPath = filePath.startsWith('/uploads/')
        ? path.join(process.cwd(), filePath.slice(1))
        : filePath
      if (fs.existsSync(absPath)) {
        const dest = path.join(deletedDir, path.basename(absPath))
        fs.renameSync(absPath, dest)
      }
    }

    if (game.gameFile) moveFile(game.gameFile)
    if (game.thumbnail) moveFile(game.thumbnail)
    if (game.bannerImage) moveFile(game.bannerImage)

    await Game.findByIdAndDelete(id)

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

    const { page = 1, limit = 20, search } = req.query
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

    const logsWithRevenue = logs.map(l => {
      const obj = l.toObject() as unknown as Record<string, unknown>
      const dev = obj.developerId as { username?: string; companyInfo?: { companyName?: string } } | null
      return {
        ...obj,
        developerCompanyName: dev?.companyInfo?.companyName || null,
        totalRevenue: revenueMap[String(l.gameId)] ?? 0,
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
    if (!log.gameSnapshot) return res.status(400).json({ message: '스냅샷 데이터가 없습니다' })

    const existing = await Game.findById(log.gameId)
    if (existing) return res.status(409).json({ message: '이미 해당 ID의 게임이 존재합니다' })

    const { _id, __v, id, ...snapshot } = log.gameSnapshot as Record<string, unknown>
    const VALID_STATUS = ['draft', 'beta', 'published', 'archived']
    const VALID_APPROVAL = ['not_submitted', 'pending', 'review', 'approved', 'rejected']
    const VALID_SERVICE_TYPE = ['beta', 'live', 'review', 'ended']
    const VALID_MONETIZATION = ['free', 'ad', 'paid', 'freemium']
    if (!VALID_STATUS.includes(snapshot.status as string)) snapshot.status = 'draft'
    if (!VALID_APPROVAL.includes(snapshot.approvalStatus as string)) snapshot.approvalStatus = 'not_submitted'
    if (!VALID_SERVICE_TYPE.includes(snapshot.serviceType as string)) snapshot.serviceType = 'beta'
    if (!VALID_MONETIZATION.includes(snapshot.monetization as string)) snapshot.monetization = 'free'
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
      const snap = snapshot as { thumbnail?: string; bannerImage?: string; gameFile?: string }
      if (snap.thumbnail) restoreFile(snap.thumbnail)
      if (snap.bannerImage) restoreFile(snap.bannerImage)
      if (snap.gameFile) restoreFile(snap.gameFile)
    }

    await GameDeletionLog.findByIdAndUpdate(logId, { restoredAt: new Date() })

    res.json({ success: true, message: '게임이 복구되었습니다' })
  } catch (error) {
    console.error('Restore game error:', error)
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
    const gameQuery = req.user.role === 'admin' ? {} : { developerId: req.user.id }
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
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
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
    if (!game) return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
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