import { Response } from 'express'
import fs from 'fs'
import Game from '../models/Game'
import { AuthRequest } from '../middleware/auth'

export const getAllGames = async (req: AuthRequest, res: Response) => {
  try {
    const { status, genre, search, sort = 'newest', page = 1, limit = 12 } = req.query

    const filter: Record<string, unknown> = {
      approvalStatus: 'approved',
      status: { $in: ['beta', 'published'] }
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    if (genre && genre !== 'all') {
      filter.genre = genre
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

    res.json({
      success: true,
      games,
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

    const game = await Game.findById(id).populate('developerId', 'username email')

    if (!game) {
      return res.status(404).json({ message: '게임을 찾을 수 없습니다' })
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

    const { title, description, genre, price, isPaid, status, monetization, serviceType } = req.body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: '제목과 설명은 필수입니다' })
    }

    if (!files || !files.gameFile) {
      return res.status(400).json({ message: '게임 파일은 필수입니다' })
    }

    const gameData: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      genre: genre || '',
      developerId: req.user.id,
      gameFile: files.gameFile[0].path,
      price: isPaid === 'true' ? Math.max(0, Number(price) || 0) : 0,
      isPaid: isPaid === 'true',
      status: status || 'draft',
      monetization: monetization || 'free',
      serviceType: serviceType || 'beta'
    }

    if (files.thumbnail) {
      gameData.thumbnail = files.thumbnail[0].path
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

    if (game.developerId.toString() !== req.user.id) {
      return res.status(403).json({ message: '자신의 게임만 수정할 수 있습니다' })
    }

    const {
      title, description, genre, price, isPaid, status,
      serviceType, monetization, platform, engine,
      startDate, endDate, maxTesters, testType, requirements,
      trailer, website, discord, notes,
      requestReview
    } = req.body
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }

    if (title) game.title = title.trim()
    if (description) game.description = description.trim()
    if (genre !== undefined) game.genre = genre
    if (price !== undefined) game.price = Math.max(0, Number(price))
    if (isPaid !== undefined) game.isPaid = isPaid === 'true'
    if (status) game.status = status
    if (serviceType) game.serviceType = serviceType
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

    // 태그
    const rawTags = req.body['tags[]']
    if (rawTags !== undefined) {
      game.tags = Array.isArray(rawTags) ? rawTags : [rawTags]
    }

    // ✅ 재승인 프로세스: 개발자가 수정하면 승인 상태를 pending으로 재설정
    if (requestReview === 'true') {
      game.approvalStatus = 'pending'
    }

    // 🔒 기존 파일 삭제 후 새 파일로 교체
    if (files && files.gameFile) {
      if (game.gameFile && fs.existsSync(game.gameFile)) {
        fs.unlinkSync(game.gameFile)
      }
      game.gameFile = files.gameFile[0].path
    }

    if (files && files.thumbnail) {
      if (game.thumbnail && fs.existsSync(game.thumbnail)) {
        fs.unlinkSync(game.thumbnail)
      }
      game.thumbnail = files.thumbnail[0].path
    }

    await game.save()

    res.json({ success: true, message: '게임이 수정되었습니다. 관리자 재승인 후 반영됩니다.', game })
  } catch (error) {
    console.error('Update game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
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

    // 🔒 admin도 삭제 가능하도록 권한 확인
    if (game.developerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '자신의 게임만 삭제할 수 있습니다' })
    }

    // 🔒 실제 파일도 함께 삭제
    if (game.gameFile && fs.existsSync(game.gameFile)) {
      fs.unlinkSync(game.gameFile)
    }
    if (game.thumbnail && fs.existsSync(game.thumbnail)) {
      fs.unlinkSync(game.thumbnail)
    }

    await Game.findByIdAndDelete(id)

    res.json({ success: true, message: '게임이 삭제되었습니다' })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ message: '서버 오류가 발생했습니다' })
  }
}

export const getMyGames = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: '인증이 필요합니다' })
    const games = await Game.find({ developerId: req.user.id }).sort({ createdAt: -1 })
    res.json({ success: true, games })
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

    // 🔒 수익은 실제 결제 데이터 기반으로 계산해야 하므로 0으로 표시 (추후 Payment 모델 연동)
    // const totalRevenue = games.reduce((sum, g) => sum + ((g.price || 0) * (g.playCount || 0)), 0)
    const totalRevenue = 0 // TODO: Payment 모델에서 실제 결제 완료된 금액 합산

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