import { Request, Response } from 'express'
import { CommunityBannerModel, GameModel, GameTesterApplicationModel } from '@gameup/db'
import { AuthRequest } from '../middleware/auth'

// 배너의 linkUrl이 "/games/:id" 형태(게임 선택형 배너)면 게임 id를 뽑아낸다
function extractGameId(linkUrl?: string) {
  return linkUrl?.match(/^\/games\/([^/]+)$/)?.[1]
}

// 게임 선택형 배너들(베타존 참가자 모집 등)에 연결된 게임의 이름/모집 현황(testers/maxTesters)을 붙여준다
// 2026-09-17: 로그인 유저가 이미 신청한 게임인지(hasApplied)도 같이 계산해서 붙임 — 이전엔 이 값이 아예
// 없어서 프론트가 새로고침할 때마다 신청 상태를 알 수 없어 항상 "미신청"으로 보였던 버그를 고침
async function attachGameInfo<T extends { linkUrl?: string }>(banners: T[], userId?: string) {
  const gameIds = [...new Set(banners.map(b => extractGameId(b.linkUrl)).filter((v): v is string => !!v))]
  if (gameIds.length === 0) return banners.map(b => ({ ...b, game: null }))
  const games = await GameModel.find({ _id: { $in: gameIds } }).select('_id title testers maxTesters startDate').lean()
  const appliedGameIds = userId
    ? new Set((await GameTesterApplicationModel.find({ gameId: { $in: gameIds }, userId }).select('gameId').lean()).map(a => a.gameId.toString()))
    : new Set<string>()
  const gameMap = Object.fromEntries(games.map(g => [g._id.toString(), { ...g, hasApplied: appliedGameIds.has(g._id.toString()) }]))
  return banners.map(b => {
    const id = extractGameId(b.linkUrl)
    return { ...b, game: id ? gameMap[id] || null : null }
  })
}

// 게임 선택형 배너(newgame=베타존 참가자 모집→게임 아이콘, recommend=추천게임→히어로 배너)는
// imageUrl을 등록/수정 시점에 스냅샷으로 저장해둔다. 개발사가 나중에 게임 아이콘/히어로 배너를 새로
// 올려도 이 스냅샷은 자동으로 안 바뀌어서, 옛 업로드 파일이 교체·삭제되면 깨진 이미지가 뜨는 문제가
// 있었다(2026-09-17 발견). 조회 시마다 게임의 "현재" 이미지로 다시 계산해서 내려주는 것으로 해결.
async function resolveLiveGameImages<T extends { linkUrl?: string; position?: string; imageUrl?: string }>(banners: T[]) {
  const relevant = banners.filter(b => b.position === 'newgame' || b.position === 'recommend')
  const gameIds = [...new Set(relevant.map(b => extractGameId(b.linkUrl)).filter((v): v is string => !!v))]
  if (gameIds.length === 0) return banners
  const games = await GameModel.find({ _id: { $in: gameIds } }).select('_id thumbnail bannerImage').lean()
  const gameMap = Object.fromEntries(games.map(g => [g._id.toString(), g]))
  return banners.map(b => {
    if (b.position !== 'newgame' && b.position !== 'recommend') return b
    const id = extractGameId(b.linkUrl)
    const game = id ? gameMap[id] : null
    if (!game) return b
    const liveUrl = b.position === 'newgame' ? game.thumbnail : game.bannerImage
    return liveUrl ? { ...b, imageUrl: liveUrl } : b
  })
}

/** GET /api/admin/community/banners (공개, 로그인 시 신청 여부도 포함) — 활성 배너 목록 */
export const getCommunityBanners = async (req: AuthRequest, res: Response) => {
  try {
    const position = (req.query.position as string) || 'community'
    const banners = await CommunityBannerModel.find({ isActive: true, position })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select('imageUrl linkUrl title createdAt position')
      .lean()
    res.json({ banners: await attachGameInfo(await resolveLiveGameImages(banners), req.user?.id) })
  } catch {
    res.status(500).json({ message: '배너 조회 실패' })
  }
}

/** GET /api/admin/community/banners/all — 전체 목록 (관리자) */
export const getAllCommunityBanners = async (req: AuthRequest, res: Response) => {
  try {
    const position = (req.query.position as string) || 'community'
    const banners = await CommunityBannerModel.find({ position })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
    res.json({ banners: await resolveLiveGameImages(banners) })
  } catch {
    res.status(500).json({ message: '배너 조회 실패' })
  }
}

/** POST /api/admin/community/banners — 배너 추가 (main/community/recommend는 최대 5개, newgame은 무제한) */
export const uploadCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['community', 'main', 'recommend', 'newgame']
    const position = allowed.includes(req.body.position) ? req.body.position : 'community'
    const count = await CommunityBannerModel.countDocuments({ position })
    const capped = position !== 'newgame'
    if (capped && count >= 5) return res.status(400).json({ message: '배너는 최대 5개까지 등록 가능합니다' })

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const file = files?.bannerImage?.[0]
    const { linkUrl, title } = req.body

    let imageUrl = ''
    if (position === 'newgame') {
      // 베타존 참가자 모집 배너 — 개발자가 게임 등록 시 올린 게임 아이콘(Game.thumbnail)을 그대로 사용, 직접 업로드 불가
      // 2026-09-16: 히어로 배너(Game.bannerImage) 재사용 → 게임 아이콘(Game.thumbnail) 재사용으로 변경.
      // 카드 표시 크기(w-64)에 비해 히어로 배너 원본(1920x640)이 지나치게 커서 대역폭 낭비가 컸음 — 아이콘(450x450)이 훨씬 적정 크기.
      const gameId = extractGameId(linkUrl)
      const game = gameId ? await GameModel.findById(gameId).select('thumbnail').lean() : null
      if (!game?.thumbnail) return res.status(400).json({ message: '선택한 게임에 등록된 게임 아이콘이 없습니다' })
      imageUrl = game.thumbnail
    } else if (position === 'recommend') {
      // 추천게임 배너 — 직접 이미지 업로드 대신 연결한 게임이 등록한 히어로 배너(Game.bannerImage)를 그대로 사용
      const gameId = extractGameId(linkUrl)
      const game = gameId ? await GameModel.findById(gameId).select('bannerImage').lean() : null
      if (!game?.bannerImage) return res.status(400).json({ message: '선택한 게임에 등록된 히어로 배너가 없습니다' })
      imageUrl = game.bannerImage
    } else {
      imageUrl = file ? `/uploads/banners/${file.filename}` : ''
      if (!imageUrl) return res.status(400).json({ message: '이미지 파일을 선택해주세요' })
    }

    const banner = await CommunityBannerModel.create({
      imageUrl,
      linkUrl: linkUrl?.trim() || '',
      title: title?.trim() || '',
      sortOrder: count,
      position,
    })
    res.status(201).json({ banner })
  } catch {
    res.status(500).json({ message: '배너 업로드 실패' })
  }
}

/** PATCH /api/admin/community/banners/:id — 배너 수정 */
export const updateCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { linkUrl, title, isActive, sortOrder } = req.body
    const update: Record<string, unknown> = {}
    if (linkUrl !== undefined) update.linkUrl = linkUrl.trim()
    if (title !== undefined) update.title = title.trim()
    if (isActive !== undefined) update.isActive = isActive
    if (sortOrder !== undefined) update.sortOrder = Number(sortOrder)

    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const file = files?.bannerImage?.[0]
    if (file) {
      update.imageUrl = `/uploads/banners/${file.filename}`
    } else if (linkUrl !== undefined) {
      // 게임 선택형 배너(베타존 참가자 모집/추천게임)는 연결 게임이 바뀌면 그 게임의 이미지도 함께 갱신
      const existing = await CommunityBannerModel.findById(id).select('position').lean()
      if (existing?.position === 'newgame') {
        const gameId = extractGameId(linkUrl)
        const game = gameId ? await GameModel.findById(gameId).select('thumbnail').lean() : null
        if (game?.thumbnail) update.imageUrl = game.thumbnail
      } else if (existing?.position === 'recommend') {
        const gameId = extractGameId(linkUrl)
        const game = gameId ? await GameModel.findById(gameId).select('bannerImage').lean() : null
        if (game?.bannerImage) update.imageUrl = game.bannerImage
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const editedBanner = await CommunityBannerModel.findOneAndUpdate(
      { _id: id, 'dailyStats.date': today },
      { ...update, $inc: { 'dailyStats.$.edits': 1 } },
      { new: true }
    )
    const banner = editedBanner ?? await (async () => {
      await CommunityBannerModel.findByIdAndUpdate(id, { ...update, $push: { dailyStats: { date: today, impressions: 0, clicks: 0, edits: 1 } } })
      return CommunityBannerModel.findById(id)
    })()
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ banner })
  } catch {
    res.status(500).json({ message: '배너 수정 실패' })
  }
}

/** DELETE /api/admin/community/banners/:id — 배너 삭제 */
export const deleteCommunityBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const banner = await CommunityBannerModel.findByIdAndDelete(id)
    if (!banner) return res.status(404).json({ message: '배너를 찾을 수 없습니다' })
    res.json({ message: '삭제되었습니다' })
  } catch {
    res.status(500).json({ message: '배너 삭제 실패' })
  }
}

/** POST /api/community/banners/:id/track — 노출/클릭 기록 (공개) */
export const trackBannerEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { type } = req.body  // 'impression' | 'click'
    if (type !== 'impression' && type !== 'click') {
      return res.status(400).json({ message: 'type must be impression or click' })
    }

    const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
    const field = type === 'impression' ? 'dailyStats.$.impressions' : 'dailyStats.$.clicks'

    // 오늘 날짜 항목이 있으면 증가, 없으면 생성
    const updated = await CommunityBannerModel.findOneAndUpdate(
      { _id: id, 'dailyStats.date': today },
      { $inc: { [field]: 1 } }
    )

    if (!updated) {
      const newStat = { date: today, impressions: type === 'impression' ? 1 : 0, clicks: type === 'click' ? 1 : 0 }
      await CommunityBannerModel.findByIdAndUpdate(id, { $push: { dailyStats: newStat } })
    }

    res.json({ ok: true })
  } catch {
    res.status(500).json({ message: '트래킹 실패' })
  }
}
